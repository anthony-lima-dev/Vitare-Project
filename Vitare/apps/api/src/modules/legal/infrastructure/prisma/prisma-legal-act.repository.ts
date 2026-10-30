import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { LegalActRepository } from '../../domain/repositories/legal-act.repository';
import {
  LegalActAuditPort,
  type LegalActAuditEntry,
} from '../../domain/ports/legal-act-audit.port';
import type {
  LegalActRecord,
  LegalActFilter,
} from '../../domain/entities/legal-act.entity';

/**
 * Persistência de registros de atos jurídicos via Prisma/PostgreSQL.
 *
 * Append-only: apenas create e find*. Não há update/delete — eventos
 * históricos nunca são sobrescritos.
 *
 * Adapta também a LegalActAuditPort para gravação best-effort em auditoria
 * separada (mesma tabela, usada como cópia de segurança da trilha).
 */
@Injectable()
export class PrismaLegalActRepository
  implements LegalActRepository, LegalActAuditPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<LegalActRecord, 'id' | 'recordedAt'>,
  ): Promise<LegalActRecord> {
    const row = await this.prisma.legalActRecord.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        holderId: input.holderId,
        actType: input.actType,
        documentVersion: input.documentVersion,
        contentHash: input.contentHash,
        purpose: input.purpose,
        legalBasis: input.legalBasis,
        origin: input.origin,
        ipHash: input.ipHash,
      },
    });
    return this.toDomain(row);
  }

  async findByHolder(filter: LegalActFilter): Promise<LegalActRecord[]> {
    const rows = await this.prisma.legalActRecord.findMany({
      where: {
        holderId: filter.holderId,
        ...(filter.actType && { actType: filter.actType }),
        ...(filter.documentVersion && {
          documentVersion: filter.documentVersion,
        }),
        ...(filter.from || filter.to
          ? {
              recordedAt: {
                ...(filter.from && { gte: filter.from }),
                ...(filter.to && { lte: filter.to }),
              },
            }
          : {}),
      },
      orderBy: { recordedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByActor(actorId: string): Promise<LegalActRecord[]> {
    const rows = await this.prisma.legalActRecord.findMany({
      where: { actorId },
      orderBy: { recordedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByContentHash(contentHash: string): Promise<LegalActRecord[]> {
    const rows = await this.prisma.legalActRecord.findMany({
      where: { contentHash },
      orderBy: { recordedAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async countByHolderAndType(
    holderId: string,
    actType: LegalActRecord['actType'],
  ): Promise<number> {
    return this.prisma.legalActRecord.count({
      where: { holderId, actType },
    });
  }

  /** Implementa LegalActAuditPort (mesma tabela, cópia de segurança da trilha). */
  async record(entry: LegalActAuditEntry): Promise<void> {
    await this.prisma.legalActRecord.create({
      data: {
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        holderId: entry.holderId,
        actType: entry.actType,
        documentVersion: entry.documentVersion,
        contentHash: entry.contentHash,
        purpose: entry.purpose,
        legalBasis: entry.legalBasis,
        origin: entry.origin,
        ipHash: entry.ipHash,
      },
    });
  }

  private toDomain(row: {
    id: string;
    actorId: string;
    actorRole: string;
    holderId: string;
    actType: string;
    documentVersion: string;
    contentHash: string;
    purpose: string;
    legalBasis: string;
    origin: string;
    ipHash: string | null;
    recordedAt: Date;
  }): LegalActRecord {
    return {
      id: row.id,
      actorId: row.actorId,
      actorRole: row.actorRole,
      holderId: row.holderId,
      actType: row.actType as LegalActRecord['actType'],
      documentVersion: row.documentVersion,
      contentHash: row.contentHash,
      purpose: row.purpose,
      legalBasis: row.legalBasis as LegalActRecord['legalBasis'],
      origin: row.origin,
      ipHash: row.ipHash,
      recordedAt: row.recordedAt,
    };
  }
}
