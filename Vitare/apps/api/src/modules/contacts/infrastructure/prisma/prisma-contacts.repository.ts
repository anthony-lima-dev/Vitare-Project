import { Injectable } from '@nestjs/common';
import { EmergencyContact } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { ContactsRepository } from '../../domain/repositories/contacts.repository';

@Injectable()
export class PrismaContactsRepository implements ContactsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findAllByUser(userId: string): Promise<EmergencyContact[]> {
    const rows = await this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { isPrimary: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<EmergencyContact | null> {
    const row = await this.prisma.emergencyContact.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(
    userId: string,
    data: {
      name: string;
      phone: string;
      relationship?: string;
      isPrimary?: boolean;
    },
  ): Promise<EmergencyContact> {
    const row = await this.prisma.emergencyContact.create({
      data: {
        userId,
        name: data.name,
        ...(data.name !== undefined && {
          nameEnc: this.pii.encrypt(data.name),
        }),
        phone: data.phone,
        ...(data.phone !== undefined && {
          phoneEnc: this.pii.encrypt(data.phone),
        }),
        ...(data.relationship !== undefined && {
          relationship: data.relationship,
          relationshipEnc: this.pii.encrypt(data.relationship),
        }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.emergencyContact.delete({ where: { id } });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    name: string | null;
    nameEnc: string | null;
    phone: string | null;
    phoneEnc: string | null;
    relationship: string | null;
    relationshipEnc: string | null;
    isPrimary: boolean;
    createdAt: Date;
  }): EmergencyContact {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: row.id,
      userId: row.userId,
      name: decrypt(row.nameEnc ?? row.name) ?? '',
      phone: decrypt(row.phoneEnc ?? row.phone) ?? '',
      relationship: decrypt(row.relationshipEnc ?? row.relationship),
      isPrimary: row.isPrimary,
      createdAt: row.createdAt,
    } as EmergencyContact;
  }
}
