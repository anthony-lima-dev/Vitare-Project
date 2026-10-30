/**
 * Abstração aprovada para proteção de identificadores pessoais em repouso.
 *
 * - Criptografia simétrica autenticada: AES-256-GCM com IV aleatório por
 *   operação e Auth Tag (integridade + autenticidade). O texto cifrado
 *   serializado é `base64(IV || ciphertext || tag)`.
 * - Índice cego (blinded index): HMAC-SHA256 sobre o valor canônico com
 *   CHAVE SEPARADA da chave de cifragem. É determinístico, portanto viabiliza
 *   busca/igualdade/unicidade sem revelar o valor direto (não é reversível
 *   sem a chave do índice).
 *
 * As chaves devem ser 32 bytes (256 bits) e são injetadas no construtor para
 * facilitar testes com chaves fixas. `fromEnv()` lê ENCRYPTION_KEY e
 * BLINDED_INDEX_KEY do ambiente (base64) e falha rápido se ausentes/inválidas.
 *
 * Nenhuma função desta módulo imprime ou loga plaintext.
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
// Dados associados autenticados (não criptografados) que vinculam o
// cifrado ao contexto Vitare, evitando criptoanálise por substituição de
// contexto entre usuários/tabelas.
const AAD = Buffer.from('vitare-pii-v1', 'utf8');

/** Serviço de criptografia e índice cego de PII. */
export class EncryptionService {
  constructor(
    private readonly encryptionKey: Buffer,
    private readonly blindedIndexKey: Buffer,
  ) {
    if (
      !Buffer.isBuffer(encryptionKey) ||
      encryptionKey.length !== KEY_SIZE_BYTES
    ) {
      throw new Error(
        'ENCRYPTION_KEY deve ter exatamente 32 bytes (256 bits).',
      );
    }
    if (
      !Buffer.isBuffer(blindedIndexKey) ||
      blindedIndexKey.length !== KEY_SIZE_BYTES
    ) {
      throw new Error(
        'BLINDED_INDEX_KEY deve ter exatamente 32 bytes (256 bits).',
      );
    }
  }

  /**
   * Cifra um plaintext. Mesmo plaintext gera ciphertexts diferentes a cada
   * chamada graças ao IV aleatório (não é determinístico).
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(GCM_IV_SIZE);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, tag]).toString('base64');
  }

  /**
   * Decifra um texto cifrado produzido por `encrypt`. Lança quando o token
   * está corrompido, truncado ou foi adulterado (Auth Tag inválida).
   */
  decrypt(token: string): string {
    const buf = Buffer.from(token, 'base64');
    if (buf.length < GCM_IV_SIZE + GCM_TAG_SIZE) {
      throw new Error('Texto cifrado muito curto.');
    }
    const iv = buf.subarray(0, GCM_IV_SIZE);
    const tag = buf.subarray(buf.length - GCM_TAG_SIZE);
    const ciphertext = buf.subarray(GCM_IV_SIZE, buf.length - GCM_TAG_SIZE);

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(AAD);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Índice cego determinístico de um valor canônico. Mesmo valor → mesmo
   * índice; valores diferentes → índices diferentes (colisão de HMAC é
   * impraticável). Não revela o valor sem a chave do índice.
   */
  blindIndex(canonical: string): string {
    return createHmac('sha256', this.blindedIndexKey)
      .update(canonical, 'utf8')
      .digest('hex');
  }

  /** Constrói a instância a partir das variáveis de ambiente. Fail-fast. */
  static fromEnv(): EncryptionService {
    return new EncryptionService(
      parseKey(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY'),
      parseKey(process.env.BLINDED_INDEX_KEY, 'BLINDED_INDEX_KEY'),
    );
  }
}

function parseKey(value: string | undefined, name: string): Buffer {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  const buf = Buffer.from(value, 'base64');
  if (buf.length !== KEY_SIZE_BYTES) {
    throw new Error(
      `${name} deve decodificar para exatamente 32 bytes (256 bits). Forneça uma base64 de 32 bytes (ex.: openssl rand -base64 32).`,
    );
  }
  return buf;
}

/* ============ Canonicalização de identificadores ============ */

/** E-mail: minúsculas e sem espaços nas extremidades. */
export function canonicalEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** CPF: apenas os dígitos (formato canônico de 11 dígitos quando válido). */
export function canonicalCpf(value: string): string {
  return value.replace(/\D/g, '');
}

/** Telefone: apenas os dígitos. */
export function canonicalPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Registro profissional (CRM/COREN etc.): espaços removidos nas extremidades. */
export function canonicalRegistrationNumber(value: string): string {
  return value.trim();
}
