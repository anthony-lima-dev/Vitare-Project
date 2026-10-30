import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { RedisService } from '../../../../infra/redis/redis.service';
import {
  DiseaseDictionaryRepository,
  DiseaseSearchResult,
} from '../../domain/repositories/disease-dictionary.repository';

const MAX_RESULTS = 20;
/** Cache-Aside com TTL de 24h para o catálogo de referência CID-10. */
const DICTIONARY_TTL_SECONDS = 86_400;

interface RangeGroup {
  start_code: string;
  end_code: string;
  name: string;
}

@Injectable()
export class PrismaDiseaseDictionaryRepository implements DiseaseDictionaryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Busca doenças por nome/código (até 20 resultados) e resolve o grupo de
   * cada uma por faixa de código. A tabela de grupos (estática, ~275 linhas)
   * entra em Cache-Aside com TTL de 24h — consulta O(1) no Redis por chave.
   * Redis indisponível → fallback ao PostgreSQL com timeout implícito do
   * adaptador (sem laços de retry).
   */
  async search(query: string): Promise<DiseaseSearchResult[]> {
    const normalized = query.trim().toLowerCase();
    const key = this.redis.key(
      'v1',
      'disease-dictionary',
      'search',
      normalized,
    );

    const cached = await this.redis.getJson<DiseaseSearchResult[]>(key);
    if (cached) return cached;

    const diseases = await this.prisma.diseaseDictionary.findMany({
      where: {
        OR: [
          { name: { contains: normalized, mode: 'insensitive' } },
          { code: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      take: MAX_RESULTS,
      orderBy: { name: 'asc' },
    });

    const groups = await this.loadGroups();
    const results = diseases.map((disease) => this.toResult(disease, groups));

    await this.redis.setJson(key, results, DICTIONARY_TTL_SECONDS);
    return results;
  }

  async findById(id: string): Promise<DiseaseSearchResult | null> {
    const key = this.redis.key('v1', 'disease-dictionary', 'id', id);

    const cached = await this.redis.getJson<DiseaseSearchResult>(key);
    if (cached) return cached;

    const disease = await this.prisma.diseaseDictionary.findUnique({
      where: { id },
    });
    if (!disease) return null;

    const result = this.toResult(disease, await this.loadGroups());
    await this.redis.setJson(key, result, DICTIONARY_TTL_SECONDS);
    return result;
  }

  private async loadGroups(): Promise<RangeGroup[]> {
    const key = this.redis.key('v1', 'disease-groups', 'all');
    const cached = await this.redis.getJson<RangeGroup[]>(key);
    if (cached) return cached;

    const groups = await this.prisma.diseaseGroup.findMany({
      select: { start_code: true, end_code: true, name: true },
    });
    await this.redis.setJson(key, groups, DICTIONARY_TTL_SECONDS);
    return groups;
  }

  private toResult(
    disease: { id: string; code: string; name: string },
    groups: RangeGroup[],
  ): DiseaseSearchResult {
    return {
      id: disease.id,
      code: disease.code,
      name: disease.name,
      groupName: resolveGroupName(disease.code, groups),
    };
  }
}

/**
 * Resolve o nome do grupo (bloco CID-10) a partir da faixa de código.
 * Comparação lexicográfica sobre os 3 primeiros caracteres é suficiente:
 * os 12.451 códigos de CID.json têm 3 ou 4 caracteres sem ponto (ex.:
 * "E110"), e as 275 faixas de cid_grupos.json são delimitadas exatamente
 * nesse nível de 3 caracteres (ex.: "E10"–"E14").
 */
function resolveGroupName(code: string, groups: RangeGroup[]): string | null {
  const categoryCode = code.slice(0, 3).toUpperCase();
  const match = groups.find(
    (g) => categoryCode >= g.start_code && categoryCode <= g.end_code,
  );
  return match?.name ?? null;
}
