import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SensitiveFieldEncryptionService } from '../../../common/utils/encryption/sensitive-field-encryption.util';
import {
  SensitiveFieldCipher,
  SENSITIVE_FIELD_CIPHER,
} from '../../../common/domain/ports/sensitive-field-cipher.port';

/**
 * Adaptador de infraestrutura para o port SensitiveFieldCipher.
 *
 * Implementa a abstração de domínio usando o serviço de criptografia concreto.
 * Expõe-se como provider global para que qualquer repositório Prisma possa
 * cifrar na escrita e decifrar na leitura.
 *
 * Integração futura com KMS/Secret Manager:
 * - Substituir leitura de env vars por chamada ao KMS (AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault)
 * - Implementar rotação automática via KMS key rotation policies
 * - Manter a mesma interface (port) para não quebrar a camada de domínio
 */
@Injectable()
export class SensitiveFieldCipherAdapter implements SensitiveFieldCipher {
  private crypto?: SensitiveFieldEncryptionService;
  private readonly logger = console; // Substituir por Logger do NestJS se necessário

  constructor(private readonly config: ConfigService) {}

  /**
   * Inicializa (ou retorna) a instância de criptografia.
   * Lê chaves do ambiente (ou KMS futuro) na primeira operação.
   * Fail-fast se chaves ausentes ou inválidas.
   */
  private requireCrypto(): SensitiveFieldEncryptionService {
    if (!this.crypto) {
      this.crypto = SensitiveFieldEncryptionService.fromEnv();
      this.logger.log(
        'SensitiveFieldCipher inicializado (chaves carregadas do ambiente).',
      );
    }
    return this.crypto;
  }

  encrypt(plaintext: string): string {
    return this.requireCrypto().encrypt(plaintext);
  }

  decrypt(envelope: string): string {
    return this.requireCrypto().decrypt(envelope);
  }

  blindIndex(canonicalValue: string): string {
    return this.requireCrypto().blindIndex(canonicalValue);
  }

  getCurrentKeyId(): number {
    return this.requireCrypto().getCurrentKeyId();
  }

  canDecrypt(envelope: string): boolean {
    return this.requireCrypto().canDecrypt(envelope);
  }

  /**
   * Método interno para testes: permite injetar instância mockada.
   * Não usar em produção.
   */
  __setCryptoForTesting(crypto: SensitiveFieldEncryptionService): void {
    this.crypto = crypto;
  }
}

/**
 * Factory provider para o token SENSITIVE_FIELD_CIPHER.
 * Permite injeção via @Inject(SENSITIVE_FIELD_CIPHER) na camada de domínio.
 */
export const SensitiveFieldCipherProvider = {
  provide: SENSITIVE_FIELD_CIPHER,
  useClass: SensitiveFieldCipherAdapter,
};

/**
 * Módulo global da criptografia de campos sensíveis.
 * Uma única instância é compartilhada por todos os repositórios.
 */
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [SensitiveFieldCipherProvider],
  exports: [SENSITIVE_FIELD_CIPHER],
})
export class SensitiveFieldCipherModule {}
