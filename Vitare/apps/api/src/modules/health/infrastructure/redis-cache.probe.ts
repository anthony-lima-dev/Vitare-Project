import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';
import { CacheProbePort } from '../application/ports/health-probes.port';

@Injectable()
export class RedisCacheProbe implements CacheProbePort {
  constructor(private readonly redis: RedisService) {}

  isEnabled(): boolean {
    return this.redis.isEnabled;
  }

  ping(): Promise<boolean> {
    return this.redis.ping();
  }
}
