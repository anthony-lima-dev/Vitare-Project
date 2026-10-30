import { Module } from '@nestjs/common';
import { HealthController } from './presentation/http/health.controller';
import { HealthService } from './application/health.service';
import {
  CACHE_PROBE,
  DATABASE_PROBE,
} from './application/ports/health-probes.port';
import { PrismaDatabaseProbe } from './infrastructure/prisma-database.probe';
import { RedisCacheProbe } from './infrastructure/redis-cache.probe';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: DATABASE_PROBE, useClass: PrismaDatabaseProbe },
    { provide: CACHE_PROBE, useClass: RedisCacheProbe },
  ],
  exports: [HealthService],
})
export class HealthModule {}
