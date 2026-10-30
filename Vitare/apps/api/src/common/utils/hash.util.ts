import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PASSWORD_MAX_UTF8_BYTES } from './password-validator.util';

/**
 * Custo do bcrypt configurável via BCRYPT_SALT_ROUNDS (padrão 12, faixa
 * aceita 10–15). Ajuste do valor em produção deve ser medido no ambiente-alvo
 * (tempo por hash ~100–300 ms) antes de subir o custo.
 */
const BCRYPT_SALT_ROUNDS = resolveSaltRounds();

function resolveSaltRounds(): number {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = raw ? Number(raw) : 12;
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 15) return 12;
  return parsed;
}

/** Limite de entrada do bcrypt em BYTES (caracteres multibyte contam mais). */
export const BCRYPT_MAX_INPUT_BYTES = PASSWORD_MAX_UTF8_BYTES;

export async function hashPassword(plain: string): Promise<string> {
  if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_INPUT_BYTES) {
    throw new Error('Senha excede o tamanho máximo suportado (72 bytes).');
  }
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_INPUT_BYTES) return false;
  return bcrypt.compare(plain, hash);
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Fingerprint determinístico de payload para comparação de idempotência. */
export function fingerprintPayload(payload: unknown): string {
  return sha256(stableStringify(payload));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}
