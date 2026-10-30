import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { RedisService } from '../../../../infra/redis/redis.service';
import {
  MedicationsDictionaryRepository,
  MedicationSearchResult,
} from '../../domain/repositories/medications-dictionary.repository';

const MAX_RESULTS = 20;
/** Cache-Aside com TTL de 24h para dados de referência imutáveis por seed. */
const DICTIONARY_TTL_SECONDS = 86_400;

@Injectable()
export class PrismaMedicationsDictionaryRepository implements MedicationsDictionaryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Busca por nome do produto, case-insensitive, limitada a 20 resultados.
   * Chave de cache inclui a query normalizada — queries distintas nunca
   * colidem na mesma entrada. Redis indisponível → fallback ao PostgreSQL.
   */
  async search(query: string): Promise<MedicationSearchResult[]> {
    const normalized = query.trim().toLowerCase();
    const key = this.redis.key(
      'v1',
      'medications-dictionary',
      'search',
      normalized,
    );

    const cached = await this.redis.getJson<MedicationSearchResult[]>(key);
    if (cached) return cached;

    const results = await this.prisma.medicationsDictionary.findMany({
      where: { nome: { contains: normalized, mode: 'insensitive' } },
      take: MAX_RESULTS,
      orderBy: { nome: 'asc' },
    });

    await this.redis.setJson(key, results, DICTIONARY_TTL_SECONDS);
    return results;
  }

  async findById(id: string): Promise<MedicationSearchResult | null> {
    const key = this.redis.key('v1', 'medications-dictionary', 'id', id);

    const cached = await this.redis.getJson<MedicationSearchResult>(key);
    if (cached) return cached;

    const result = await this.prisma.medicationsDictionary.findUnique({
      where: { id },
    });
    if (result) await this.redis.setJson(key, result, DICTIONARY_TTL_SECONDS);
    return result;
  }
}
