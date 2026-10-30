import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface GeoMemberWithDistance {
  id: string;
  distanceMeters: number;
}

const GEOSEARCH_DEFAULT_RADIUS_M = 5_000;

/**
 * Adaptador Redis compartilhado da aplicação.
 *
 * - Uma única conexão reutilizada por todos os módulos.
 * - Quando REDIS_URL não está configurada, o adaptador entra em modo
 *   "disabled": leituras respondem como cache-miss e escritas são ignoradas,
 *   permitindo fallback seguro ao PostgreSQL.
 * - Sem laços de retry infinitos: backoff limitado e timeouts de comando.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly enabled: boolean;
  private readonly keyPrefix: string;

  constructor(private readonly config: ConfigService) {
    this.enabled = !!this.config.get<string>('REDIS_URL');
    this.keyPrefix =
      this.config.get<string>('REDIS_KEY_PREFIX') ?? 'vitare:local';
  }

  get isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.warn(
        'REDIS_URL não configurada — cache e índice geoespacial desabilitados (fallback para PostgreSQL).',
      );
      return;
    }

    this.client = new Redis(this.config.get<string>('REDIS_URL')!, {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) =>
        times > 5 ? null : Math.min(times * 200, 2_000),
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Erro de conexão Redis: ${error.message}`);
    });

    this.client.connect().catch((error: Error) => {
      this.logger.warn(
        `Falha inicial ao conectar no Redis: ${error.message}. Operações usarão fallback.`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit().catch(() => undefined);
  }

  key(...parts: string[]): string {
    return [this.keyPrefix, ...parts].join(':');
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;
    try {
      const raw = await this.client!.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn(`Redis GET falhou: ${(error as Error).message}`);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      await this.client!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch (error) {
      this.logger.warn(`Redis SET falhou: ${(error as Error).message}`);
      return false;
    }
  }

  async delete(...keys: string[]): Promise<void> {
    if (!this.isEnabled || keys.length === 0) return;
    try {
      await this.client!.del(...keys);
    } catch (error) {
      this.logger.warn(`Redis DEL falhou: ${(error as Error).message}`);
    }
  }

  /** Deleta por padrão (SCAN + DEL) — apenas para invalidação controlada. */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.isEnabled) return 0;
    let removed = 0;
    try {
      const stream = this.client!.scanStream({ match: pattern, count: 100 });
      for await (const batch of stream as AsyncIterable<string[]>) {
        if (batch.length === 0) continue;
        await this.client!.del(...batch);
        removed += batch.length;
      }
    } catch (error) {
      this.logger.warn(`Redis SCAN/DEL falhou: ${(error as Error).message}`);
    }
    return removed;
  }

  /** PING com timeout real — usado pelo health check de readiness. */
  async ping(timeoutMs = 1_500): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const result = await Promise.race([
        this.client!.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis PING timeout')), timeoutMs),
        ),
      ]);
      return result === 'PONG';
    } catch (error) {
      this.logger.warn(`Redis PING falhou: ${(error as Error).message}`);
      return false;
    }
  }

  /** Registra posição geoespacial atual de um membro (profissional). */
  async geoAdd(
    geoKey: string,
    member: string,
    longitude: number,
    latitude: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future TTL per-member
    _ttlSeconds: number,
  ): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      await this.client!.multi()
        .geoadd(geoKey, longitude, latitude, member)
        // TTL is managed per-member via freshness keys; do not expire the whole geo index
        .exec();
      return true;
    } catch (error) {
      this.logger.warn(`Redis GEOADD falhou: ${(error as Error).message}`);
      return false;
    }
  }

  async geoRemove(geoKey: string, member: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      await this.client!.zrem(geoKey, member);
    } catch (error) {
      this.logger.warn(`Redis ZREM falhou: ${(error as Error).message}`);
    }
  }

  /** Busca membros dentro de um raio no índice geoespacial do Redis. */
  async geoSearchByDistance(
    geoKey: string,
    longitude: number,
    latitude: number,
    radiusMeters: number = GEOSEARCH_DEFAULT_RADIUS_M,
  ): Promise<GeoMemberWithDistance[]> {
    if (!this.isEnabled) return [];
    try {
      const results = (await this.client!.geosearch(
        geoKey,
        'FROMLONLAT',
        longitude,
        latitude,
        'BYRADIUS',
        radiusMeters,
        'm',
        'WITHDIST',
        'ASC',
      )) as Array<[string, string]>;

      return results.map(([id, dist]) => ({
        id,
        distanceMeters: Number(dist),
      }));
    } catch (error) {
      this.logger.warn(`Redis GEOSEARCH falhou: ${(error as Error).message}`);
      return [];
    }
  }

  /** Lua EVAL — incremento atômico do rate limiter compartilhado entre réplicas. */
  async eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown> {
    if (!this.isEnabled) return null;
    try {
      return await this.client!.eval(script, numKeys, ...(args as string[]));
    } catch (error) {
      this.logger.warn(`Redis EVAL falhou: ${(error as Error).message}`);
      throw error;
    }
  }

  /** "SET NX PX" atômico: lock curto de coordenação (não substitui PostgreSQL). */
  async acquireLock(
    key: string,
    ownerToken: string,
    ttlMs: number,
  ): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const result = await this.client!.set(key, ownerToken, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  }

  async releaseLock(key: string, ownerToken: string): Promise<void> {
    if (!this.isEnabled) return;
    const script =
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
    try {
      await this.client!.eval(script, 1, key, ownerToken);
    } catch {
      /* a expiração do lock resolve a contenção */
    }
  }

  /** Adiciona staffId à blocklist com TTL em milissegundos. */
  async addToBlocklist(staffId: string, ttlMs: number): Promise<void> {
    if (!this.isEnabled) return;
    const key = this.key('blocklist', staffId);
    try {
      await this.client!.set(key, '1', 'PX', ttlMs);
    } catch (error) {
      this.logger.warn(
        `Redis blocklist SET falhou: ${(error as Error).message}`,
      );
    }
  }

  /** Verifica se staffId está na blocklist. */
  async isBlocked(staffId: string): Promise<boolean> {
    if (!this.isEnabled) return false;
    const key = this.key('blocklist', staffId);
    try {
      const res = await this.client!.get(key);
      return res !== null;
    } catch (error) {
      this.logger.warn(
        `Redis blocklist GET falhou: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
