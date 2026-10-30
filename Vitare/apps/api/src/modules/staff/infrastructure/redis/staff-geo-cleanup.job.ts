import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../../../infra/redis/redis.service';

@Injectable()
export class StaffGeoCleanupJob {
  private readonly logger = new Logger(StaffGeoCleanupJob.name);
  private readonly geoKey: string;
  private readonly freshnessPrefix: string;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const baseKey = this.config.get<string>('STAFF_GEO_KEY') ?? 'geo:staff';
    this.geoKey = this.redis.key(baseKey);
    this.freshnessPrefix = `${this.geoKey}:updated:`;
  }

  // Runs every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanup(): Promise<void> {
    if (!this.redis.isEnabled) return;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await (this.redis as any).client!.scan(
          cursor,
          'MATCH',
          `${this.freshnessPrefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        for (const key of keys) {
          const staffId = key.replace(this.freshnessPrefix, '');
          const exists = await this.redis.getJson<{ updatedAtMs: number }>(key);
          if (!exists) {
            // Freshness expired or missing -> remove from geo index
            await this.redis.geoRemove(this.geoKey, staffId);
            this.logger.debug(`Removed stale staff ${staffId} from geo index`);
          }
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Geo cleanup failed: ${(error as Error).message}`);
    }
  }
}
