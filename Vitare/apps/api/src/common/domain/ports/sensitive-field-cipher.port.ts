/**
 * Domain Port: Sensitive Field Cipher
 *
 * Contrato de aplicação para criptografia de campos sensíveis (PII/dados de saúde).
 * A camada de domínio depende desta abstração; a implementação concreta reside
 * na camada de infraestrutura (adapter).
 *
 * Requisitos de segurança (T-06):
 * - AES-256-GCM (AEAD aprovado) com nonce aleatório por operação
 * - Tag autenticada integrada ao envelope
 * - Envelope versionado com Key ID para rotação de chaves
 * - Validação estrita: sem fallback silencioso para plaintext
 * - Chave de criptografia SEPARADA da chave HMAC para índices cegos
 * - Nunca logar, versionar ou distribuir chave junto de ciphertext
 *
 * Formato do envelope (binário, base64):
 *   version(1 byte) || keyId(4 bytes, big-endian) || IV(12 bytes) || ciphertext || tag(16 bytes)
 *
 * Versão atual: 1
 */
export interface SensitiveFieldCipher {
  /**
   * Criptografa um plaintext, retornando envelope versionado com Key ID.
   * Mesmo plaintext gera ciphertexts diferentes a cada chamada (IV aleatório).
   */
  encrypt(plaintext: string): string;

  /**
   * Descriptografa um envelope produzido por encrypt().
   * Lança erro se: envelope corrompido, truncado, tag inválida,
   * versão desconhecida, Key ID desconhecido ou chave errada.
   * NUNCA faz fallback silencioso para plaintext.
   */
  decrypt(envelope: string): string;

  /**
   * Gera índice cego (blinded index) determinístico para busca/igualdade/unicidade.
   * Usa HMAC-SHA256 com chave SEPARADA da chave de criptografia.
   * Mesmo valor canônico + mesma chave → mesmo índice.
   * Não é reversível sem a chave do índice.
   */
  blindIndex(canonicalValue: string): string;

  /**
   * Retorna o Key ID atual usado para novas criptografias.
   * Útil para auditoria e migração.
   */
  getCurrentKeyId(): number;

  /**
   * Verifica se um envelope pode ser descriptografado com as chaves atuais.
   * Útil para detectar dados órfãos antes de tentar decrypt().
   */
  canDecrypt(envelope: string): boolean;
}

/**
 * Token de injeção de dependência para o port SensitiveFieldCipher.
 * Permite que a camada de domínio dependa da abstração sem conhecer
 * a implementação concreta (NestJS provider token).
 */
export const SENSITIVE_FIELD_CIPHER = Symbol('SensitiveFieldCipher');

/**
 * Configuração para inicialização do cipher.
 * Chaves devem ser 32 bytes (256 bits) cada, codificadas em base64.
 * NUNCA hard-code, commit, log ou distribua chaves junto de ciphertext.
 */
export interface SensitiveFieldCipherConfig {
  /** Chave de criptografia de dados (AES-256-GCM) - base64 de 32 bytes */
  encryptionKey: string;
  /** Chave de índice cego (HMAC-SHA256) - base64 de 32 bytes, DIFERENTE da encryptionKey */
  blindedIndexKey: string;
  /** Key ID atual (1-4294967295). Incrementar na rotação. */
  currentKeyId: number;
  /** Mapeamento de Key ID -> chave de criptografia (para rotação/leitura de versões antigas) */
  keyRing: Map<number, { encryptionKey: Buffer; blindedIndexKey: Buffer }>;
}
