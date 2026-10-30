import { RedisThrottlerStorage } from './redis-throttler.storage';
import type { RedisService } from '../redis/redis.service';

/* eslint-disable @typescript-eslint/unbound-method */

describe('RedisThrottlerStorage', () => {
  it('usa fallback in-memory quando Redis está desabilitado (REDIS_URL ausente)', async () => {
    const redis = {
      isEnabled: false,
      key: (...p: string[]) => p.join(':'),
      eval: jest.fn(),
    } as unknown as RedisService;
    const storage = new RedisThrottlerStorage(redis);

    const first = await storage.increment('k', 60_000, 2, 60_000, 'default');
    expect(first.totalHits).toBe(1);

    const second = await storage.increment('k', 60_000, 2, 60_000, 'default');
    expect(second.totalHits).toBe(2);

    const third = await storage.increment('k', 60_000, 2, 60_000, 'default');
    expect(third.totalHits).toBe(3);
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('usa Redis compartilhado quando habilitado e mapeia o resultado do script', async () => {
    const calls: unknown[][] = [];
    const redis = {
      isEnabled: true,
      key: (...p: (string | number)[]) => p.join(':'),
      eval: jest.fn(
        (
          script: unknown,
          numKeys: unknown,
          ...args: (string | number)[]
        ): Promise<unknown> => {
          calls.push([script, numKeys, ...args]);
          return Promise.resolve([1, 60_000, 0, 0]);
        },
      ),
    } as unknown as RedisService;
    const storage = new RedisThrottlerStorage(redis);

    const record = await storage.increment(
      'ip:1.2.3.4',
      60_000,
      100,
      60_000,
      'default',
    );
    expect(record).toEqual({
      totalHits: 1,
      timeToExpire: 60_000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    // chave prefixada + TTL/limite repassados ao script
    expect(calls[0][2]).toContain('throttle:ip:1.2.3.4');
    expect(calls[0][3]).toBe('60000');
    expect(calls[0][4]).toBe('100');
  });

  it('marca como bloqueado quando o limite é excedido no Redis', async () => {
    const redis = {
      isEnabled: true,
      key: (...p: (string | number)[]) => p.join(':'),
      eval: jest.fn((): Promise<unknown> =>
        Promise.resolve([4, 42_000, 1, 60_000]),
      ),
    } as unknown as RedisService;
    const storage = new RedisThrottlerStorage(redis);

    const record = await storage.increment('k', 60_000, 3, 60_000, 'default');
    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(60_000);
  });

  it('cai para o fallback in-memory quando o comando Redis falha (não fail-open)', async () => {
    const redis = {
      isEnabled: true,
      key: (...p: (string | number)[]) => p.join(':'),
      eval: jest.fn((): Promise<unknown> =>
        Promise.reject(new Error('connection lost')),
      ),
    } as unknown as RedisService;
    const storage = new RedisThrottlerStorage(redis);

    const record = await storage.increment('k', 60_000, 2, 60_000, 'default');
    expect(record.totalHits).toBe(1); // contou no fallback
  });
});
