import { Injectable, ForbiddenException } from '@nestjs/common';
import type { Medication } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  CreateMedicationData,
  MedicationsRepository,
  UpdateMedicationData,
} from '../../domain/repositories/medications.repository';
import { ForbiddenMedicationsRepository } from '../../../forbidden-medications/domain/repositories/forbidden-medications.repository';

@Injectable()
export class PrismaMedicationsRepository implements MedicationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
    private readonly forbiddenMedicationsRepository: ForbiddenMedicationsRepository,
  ) {}

  async findAllActiveByUser(userId: string): Promise<Medication[]> {
    const rows = await this.prisma.medication.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Medication | null> {
    const row = await this.prisma.medication.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateMedicationData): Promise<Medication> {
    // Validate against forbidden medications if linked to dictionary
    if (data.medicationsDictionaryId) {
      const isForbidden = await this.forbiddenMedicationsRepository.isForbidden(
        data.userId,
        data.medicationsDictionaryId,
      );
      if (isForbidden) {
        throw new ForbiddenException(
          'Este medicamento está na sua lista de medicamentos não permitidos',
        );
      }
    }

    const row = await this.prisma.medication.create({
      data: {
        userId: data.userId,
        medicationsDictionaryId: data.medicationsDictionaryId,
        name: data.name,
        ...(data.name !== undefined && {
          nameEnc: this.pii.encrypt(data.name),
        }),
        dosage: data.dosage,
        ...(data.dosage !== undefined && {
          dosageEnc: this.pii.encrypt(data.dosage),
        }),
        frequency: data.frequency,
        ...(data.frequency !== undefined && {
          frequencyEnc: this.pii.encrypt(data.frequency),
        }),
        startDate: data.startDate,
        ...(data.startDate !== undefined && {
          startDateEnc: this.pii.encrypt(data.startDate.toISOString()),
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate,
          ...(data.endDate !== null && {
            endDateEnc: this.pii.encrypt(data.endDate.toISOString()),
          }),
        }),
        ...(data.notes !== undefined && {
          notes: data.notes,
          notesEnc: this.pii.encrypt(data.notes),
        }),
        isActive: true,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, data: UpdateMedicationData): Promise<Medication> {
    // Validate against forbidden medications if dictionary ID is being changed
    if (data.medicationsDictionaryId !== undefined) {
      const existing = await this.prisma.medication.findUnique({
        where: { id },
        select: { userId: true, medicationsDictionaryId: true },
      });
      if (existing) {
        // Check if the new dictionary ID is forbidden (or if removing link, check old one)
        const dictIdToCheck =
          data.medicationsDictionaryId ?? existing.medicationsDictionaryId;
        if (dictIdToCheck) {
          const isForbidden =
            await this.forbiddenMedicationsRepository.isForbidden(
              existing.userId,
              dictIdToCheck,
            );
          if (isForbidden) {
            throw new ForbiddenException(
              'Este medicamento está na sua lista de medicamentos não permitidos',
            );
          }
        }
      }
    }

    const row = await this.prisma.medication.update({
      where: { id },
      data: {
        ...(data.medicationsDictionaryId !== undefined && {
          medicationsDictionaryId: data.medicationsDictionaryId,
        }),
        ...(data.name !== undefined && {
          nameEnc: this.pii.encrypt(data.name),
        }),
        ...(data.dosage !== undefined && {
          dosageEnc: this.pii.encrypt(data.dosage),
        }),
        ...(data.frequency !== undefined && {
          frequencyEnc: this.pii.encrypt(data.frequency),
        }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate,
          startDateEnc: this.pii.encrypt(data.startDate.toISOString()),
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate,
          ...(data.endDate !== null && {
            endDateEnc: this.pii.encrypt(data.endDate.toISOString()),
          }),
        }),
        ...(data.notes !== undefined && {
          notesEnc: this.pii.encrypt(data.notes),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return this.toDomain(row);
  }

  async updateWithHistory(
    id: string,
    data: UpdateMedicationData,
    historyEntries: Array<{
      medicationId: string;
      userId: string;
      changedField: string;
      oldValue: string | null;
      newValue: string | null;
    }>,
  ): Promise<Medication> {
    return this.prisma.$transaction(async (tx) => {
      // Validate against forbidden medications if dictionary ID is being changed
      if (data.medicationsDictionaryId !== undefined) {
        const existing = await tx.medication.findUnique({
          where: { id },
          select: { userId: true, medicationsDictionaryId: true },
        });
        if (existing) {
          const dictIdToCheck =
            data.medicationsDictionaryId ?? existing.medicationsDictionaryId;
          if (dictIdToCheck) {
            const isForbidden =
              await this.forbiddenMedicationsRepository.isForbidden(
                existing.userId,
                dictIdToCheck,
              );
            if (isForbidden) {
              throw new ForbiddenException(
                'Este medicamento está na sua lista de medicamentos não permitidos',
              );
            }
          }
        }
      }

      const row = await tx.medication.update({
        where: { id },
        data: {
          ...(data.medicationsDictionaryId !== undefined && {
            medicationsDictionaryId: data.medicationsDictionaryId,
          }),
          ...(data.name !== undefined && {
            nameEnc: this.pii.encrypt(data.name),
          }),
          ...(data.dosage !== undefined && {
            dosageEnc: this.pii.encrypt(data.dosage),
          }),
          ...(data.frequency !== undefined && {
            frequencyEnc: this.pii.encrypt(data.frequency),
          }),
          ...(data.startDate !== undefined && {
            startDate: data.startDate,
            startDateEnc: this.pii.encrypt(data.startDate.toISOString()),
          }),
          ...(data.endDate !== undefined && {
            endDate: data.endDate,
            ...(data.endDate !== null && {
              endDateEnc: this.pii.encrypt(data.endDate.toISOString()),
            }),
          }),
          ...(data.notes !== undefined && {
            notesEnc: this.pii.encrypt(data.notes),
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      if (historyEntries.length > 0) {
        await tx.medicationHistory.createMany({
          data: historyEntries.map((e) => ({
            ...e,
            ...(e.oldValue !== null &&
              e.oldValue !== undefined && {
                oldValueEnc: this.pii.encrypt(e.oldValue),
              }),
            ...(e.newValue !== null &&
              e.newValue !== undefined && {
                newValueEnc: this.pii.encrypt(e.newValue),
              }),
          })),
        });
      }

      return this.toDomain(row);
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.medication.update({
      where: { id },
      data: { isActive: false },
    });
  }

  findHistoryByMedication(medicationId: string) {
    return this.prisma.medicationHistory.findMany({
      where: { medicationId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async recordHistoryEntries(
    entries: Array<{
      medicationId: string;
      userId: string;
      changedField: string;
      oldValue: string | null;
      newValue: string | null;
    }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.medicationHistory.createMany({
      data: entries.map((e) => ({
        ...e,
        ...(e.oldValue !== null &&
          e.oldValue !== undefined && {
            oldValueEnc: this.pii.encrypt(e.oldValue),
          }),
        ...(e.newValue !== null &&
          e.newValue !== undefined && {
            newValueEnc: this.pii.encrypt(e.newValue),
          }),
      })),
    });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    medicationsDictionaryId: string | null;
    name: string | null;
    nameEnc: string | null;
    dosage: string | null;
    dosageEnc: string | null;
    frequency: string | null;
    frequencyEnc: string | null;
    startDate: Date;
    startDateEnc: string | null;
    endDate: Date | null;
    endDateEnc: string | null;
    notes: string | null;
    notesEnc: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Medication {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: row.id,
      userId: row.userId,
      medicationsDictionaryId: row.medicationsDictionaryId,
      name: decrypt(row.nameEnc ?? row.name) ?? '',
      dosage: decrypt(row.dosageEnc ?? row.dosage) ?? '',
      frequency: decrypt(row.frequencyEnc ?? row.frequency) ?? '',
      startDate: row.startDate,
      endDate: row.endDate,
      notes: decrypt(row.notesEnc ?? row.notes),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Medication;
  }
}
