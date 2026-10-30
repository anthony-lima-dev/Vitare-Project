import { Logger } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';

/**
 * Registro de contagem — estruturalmente idêntico a
 * `ThrottlerStorageRecord` do @nestjs/throttler (não reexportado do index).
 */
export interface ThrottleRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Incremento atômico com PTTL — retorna {hits, ttl, blocked, blockDuration}.
 * `INCR` + `PEXPIRE` no primeiro hit garante expiração mesmo sob concorrência
 * entre réplicas (todas compartilham o mesmo contador no Redis).
 */
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if hits > tonumber(ARGV[2]) then return {hits, ttl, 1, tonumber(ARGV[3])} end
return {hits, ttl, 0, 0}
`;

/**
 * Storage do throttler com dois modos, escolhido a cada incremento:
 *
 * 1. Redis (compartilhado): quando o adaptador está habilitado (REDIS_URL
 *    configurada) e o comando responde. Limites valem ENTRE RÉPLICAS.
 * 2. Fallback in-memory (ThrottlerStorageService): quando Redis está
 *    desabilitado ou falhou (erro/timeout). O limite continua ativo, porém
 *    ISOLADO POR INSTÂNCIA — em um cluster com N réplicas atrás de um
 *    balanceador, o limite efetivo é N × limit por IP. Fallback aceitável:
 *    a proteção de segurança (429) permanece; perde apenas a precisão
 *    global do contador, nunca fail-open total.
 *
 * Documentação por endpoint: ver apps/api/docs/rate-limiting.md.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottleRecord> {
    if (this.redis.isEnabled) {
      try {
        const result = await this.redis.eval(
          INCREMENT_SCRIPT,
          1,
          this.redis.key('throttle', key),
          String(Math.max(1, ttl)),
          String(limit),
          String(blockDuration),
        );
        if (Array.isArray(result)) {
          const [hits, timeToExpire, blocked, blockMs] = result as number[];
          return {
            totalHits: Number(hits),
            timeToExpire: Number(timeToExpire),
            isBlocked: Number(blocked) === 1,
            timeToBlockExpire: Number(blocked) === 1 ? Number(blockMs) : 0,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Throttle Redis falhou (${(error as Error).message}); usando fallback in-memory.`,
        );
      }
    }

    return this.fallback.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttlerName,
    );
  }
}
