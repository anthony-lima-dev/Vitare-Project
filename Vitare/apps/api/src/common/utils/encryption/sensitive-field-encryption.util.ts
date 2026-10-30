/**
 * Criptografia de campos sensíveis (PII/dados de saúde) — Implementação AES-256-GCM
 *
 * Especificação T-06:
 * - AEAD aprovado: AES-256-GCM com IV aleatório (12 bytes) por operação
 * - Tag de autenticação (16 bytes) integrada ao envelope
 * - Envelope versionado com Key ID para rotação de chaves
 * - Validação estrita: sem fallback silencioso para plaintext
 * - Chave de criptografia SEPARADA da chave HMAC para índices cegos
 * - Chaves: 32 bytes (256 bits) cada, base64
 * - Nunca logar, versionar, commitar ou distribuir chave junto de ciphertext
 *
 * Formato do envelope (binário, base64url-safe):
 *   version(1 byte) || keyId(4 bytes, big-endian) || IV(12 bytes) || ciphertext || tag(16 bytes)
 *
 * Versão atual: 1
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

const KEY_SIZE_BYTES = 32;
const GCM_IV_SIZE = 12;
const GCM_TAG_SIZE = 16;
const ENVELOPE_VERSION = 1;
const KEY_ID_SIZE = 4;

const AAD = Buffer.from('vitare-pii-v1', 'utf8');

export interface KeyPair {
  encryptionKey: Buffer;
  blindedIndexKey: Buffer;
}

export interface DecodedEnvelope {
  version: number;
  keyId: number;
  iv: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
}

export class SensitiveFieldEncryptionService {
  private readonly keyRing: Map<number, KeyPair>;
  private readonly currentKeyId: number;

  constructor(currentKeyId: number, keyRing: Map<number, KeyPair>) {
    if (currentKeyId < 1 || currentKeyId > 0xffffffff) {
      throw new Error('currentKeyId deve estar entre 1 e 4294967295');
    }
    if (!keyRing.has(currentKeyId)) {
      throw new Error(`currentKeyId ${currentKeyId} não existe no keyRing`);
    }
    for (const [kid, pair] of keyRing.entries()) {
      this.validateKeyPair(kid, pair);
    }
    this.currentKeyId = currentKeyId;
    this.keyRing = new Map(keyRing);
  }

  private validateKeyPair(keyId: number, pair: KeyPair): void {
    if (
      !Buffer.isBuffer(pair.encryptionKey) ||
      pair.encryptionKey.length !== KEY_SIZE_BYTES
    ) {
      throw new Error(
        `KeyRing[${keyId}].encryptionKey deve ter exatamente 32 bytes (256 bits).`,
      );
    }
    if (
      !Buffer.isBuffer(pair.blindedIndexKey) ||
      pair.blindedIndexKey.length !== KEY_SIZE_BYTES
    ) {
      throw new Error(
        `KeyRing[${keyId}].blindedIndexKey deve ter exatamente 32 bytes (256 bits).`,
      );
    }
    if (pair.encryptionKey.equals(pair.blindedIndexKey)) {
      throw new Error(
        `KeyRing[${keyId}]: encryptionKey e blindedIndexKey devem ser chaves DIFERENTES.`,
      );
    }
  }

  static fromEnv(): SensitiveFieldEncryptionService {
    const encryptionKey = parseKey(
      process.env.ENCRYPTION_KEY,
      'ENCRYPTION_KEY',
    );
    const blindedIndexKey = parseKey(
      process.env.BLINDED_INDEX_KEY,
      'BLINDED_INDEX_KEY',
    );
    const currentKeyId = parseKeyId(process.env.ENCRYPTION_KEY_ID);

    const keyRing = new Map<number, KeyPair>();
    keyRing.set(currentKeyId, { encryptionKey, blindedIndexKey });

    return new SensitiveFieldEncryptionService(currentKeyId, keyRing);
  }

  static forTesting(
    encryptionKey: Buffer,
    blindedIndexKey: Buffer,
    currentKeyId = 1,
  ): SensitiveFieldEncryptionService {
    const keyRing = new Map<number, KeyPair>();
    keyRing.set(currentKeyId, { encryptionKey, blindedIndexKey });
    return new SensitiveFieldEncryptionService(currentKeyId, keyRing);
  }

  withHistoricalKey(
    keyId: number,
    encryptionKey: Buffer,
    blindedIndexKey: Buffer,
  ): SensitiveFieldEncryptionService {
    if (this.keyRing.has(keyId)) {
      throw new Error(`KeyId ${keyId} já existe no keyRing`);
    }
    const newKeyRing = new Map(this.keyRing);
    newKeyRing.set(keyId, { encryptionKey, blindedIndexKey });
    return new SensitiveFieldEncryptionService(this.currentKeyId, newKeyRing);
  }

  encrypt(plaintext: string): string {
    const { encryptionKey } = this.keyRing.get(this.currentKeyId)!;
    const iv = randomBytes(GCM_IV_SIZE);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const keyIdBuf = Buffer.alloc(KEY_ID_SIZE);
    keyIdBuf.writeUInt32BE(this.currentKeyId, 0);

    const envelope = Buffer.concat([
      Buffer.from([ENVELOPE_VERSION]),
      keyIdBuf,
      iv,
      ciphertext,
      tag,
    ]);

    return envelope.toString('base64');
  }

  decrypt(envelope: string): string {
    const decoded = this.decodeEnvelope(envelope);
    const keyPair = this.keyRing.get(decoded.keyId);

    if (!keyPair) {
      throw new Error(
        `Key ID ${decoded.keyId} não encontrado no keyRing. ` +
          `Chave pode ter sido removida ou envelope é de versão futura.`,
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyPair.encryptionKey,
      decoded.iv,
    );
    decipher.setAuthTag(decoded.tag);
    decipher.setAAD(AAD);

    try {
      return Buffer.concat([
        decipher.update(decoded.ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error(
        'Falha na descriptografia: tag inválida ou ciphertext corrompido',
      );
    }
  }

  blindIndex(canonicalValue: string): string {
    const { blindedIndexKey } = this.keyRing.get(this.currentKeyId)!;
    return createHmac('sha256', blindedIndexKey)
      .update(canonicalValue, 'utf8')
      .digest('hex');
  }

  blindIndexWithKeyId(canonicalValue: string, keyId: number): string {
    const keyPair = this.keyRing.get(keyId);
    if (!keyPair) {
      throw new Error(`Key ID ${keyId} não encontrado no keyRing`);
    }
    return createHmac('sha256', keyPair.blindedIndexKey)
      .update(canonicalValue, 'utf8')
      .digest('hex');
  }

  getCurrentKeyId(): number {
    return this.currentKeyId;
  }

  getAvailableKeyIds(): number[] {
    return Array.from(this.keyRing.keys()).sort((a, b) => a - b);
  }

  canDecrypt(envelope: string): boolean {
    try {
      const decoded = this.decodeEnvelope(envelope);
      return this.keyRing.has(decoded.keyId);
    } catch {
      return false;
    }
  }

  private decodeEnvelope(envelope: string): DecodedEnvelope {
    let buf: Buffer;
    try {
      buf = Buffer.from(envelope, 'base64');
    } catch {
      throw new Error('Envelope não é base64 válido');
    }

    const minSize = 1 + KEY_ID_SIZE + GCM_IV_SIZE + GCM_TAG_SIZE;
    if (buf.length < minSize) {
      throw new Error('Envelope truncado: tamanho menor que o mínimo esperado');
    }

    const version = buf[0];
    if (version !== ENVELOPE_VERSION) {
      throw new Error(
        `Versão de envelope não suportada: ${version}. ` +
          `Versão atual: ${ENVELOPE_VERSION}. Sem fallback para plaintext.`,
      );
    }

    const keyId = buf.readUInt32BE(1);
    if (keyId === 0) {
      throw new Error('Key ID inválido (zero) no envelope');
    }

    const ivStart = 1 + KEY_ID_SIZE;
    const iv = buf.subarray(ivStart, ivStart + GCM_IV_SIZE);
    if (iv.length !== GCM_IV_SIZE) {
      throw new Error('IV com tamanho inválido no envelope');
    }

    const tagStart = buf.length - GCM_TAG_SIZE;
    const tag = buf.subarray(tagStart);
    if (tag.length !== GCM_TAG_SIZE) {
      throw new Error('Tag de autenticação com tamanho inválido');
    }

    const ciphertext = buf.subarray(ivStart + GCM_IV_SIZE, tagStart);

    return { version, keyId, iv, ciphertext, tag };
  }
}

function parseKey(value: string | undefined, name: string): Buffer {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  const buf = Buffer.from(value, 'base64');
  if (buf.length !== KEY_SIZE_BYTES) {
    throw new Error(
      `${name} deve decodificar para exatamente 32 bytes (256 bits). ` +
        `Forneça uma base64 de 32 bytes (ex.: openssl rand -base64 32).`,
    );
  }
  return buf;
}

function parseKeyId(value: string | undefined): number {
  if (!value) return 1;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 0xffffffff) {
    throw new Error(
      `ENCRYPTION_KEY_ID deve ser inteiro entre 1 e 4294967295. Recebido: ${value}`,
    );
  }
  return parsed;
}

export function canonicalEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function canonicalCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function canonicalPhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function canonicalRegistrationNumber(value: string): string {
  return value.trim();
}

export function canonicalBirthDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
}

export function canonicalAddress(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function canonicalFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
