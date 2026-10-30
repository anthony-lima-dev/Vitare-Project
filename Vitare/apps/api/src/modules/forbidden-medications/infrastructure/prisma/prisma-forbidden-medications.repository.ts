import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  ForbiddenMedicationsRepository,
  ForbiddenMedicationWithDetails,
} from '../../domain/repositories/forbidden-medications.repository';

@Injectable()
export class PrismaForbiddenMedicationsRepository implements ForbiddenMedicationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  /** O(k) via índice em userId; include resolve o dicionário em uma única query */
  async findAllByUser(
    userId: string,
  ): Promise<ForbiddenMedicationWithDetails[]> {
    const rows = await this.prisma.forbiddenMedication.findMany({
      where: { userId },
      include: { medicationsDictionary: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<ForbiddenMedicationWithDetails | null> {
    const row = await this.prisma.forbiddenMedication.findUnique({
      where: { id },
      include: { medicationsDictionary: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(
    userId: string,
    data: { medicationsDictionaryId: string; reason: string },
  ): Promise<ForbiddenMedicationWithDetails> {
    const row = await this.prisma.forbiddenMedication.create({
      data: {
        ...data,
        userId,
        ...(data.reason !== undefined && {
          reasonEnc: this.pii.encrypt(data.reason),
        }),
      },
      include: { medicationsDictionary: true },
    });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.forbiddenMedication.delete({ where: { id } });
  }

  async isForbidden(
    userId: string,
    medicationsDictionaryId: string,
  ): Promise<boolean> {
    const count = await this.prisma.forbiddenMedication.count({
      where: {
        userId,
        medicationsDictionaryId,
      },
    });
    return count > 0;
  }

  private toDomain(row: {
    id: string;
    userId: string;
    medicationsDictionaryId: string;
    reason: string | null;
    reasonEnc: string | null;
    createdAt: Date;
    medicationsDictionary: { nome: string; laboratorio: string };
  }): ForbiddenMedicationWithDetails {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: row.id,
      userId: row.userId,
      medicationsDictionaryId: row.medicationsDictionaryId,
      medicationsName: row.medicationsDictionary.nome,
      medicationsLaboratorio: row.medicationsDictionary.laboratorio,
      reason: decrypt(row.reasonEnc ?? row.reason) ?? '',
      createdAt: row.createdAt,
    };
  }
}
