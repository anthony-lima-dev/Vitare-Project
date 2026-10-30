import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  CreateEmergencyData,
  EmergencyEventRecord,
  EmergencyRepositoryPort,
} from '../../application/ports/emergency-ports';
import {
  assertAllowedTransition,
  EmergencyStatus,
} from '../../domain/emergency-status';
import { SnapshotSource } from '../../domain/clinical-snapshot';

interface EmergencyEventRow {
  id: string;
  userId: string;
  triggeredAt: Date;
  latitude: unknown;
  longitude: unknown;
  patientSnapshot: unknown;
  patientSnapshotEnc: string | null;
  status: string;
  notes: string | null;
  notesEnc: string | null;
  assignedStaffId: string | null;
  acceptedAt: Date | null;
  resolvedAt: Date | null;
}

function toRecord(row: EmergencyEventRow): EmergencyEventRecord {
  return { ...row, status: row.status as EmergencyStatus };
}

/**
 * Implementação Prisma da persistência de emergências. Gravações de
 * evento e Outbox participam da mesma transação de idempotência.
 *
 * Campos clínicos identificáveis (notes e patientSnapshot) são cifrados
 * antes de persistir e decifrados na leitura. O snapshot histórico é
 * imutável: nunca é reescrito após a criação do evento.
 */
