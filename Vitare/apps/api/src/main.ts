import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HealthService } from './modules/health/application/health.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Permite que constraints do class-validator (ex.: IsFlexiblePasswordConstraint)
  // resolvam dependências pelo contêiner do Nest — aqui, o ConfigService.
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGIN')!
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Trusted proxy: SOMENTE quando explicitamente configurado (ex.: 'loopback',
  // '1' ou lista de CIDRs do nginx/Cloudflare). Sem TRUST_PROXY, o Express
  // ignora X-Forwarded-For — spoofing de IP não altera o rate limit.
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy) {
    const numeric = Number(trustProxy);
    (app as NestExpressApplication).set(
      'trust proxy',
      Number.isNaN(numeric) ? trustProxy : numeric,
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<string>('PORT')!;
  await app.listen(port, '0.0.0.0');

  // Marcar startup concluído somente após o listen aceitar tráfego.
  app.get(HealthService).markStarted();

  console.log(`Vitare API rodando em http://localhost:${port}/api/v1`);
}

void bootstrap();
