import type {
  LegalActRecord,
  LegalActFilter,
} from '../entities/legal-act.entity';

/**
 * Repositório de registros de atos jurídicos.
 * Append-only: apenas criação e leitura, sem update/delete expostos.
 */
export abstract class LegalActRepository {
  abstract create(
    input: Omit<LegalActRecord, 'id' | 'recordedAt'>,
  ): Promise<LegalActRecord>;
  abstract findByHolder(filter: LegalActFilter): Promise<LegalActRecord[]>;
  abstract findByActor(actorId: string): Promise<LegalActRecord[]>;
  abstract findByContentHash(contentHash: string): Promise<LegalActRecord[]>;
  abstract countByHolderAndType(
    holderId: string,
    actType: LegalActRecord['actType'],
  ): Promise<number>;
}
