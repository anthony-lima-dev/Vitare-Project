import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { HardenedThrottlerGuard } from '../src/infra/throttler/hardened-throttler.guard';

/**
 * T-06 — demonstra 429 com política de retry (Retry-After) sobre HTTP real,
 * usando módulo isolado (sem banco/Redis) com o mesmo guard de produção.
 */
@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 3 }]),
  ],
  controllers: [PingController],
  providers: [{ provide: 'APP_GUARD', useClass: HardenedThrottlerGuard }],
})
class PingModule {}

describe('Rate limiting (e2e T-06)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // App novo por teste: contadores começam zerados (isolamento).
    const moduleRef = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna 429 e Retry-After quando o limite por IP é excedido', async () => {
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(200);

    const res = await request(app.getHttpServer()).get('/ping').expect(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('spoofed X-Forwarded-For não contorna o limite (trust proxy desativado)', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 3; i++) {
      await request(server)
        .get('/ping')
        .set('X-Forwarded-For', `9.9.9.${i}`)
        .expect(200);
    }
    // mesmo com header diferente por requisição, o contador é por IP real
    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '8.8.8.8')
      .expect(429);
  });
});
