import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../../../common/decorators/public.decorator';
import { HealthService } from '../../application/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: processo vivo; nunca testa dependências externas. */
  @Public()
  @Get()
  check() {
    return this.health.getLiveness();
  }

  @Public()
  @Get('live')
  live() {
    return this.health.getLiveness();
  }

  /** Startup: explicitamente informa se o bootstrap já concluiu. */
  @Public()
  @Get('started')
  started() {
    return this.health.getStarted();
  }

  /**
   * Readiness: verifica as dependências de segurança/negócio. Redis fora
   * rebaixa para "degraded" (fallback PostgreSQL para catálogos);
   * PostgreSQL fora → 503 (não pronta para tráfego).
   */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: false }) res: Response) {
    const report = await this.health.getReadiness();
    return res.status(report.status === 'unavailable' ? 503 : 200).json(report);
  }
}
