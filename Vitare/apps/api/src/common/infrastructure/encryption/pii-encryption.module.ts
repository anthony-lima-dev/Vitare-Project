import { Global, Module } from '@nestjs/common';
import { PiiEncryptionService } from './pii-encryption.service';

/**
 * Módulo global da criptografia de PII. Uma única instância é compartilhada
 * por todos os repositórios que precisam cifrar/decifrar identificadores.
 */
@Global()
@Module({
  providers: [PiiEncryptionService],
  exports: [PiiEncryptionService],
})
export class PiiEncryptionModule {}
