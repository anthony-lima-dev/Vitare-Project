import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { HardenedThrottlerGuard } from './hardened-throttler.guard';
import {
  ACCOUNT_THROTTLE_KEY,
  type ThrottleByAccountOptions,
} from '../../common/decorators/throttle-by-account.decorator';

interface FakeRes {
  headersSet: Record<string, unknown>;
  setHeader(k: string, v: unknown): void;
  header(k: string, v: unknown): FakeRes;
}

interface FakeReq {
  body: Record<string, unknown>;
  ip: string;
  ips: string[] | unknown[];
  headers: Record<string, string>;
  route: { path: string };
  originalUrl: string;
  protocol: string;
  method: string;
  get: () => unknown;
}

class TestGuard extends HardenedThrottlerGuard {
  /** expõe o tracker protegido para teste de anti-spoofing */
  async tracker(req: unknown): Promise<string> {
    return this.getTracker(req as Record<string, any>);
  }
}

/** Aplica a metadata de conta diretamente sobre o handler do teste. */
function applyAccountThrottle(
  handler: () => unknown,
  options: ThrottleByAccountOptions,
): void {
  Reflect.defineMetadata(ACCOUNT_THROTTLE_KEY, options, handler);
}

async function makeGuard(storage: ThrottlerStorage) {
  const guard = new TestGuard(
    [{ name: 'default', ttl: 60_000, limit: 100 }],
    storage,
    new Reflector(),
  );
  // No runtime do Nest isso roda no init do guard; aqui manualmente.
  await guard.onModuleInit();
  return guard;
}

function makeContext(
  body: Record<string, unknown>,
  handler?: (...args: unknown[]) => unknown,
): ExecutionContext {
  const res: FakeRes = {
    headersSet: {},
    setHeader: () => {},
    header: () => ({}) as FakeRes,
  };
  res.setHeader = (k: string, v: unknown) => {
    res.headersSet[k] = v;
  };
  res.header = (k: string, v: unknown) => {
    res.headersSet[k] = v;
    return res;
  };

  const req: FakeReq = {
    body,
    ip: '203.0.113.10',
    ips: [], // trust proxy desligado → XFF ignorado
    headers: { 'x-forwarded-for': '1.1.1.1' },
    route: { path: '/api/v1/test' },
    originalUrl: '/api/v1/test',
    protocol: 'http',
    method: 'POST',
    get: () => undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => handler ?? (() => undefined),
    getClass: () => TestGuard,
    getArgs: () => [] as never,
    getType: () => 'http',
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as never,
    switchToWs: () => ({}) as never,
  } as unknown as ExecutionContext;
}

describe('HardenedThrottlerGuard', () => {
  it('ignora X-Forwarded-For quando trust proxy não está ativo (anti-spoofing)', async () => {
    const guard = await makeGuard(new ThrottlerStorageService());
    const ctx = makeContext({});
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const req = ctx.switchToHttp().getRequest() as unknown as FakeReq;
    // req.ips vazio → cai para req.ip (socket), nunca no header do cliente
    await expect(guard.tracker(req)).resolves.toBe('203.0.113.10');
  });

  it('usa req.ips quando o proxy é confiável (trust proxy ativo)', async () => {
    const guard = await makeGuard(new ThrottlerStorageService());
    const ctx = makeContext({});
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const req = ctx.switchToHttp().getRequest() as unknown as FakeReq;
    req.ips = ['198.51.100.7', '10.0.0.1'];
    await expect(guard.tracker(req)).resolves.toBe('198.51.100.7');
  });

  it('aplica limite por conta (hash do e-mail) e lança 429 com Retry-After', async () => {
    const storage = new ThrottlerStorageService();
    const guard = await makeGuard(storage);
    const handler = () => 'handler';
    applyAccountThrottle(handler, { limit: 2, ttl: 60_000 });

    const ctx = makeContext({ email: 'victim@example.com' }, handler);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toThrow();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const res = ctx.switchToHttp().getResponse() as unknown as FakeRes;
    expect(res.headersSet['Retry-After']).toBeDefined();
  });

  it('limites por conta são independentes por e-mail (hashes distintos)', async () => {
    const storage = new ThrottlerStorageService();
    const guard = await makeGuard(storage);
    const handler = () => 'handler';
    applyAccountThrottle(handler, { limit: 1, ttl: 60_000 });

    await expect(
      guard.canActivate(makeContext({ email: 'a@example.com' }, handler)),
    ).resolves.toBe(true);
    // mesma conta: excede imediatamente
    await expect(
      guard.canActivate(makeContext({ email: 'a@example.com' }, handler)),
    ).rejects.toThrow();
    // outra conta: própria cota
    await expect(
      guard.canActivate(makeContext({ email: 'b@example.com' }, handler)),
    ).resolves.toBe(true);
  });

  it('sem e-mail no body apenas o limite por IP se aplica', async () => {
    const guard = await makeGuard(new ThrottlerStorageService());
    const handler = () => 'handler';
    applyAccountThrottle(handler, { limit: 1, ttl: 60_000 });

    await expect(guard.canActivate(makeContext({}, handler))).resolves.toBe(
      true,
    );
  });
});
