import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_PROBE, DATABASE_PROBE } from './ports/health-probes.port';
import type {
  CacheProbePort,
  DatabaseProbePort,
} from './ports/health-probes.port';

export interface DependencyCheck {
  status: 'ok' | 'error' | 'disabled';
  latencyMs?: number;
}

export interface LivenessReport {
  status: 'ok';
  timestamp: string;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded' | 'unavailable';
  timestamp: string;
  checks: {
    postgresql: DependencyCheck;
    redis: DependencyCheck;
  };
}

const DB_TIMEOUT_MS = 2_000;

/**
 * Health operacional da API. Liveness não depende de dependências externas;
 * readiness verifica PostgreSQL (sempre crítico) e Redis (degradação
 * tolerada para consultas de referência, que fazem fallback ao PostgreSQL).
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private startedAt: Date | null = null;
  private readonly bootedAt = new Date();

  constructor(
    @Inject(DATABASE_PROBE) private readonly databaseProbe: DatabaseProbePort,
    @Inject(CACHE_PROBE) private readonly cacheProbe: CacheProbePort,
  ) {}

  markStarted(): void {
    this.startedAt = new Date();
  }

  getLiveness(): LivenessReport {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  getStarted(): { status: 'ok' | 'starting'; timestamp: string } {
    const started = this.startedAt !== null;
    return {
      status: started ? 'ok' : 'starting',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessReport> {
    const [postgresql, redis] = await Promise.all([
      this.checkPostgresql(),
      this.checkRedis(),
    ]);

    let status: ReadinessReport['status'] = 'ok';
    if (postgresql.status === 'error') status = 'unavailable';
    else if (redis.status === 'error') status = 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { postgresql, redis },
    };
  }

  private async checkPostgresql(): Promise<DependencyCheck> {
    const started = performance.now();
    try {
      await Promise.race([
        this.databaseProbe.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('PostgreSQL timeout')),
            DB_TIMEOUT_MS,
          ),
        ),
      ]);
      return {
        status: 'ok',
        latencyMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      this.logger.warn(
        `PostgreSQL indisponível no health check: ${(error as Error).message}`,
      );
      return { status: 'error' };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    if (!this.cacheProbe.isEnabled()) return { status: 'disabled' };

    const started = performance.now();
    const reachable = await this.cacheProbe.ping();
    return reachable
      ? { status: 'ok', latencyMs: Math.round(performance.now() - started) }
      : { status: 'error' };
  }
}
