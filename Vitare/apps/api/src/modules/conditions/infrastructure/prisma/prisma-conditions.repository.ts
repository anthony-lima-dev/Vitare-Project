import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  ConditionsRepository,
  ConditionWithDisease,
} from '../../domain/repositories/conditions.repository';

@Injectable()
export class PrismaConditionsRepository implements ConditionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  /** O(k) via índice (userId, isActive); include resolve disease em uma única query */
  async findAllActiveByUser(userId: string): Promise<ConditionWithDisease[]> {
    const rows = await this.prisma.chronicCondition.findMany({
      where: { userId, isActive: true },
      include: { disease: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<ConditionWithDisease | null> {
    const row = await this.prisma.chronicCondition.findUnique({
      where: { id },
      include: { disease: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(
    userId: string,
    diseaseId: string,
    data: { notes?: string; diagnosedAt?: Date },
  ): Promise<ConditionWithDisease> {
    const row = await this.prisma.chronicCondition.create({
      data: {
        userId,
        diseaseId,
        ...(data.notes !== undefined && {
          notesEnc: this.pii.encrypt(data.notes),
        }),
        ...(data.diagnosedAt !== undefined && {
          diagnosedAt: data.diagnosedAt,
        }),
      },
      include: { disease: true },
    });
    return this.toDomain(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.chronicCondition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    diseaseId: string;
    disease: { name: string; code: string };
    notes: string | null;
    notesEnc: string | null;
    diagnosedAt: Date | null;
    isActive: boolean;
    createdAt: Date;
  }): ConditionWithDisease {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: row.id,
      userId: row.userId,
      diseaseId: row.diseaseId,
      diseaseName: row.disease.name,
      diseaseCode: row.disease.code,
      notes: decrypt(row.notesEnc ?? row.notes),
      diagnosedAt: row.diagnosedAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }
}
