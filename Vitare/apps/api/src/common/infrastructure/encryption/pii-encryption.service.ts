import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../common/utils/encryption.util';

/**
 * Adaptador NestJS da abstração de criptografia de PII.
 *
 * Expõe-se globalmente para que qualquer repositório de Prisma possa cifrar
 * na escrita e decifrar na leitura sem reconfigurar modulos. A leitura das
 * chaves eh feita preguiçosamente na primeira operacao: o contenedor compila
 * mesmo sem as variáveis (útil em testes de composicao), mas a primeira
 * operacao criptografica falha rapido se as chaves estiverem ausentes ou
 * invalidas. No boot da aplicacao, `configuration()` já exige sua presenca.
 */
@Injectable()
export class PiiEncryptionService {
  private readonly logger = new Logger(PiiEncryptionService.name);
  private crypto?: EncryptionService;

  constructor(private readonly config: ConfigService) {}

  /** Inicializa (ou retorna) a instancia de criptografia a partir do ambiente. */
  private requireCrypto(): EncryptionService {
    if (!this.crypto) {
      this.crypto = EncryptionService.fromEnv();
      this.logger.log(
        'Criptografia de PII inicializada (chaves carregadas do ambiente).',
      );
    }
    return this.crypto;
  }

  encrypt(plaintext: string): string {
    return this.requireCrypto().encrypt(plaintext);
  }

  decrypt(token: string): string {
    return this.requireCrypto().decrypt(token);
  }

  blindIndex(canonical: string): string {
    return this.requireCrypto().blindIndex(canonical);
  }
}
