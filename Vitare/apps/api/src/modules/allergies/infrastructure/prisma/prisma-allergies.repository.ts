import { Injectable } from '@nestjs/common';
import { Allergy } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { AllergiesRepository } from '../../domain/repositories/allergies.repository';

@Injectable()
export class PrismaAllergiesRepository implements AllergiesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  /** O(k) via índice em userId; sem filtro de status, já que não há soft delete */
  async findAllByUser(userId: string): Promise<Allergy[]> {
    const rows = await this.prisma.allergy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Allergy | null> {
    const row = await this.prisma.allergy.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(
    userId: string,
    data: { name: string; severity?: string; notes?: string },
  ): Promise<Allergy> {
    const row = await this.prisma.allergy.create({
      data: {
        userId,
        name: data.name,
        ...(data.name != null && { nameEnc: this.pii.encrypt(data.name) }),
        ...(data.severity != null && {
          severity: data.severity,
          severityEnc: this.pii.encrypt(data.severity),
        }),
        ...(data.notes != null && {
          notes: data.notes,
          notesEnc: this.pii.encrypt(data.notes),
        }),
      },
    });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.allergy.delete({ where: { id } });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    name: string | null;
    nameEnc: string | null;
    severity: string | null;
    severityEnc: string | null;
    notes: string | null;
    notesEnc: string | null;
    createdAt: Date;
  }): Allergy {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: row.id,
      userId: row.userId,
      name: decrypt(row.nameEnc ?? row.name) ?? '',
      severity: decrypt(row.severityEnc ?? row.severity),
      notes: decrypt(row.notesEnc ?? row.notes),
      createdAt: row.createdAt,
    } as Allergy;
  }
}
