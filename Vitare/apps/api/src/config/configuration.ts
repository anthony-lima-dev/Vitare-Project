/**
 * Validação de variáveis de ambiente obrigatórias no boot da aplicação —
 * falha rápida (fail-fast) em vez de erro tardio e obscuro na primeira
 * requisição que precisar de uma env ausente (ex.: JWT_ACCESS_SECRET
 * undefined só explodindo no primeiro login).
 *
 * Mantém chaves FLAT (JWT_ACCESS_SECRET, não jwt.accessSecret) para ser
 * compatível sem alterações com todo o código já construído, que chama
 * config.get<string>('JWT_ACCESS_SECRET') diretamente.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'ENCRYPTION_KEY',
  'BLINDED_INDEX_KEY',
  'JWT_ACCESS_SECRET',
  'STAFF_JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'RESEND_API_KEY',
] as const;

export default () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`,
    );
  }

  return {
    PORT: process.env.PORT ?? '3000',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    APP_URL: process.env.APP_URL ?? 'http://localhost:5173',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

    STAFF_JWT_SECRET: process.env.STAFF_JWT_SECRET,
    STAFF_JWT_EXPIRES_IN: process.env.STAFF_JWT_EXPIRES_IN ?? '2h',

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM ?? 'Vitare <onboarding@resend.dev>',

    // Segurança operacional
    BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS ?? '12',
    // Chaves de criptografia de PII (T-08): 32 bytes cada, base64.
    // ENCRYPTION_KEY cifra texto; BLINDED_INDEX_KEY gera o índice cego (HMAC).
    // São chaves separadas e devem ser rotacionadas independentemente.
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    BLINDED_INDEX_KEY: process.env.BLINDED_INDEX_KEY,
    // Política de senha flexível (ver password-validator.util.ts). Fallbacks
    // estáticos seguros: mínimo de 8 caracteres e pelo menos 2 de 4 critérios.
    PASSWORD_MIN_LENGTH: process.env.PASSWORD_MIN_LENGTH ?? '8',
    PASSWORD_MIN_RULES: process.env.PASSWORD_MIN_RULES ?? '2',
    // Chave de bootstrap para provisão da primeira conta de staff; sem ela
    // o endpoint público de registro de staff permanece bloqueado.
    STAFF_BOOTSTRAP_KEY: process.env.STAFF_BOOTSTRAP_KEY,

    // Infraestrutura compartilhada
    REDIS_URL: process.env.REDIS_URL, // vazio → adaptador em modo "disabled"
    REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX ?? 'vitare:local',

    // Rate limiting / proteção contra abuso (T-06)
    // TRUST_PROXY vazio → X-Forwarded-For NÃO é confiável (defaults seguros).
    TRUST_PROXY: process.env.TRUST_PROXY,
    THROTTLE_TTL: process.env.THROTTLE_TTL
      ? Number(process.env.THROTTLE_TTL)
      : 60_000,
    THROTTLE_LIMIT: process.env.THROTTLE_LIMIT
      ? Number(process.env.THROTTLE_LIMIT)
      : 100,

    // Operação de emergência
    EMERGENCY_IDEMPOTENCY_TTL_HOURS:
      process.env.EMERGENCY_IDEMPOTENCY_TTL_HOURS ?? '24',
    EMERGENCY_SEARCH_RADIUS_M: process.env.EMERGENCY_SEARCH_RADIUS_M ?? '5000',
    STAFF_GEO_KEY: process.env.STAFF_GEO_KEY ?? 'geo:staff',
    STAFF_GEO_TTL_SECONDS: process.env.STAFF_GEO_TTL_SECONDS ?? '300',

    // Documentos jurídicos exigidos no onboarding (T-11).
    // Versões vigentes e hash do conteúdo publicado (SHA-256 do texto de cada
    // versão). Alterar a versão obriga re-aceite nos próximos fluxos de
    // onboarding/ativação; aceitações anteriores são preservadas (append-only).
    LEGAL: {
      requiredDocuments: {
        TERMS_OF_USE: {
          actType: 'TERMS_OF_USE' as const,
          version: process.env.TERMS_OF_USE_VERSION ?? 'v1.0.0',
          contentHash:
            process.env.TERMS_OF_USE_CONTENT_HASH ??
            'sha256:terms-of-use-v1-0-0',
        },
        PRIVACY_NOTICE: {
          actType: 'PRIVACY_NOTICE' as const,
          version: process.env.PRIVACY_NOTICE_VERSION ?? 'v1.0.0',
          contentHash:
            process.env.PRIVACY_NOTICE_CONTENT_HASH ??
            'sha256:privacy-notice-v1-0-0',
        },
      },
    },
  };
};