@Injectable()
export class PrismaEmergencyRepository implements EmergencyRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async buildSnapshotSource(
    userId: string,
    tx?: unknown,
  ): Promise<SnapshotSource> {
    const db = (tx as PrismaService | undefined) ?? this.prisma;
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        conditions: { where: { isActive: true }, include: { disease: true } },
        medications: { where: { isActive: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        allergies: true,
      },
    });

    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      fullName: decrypt(user.fullNameEnc) ?? '',
      cpf: decrypt(user.cpfEnc) ?? null,
      birthDate: user.birthDateEnc
        ? new Date(this.pii.decrypt(user.birthDateEnc))
        : null,
      bloodType: user.bloodType,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      conditions: user.conditions.map((c) => ({
        id: c.id,
        userId: c.userId,
        diseaseId: c.diseaseId,
        notes: decrypt(c.notesEnc ?? c.notes),
        diagnosedAt: c.diagnosedAt,
        isActive: c.isActive,
        createdAt: c.createdAt,
        disease: c.disease,
      })),
      medications: user.medications.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: decrypt(m.nameEnc ?? m.name) ?? '',
        dosage: decrypt(m.dosageEnc ?? m.dosage) ?? '',
        frequency: decrypt(m.frequencyEnc ?? m.frequency) ?? '',
        startDate: m.startDate,
        endDate: m.endDate,
        notes: decrypt(m.notesEnc ?? m.notes),
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      contacts: user.contacts.map((c) => ({
        id: c.id,
        userId: c.userId,
        name: decrypt(c.nameEnc ?? c.name) ?? '',
        phone: decrypt(c.phoneEnc ?? c.phone) ?? '',
        relationship: decrypt(c.relationshipEnc ?? c.relationship),
        isPrimary: c.isPrimary,
        createdAt: c.createdAt,
      })),
      allergies: user.allergies.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: decrypt(a.nameEnc ?? a.name) ?? '',
        severity: decrypt(a.severityEnc ?? a.severity),
        notes: decrypt(a.notesEnc ?? a.notes),
        createdAt: a.createdAt,
      })),
    };
  }

  async createEvent(
    data: CreateEmergencyData,
    tx?: unknown,
  ): Promise<EmergencyEventRecord> {
    const db = (tx as PrismaService | undefined) ?? this.prisma;
    const snapshotJson = JSON.stringify(data.patientSnapshot);
    const event = await db.emergencyEvent.create({
      data: {
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        // Snapshot histórico cifrado: nunca reescrito por mudanças posteriores
        // do prontuário (imutabilidade aplicada no domínio + sem update aqui).
        patientSnapshotEnc: this.pii.encrypt(snapshotJson),
        patientSnapshot:
          data.patientSnapshot as unknown as Prisma.InputJsonValue,
        status: 'TRIGGERED',
      },
    });

    await db.outboxEvent.create({
      data: {
        type: 'emergency.triggered',
        payload: {
          id: event.id,
          status: event.status,
          triggeredAt: event.triggeredAt.toISOString(),
        },
      },
    });

    return toRecord(event);
  }

  async findById(id: string): Promise<EmergencyEventRecord | null> {
    const event = await this.prisma.emergencyEvent.findUnique({
      where: { id },
    });
    if (!event) return null;
    return this.toRecordWithDecrypt(event);
  }

  async findAllByUser(userId: string): Promise<EmergencyEventRecord[]> {
    const events = await this.prisma.emergencyEvent.findMany({
      where: { userId },
      orderBy: { triggeredAt: 'desc' },
    });
    return events.map((e) =>
      this.toRecordWithDecrypt(e as unknown as EmergencyEventRow),
    );
  }

  async findManyByUser(
    userId: string,
    options?: {
      cursor?: string;
      take?: number;
      orderBy?: { triggeredAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
    },
  ): Promise<{ items: EmergencyEventRecord[]; nextCursor: string | null }> {
    const take = Math.min(options?.take ?? 20, 100);
    const orderBy = options?.orderBy ?? { triggeredAt: 'asc', id: 'asc' };

    const events = await this.prisma.emergencyEvent.findMany({
      where: { userId },
      orderBy: [
        { triggeredAt: orderBy.triggeredAt ?? 'asc' },
        { id: orderBy.id ?? 'asc' },
      ],
      take: take + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasNext = events.length > take;
    const items = hasNext ? events.slice(0, take) : events;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return {
      items: items.map((e) =>
        this.toRecordWithDecrypt(e as unknown as EmergencyEventRow),
      ),
      nextCursor,
    };
  }

  private toRecordWithDecrypt(row: EmergencyEventRow): EmergencyEventRecord {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    let patientSnapshot: unknown = row.patientSnapshot;
    if (row.patientSnapshotEnc) {
      try {
        patientSnapshot = JSON.parse(this.pii.decrypt(row.patientSnapshotEnc));
      } catch {
        // Mantém o JSON plano do Prisma se a decifragem falhar (compatibilidade)
        patientSnapshot = row.patientSnapshot;
      }
    }

    return {
      ...row,
      status: row.status as EmergencyStatus,
      notes: decrypt(row.notesEnc ?? row.notes),
      patientSnapshot,
    };
  }

  /**
   * Marca NOTIFIED quando ainda TRIGGERED — sem evento de Outbox (evita
   * loop): é um efeito da publicação, não uma mudança de estado de negócio.
   */
  async markNotifiedIfCurrent(id: string): Promise<void> {
    assertAllowedTransition(
      EmergencyStatus.TRIGGERED,
      EmergencyStatus.NOTIFIED,
    );
    await this.prisma.emergencyEvent.updateMany({
      where: { id, status: EmergencyStatus.TRIGGERED },
      data: { status: EmergencyStatus.NOTIFIED },
    });
  }

  async transitionIfCurrent(
    id: string,
    from: EmergencyStatus[],
    to: EmergencyStatus,
    patch: Partial<Pick<EmergencyEventRecord, 'assignedStaffId'>>,
  ): Promise<EmergencyEventRecord | null> {
    const current = await this.prisma.emergencyEvent.findUnique({
      where: { id },
    });
    if (!current) return null;

    // Máquina de estados validada antes da escrita condicional.
    assertAllowedTransition(current.status as EmergencyStatus, to);

    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.emergencyEvent.updateMany({
        where: { id, status: { in: from } },
        data: {
          status: to,
          ...(patch.assignedStaffId !== undefined
            ? { assignedStaffId: patch.assignedStaffId }
            : {}),
          ...(to === EmergencyStatus.ACCEPTED
            ? { acceptedAt: new Date() }
            : {}),
          ...(to === EmergencyStatus.RESOLVED
            ? { resolvedAt: new Date() }
            : {}),
        },
      });
      if (updated.count === 0) return null;

      const fresh = await tx.emergencyEvent.findUniqueOrThrow({
        where: { id },
      });
      await tx.outboxEvent.create({
        data: {
          type: `emergency.${to.toLowerCase()}`,
          payload: {
            id,
            status: to,
            assignedStaffId: fresh.assignedStaffId ?? null,
          },
        },
      });
      return fresh;
    });

    return record ? this.toRecordWithDecrypt(record) : null;
  }
}
