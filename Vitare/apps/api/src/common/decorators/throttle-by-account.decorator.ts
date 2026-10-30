import { SetMetadata } from '@nestjs/common';

export interface ThrottleByAccountOptions {
  /** Máximo de tentativas por identificador na janela. */
  limit: number;
  /** Janela em milissegundos. */
  ttl: number;
}

export const ACCOUNT_THROTTLE_KEY = 'account-throttle';

/**
 * Limita a rota POR IDENTIFICADOR PSEUDONIMIZADO (SHA-256 do e-mail do body),
 * em adição ao limite por IP do guard global. O hash evita armazenar/expor
 * PII nos contadores de rate limit (chaves ficam em Redis).
 *
 * Se o body não tiver e-mail, apenas o limite por IP se aplica.
 */
export const ThrottleByAccount = (options: ThrottleByAccountOptions) =>
  SetMetadata(ACCOUNT_THROTTLE_KEY, options);
