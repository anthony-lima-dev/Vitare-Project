import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import {
  ACCOUNT_THROTTLE_KEY,
  type ThrottleByAccountOptions,
} from '../../common/decorators/throttle-by-account.decorator';

/**
 * ThrottlerGuard com hardening:
 *
 * 1. Tracker por IP confiável: usa `req.ips` (preenchido pelo Express SOMENTE
 *    quando `trust proxy` está configurado) e cai para `req.ip` (endereço do
 *    socket). Um `X-Forwarded-For` enviado por um cliente NÃO confiável é
 *    ignorado — spoofing de IP não contorna a política. `trust proxy` só
 *    deve ser habilitado via TRUST_PROXY quando a API estiver atrás de um
 *    proxy reverso conhecido (nginx/Cloudflare etc.).
 *
 * 2. Limite por conta (opcional, via @ThrottleByAccount): contador adicional
 *    por hash SHA-256 do e-mail, impedindo que um atacante com muitos IPs
 *    (ou muitos e-mails) evada o limite por IP em rotas de autenticação.
 *
 * 3. Política de retry: toda 429 carrega o header `Retry-After` (segundos).
 */
@Injectable()
export class HardenedThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: Array<ThrottlerOptions> | Record<string, Array<ThrottlerOptions>>,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options as never, storageService, reflector);
  }

  /** IP real: só confia em XFF quando `trust proxy` está ativo. */
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (Array.isArray(req.ips) && req.ips.length > 0) {
      return Promise.resolve(String(req.ips[0]));
    }
    return Promise.resolve(String(req.ip ?? 'unknown'));
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    this.setRetryAfterHeader(context, detail.timeToExpire);
    await super.throwThrottlingException(context, detail);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await super.canActivate(context);

    const accountPolicy = this.reflector.get<
      ThrottleByAccountOptions | undefined
    >(ACCOUNT_THROTTLE_KEY, context.getHandler());
    if (accountPolicy) await this.enforceAccountLimit(context, accountPolicy);

    return allowed;
  }

  private async enforceAccountLimit(
    context: ExecutionContext,
    policy: ThrottleByAccountOptions,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<{
      body?: { email?: unknown };
    }>();
    const email: unknown = req?.body?.email;
    if (typeof email !== 'string' || email.trim() === '') return; // só IP aplica

    const accountHash = createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');

    const record = await this.storageService.increment(
      `account:${accountHash}`,
      policy.ttl,
      policy.limit,
      policy.ttl,
      'account',
    );

    if (record.totalHits > policy.limit) {
      this.setRetryAfterHeader(context, record.timeToExpire);
      throw new ThrottlerException(
        'Muitas tentativas para esta conta. Tente novamente mais tarde.',
      );
    }
  }

  private setRetryAfterHeader(
    context: ExecutionContext,
    timeToExpireMs: number,
  ): void {
    const res = context.switchToHttp().getResponse<{
      setHeader?: (name: string, value: number) => void;
    }>();
    const seconds = Math.max(1, Math.ceil(timeToExpireMs / 1000));
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', seconds);
    }
  }
}
