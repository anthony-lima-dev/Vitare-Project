/**
 * Portas de verificação de dependências operacionais.
 * A aplicação define o que precisa observar; a infraestrutura executa.
 */
export interface DatabaseProbePort {
  /** Lança exceção quando a base está inacessível. */
  ping(): Promise<unknown>;
}

export interface CacheProbePort {
  isEnabled(): boolean;
  ping(): Promise<boolean>;
}

export const DATABASE_PROBE = Symbol('DATABASE_PROBE');
export const CACHE_PROBE = Symbol('CACHE_PROBE');
