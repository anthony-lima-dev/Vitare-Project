import {
  SensitiveFieldEncryptionService,
  canonicalCpf,
  canonicalEmail,
  canonicalPhone,
  canonicalRegistrationNumber,
  canonicalBirthDate,
  canonicalAddress,
  canonicalFullName,
} from './sensitive-field-encryption.util';

const KEY_A = Buffer.from(
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  'base64',
);
const KEY_B = Buffer.from(
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  'base64',
);
const KEY_C = Buffer.from(
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
  'base64',
);
const KEY_D = Buffer.from(
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=',
  'base64',
);

describe('SensitiveFieldEncryptionService', () => {
  const crypto = SensitiveFieldEncryptionService.forTesting(KEY_A, KEY_B);

  describe('encrypt/decrypt round-trip', () => {
    it('cifra e decifra com roundtrip exato', () => {
      const plaintext = '111.222.333-44';
      const ciphertext = crypto.encrypt(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(crypto.decrypt(ciphertext)).toBe(plaintext);
    });

    it('funciona com string vazia', () => {
      const ciphertext = crypto.encrypt('');
      expect(crypto.decrypt(ciphertext)).toBe('');
    });

    it('funciona com caracteres Unicode', () => {
      const plaintext = 'João Santos 🐶';
      const ciphertext = crypto.encrypt(plaintext);
      expect(crypto.decrypt(ciphertext)).toBe(plaintext);
    });

    it('funciona com string longa', () => {
      const plaintext = 'a'.repeat(10000);
      const ciphertext = crypto.encrypt(plaintext);
      expect(crypto.decrypt(ciphertext)).toBe(plaintext);
    });
  });

  describe('não-determinismo (IV aleatório)', () => {
    it('mesmo plaintext gera ciphertexts diferentes', () => {
      const c1 = crypto.encrypt('ana@hotmail.com');
      const c2 = crypto.encrypt('ana@hotmail.com');
      expect(c1).not.toBe(c2);
      expect(crypto.decrypt(c1)).toBe('ana@hotmail.com');
      expect(crypto.decrypt(c2)).toBe('ana@hotmail.com');
    });
  });

  describe('rejeita envelope adulterado/corrompido (integridade AES-GCM)', () => {
    it('rejeita tag adulterada', () => {
      const ciphertext = crypto.encrypt('senha-secreta');
      const buf = Buffer.from(ciphertext, 'base64');
      const tagStart = buf.length - 16;
      buf[tagStart] = buf[tagStart] ^ 0xff;
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Falha na descriptografia',
      );
    });

    it('rejeita ciphertext adulterado', () => {
      const ciphertext = crypto.encrypt('senha-secreta');
      const buf = Buffer.from(ciphertext, 'base64');
      const ciphertextStart = 1 + 4 + 12;
      if (buf.length > ciphertextStart) {
        buf[ciphertextStart] = buf[ciphertextStart] ^ 0xff;
        expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
          'Falha na descriptografia',
        );
      }
    });

    it('rejeita IV adulterado', () => {
      const ciphertext = crypto.encrypt('senha-secreta');
      const buf = Buffer.from(ciphertext, 'base64');
      buf[5] = buf[5] ^ 0xff;
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Falha na descriptografia',
      );
    });

    it('rejeita keyId adulterado', () => {
      const ciphertext = crypto.encrypt('senha-secreta');
      const buf = Buffer.from(ciphertext, 'base64');
      buf[1] = buf[1] ^ 0xff;
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow();
    });
  });

  describe('rejeita envelope truncado', () => {
    it('rejeita string muito curta', () => {
      expect(() => crypto.decrypt('YQ==')).toThrow('Envelope truncado');
    });

    it('rejeita envelope cortado no meio', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      // Truncar além do mínimo (versão + keyId + IV + tag = 1+4+12+16 = 33 bytes)
      // Remover 20 bytes para garantir que falhe na verificação de tamanho mínimo
      const truncated = buf.subarray(0, buf.length - 20);
      expect(() => crypto.decrypt(truncated.toString('base64'))).toThrow(
        'Envelope truncado',
      );
    });
  });

  describe('rejeita versão de envelope desconhecida', () => {
    it('rejeita versão 0', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      buf[0] = 0;
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Versão de envelope não suportada',
      );
    });

    it('rejeita versão futura (ex.: 2)', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      buf[0] = 2;
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Versão de envelope não suportada',
      );
    });

    it('NÃO faz fallback silencioso para plaintext', () => {
      expect(() => crypto.decrypt('plaintext-sem-encoding')).toThrow();
      expect(() => crypto.decrypt('')).toThrow();
    });
  });

  describe('rejeita Key ID desconhecido', () => {
    it('lança erro quando keyId não existe no keyRing', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      buf.writeUInt32BE(999, 1);
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Key ID 999 não encontrado no keyRing',
      );
    });

    it('rejeita keyId zero', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      buf.writeUInt32BE(0, 1);
      expect(() => crypto.decrypt(buf.toString('base64'))).toThrow(
        'Key ID inválido (zero)',
      );
    });
  });

  describe('rejeita chave errada', () => {
    it('não descriptografa com chave de criptografia diferente', () => {
      const ciphertext = crypto.encrypt('segredo');
      const otherCrypto = SensitiveFieldEncryptionService.forTesting(
        KEY_C,
        KEY_B,
      );
      expect(() => otherCrypto.decrypt(ciphertext)).toThrow(
        'Falha na descriptografia',
      );
    });

    it('descriptografa com mesma encryptionKey mas blindedIndexKey diferente', () => {
      const ciphertext = crypto.encrypt('segredo');
      const otherCrypto = SensitiveFieldEncryptionService.forTesting(
        KEY_A,
        KEY_D,
      );
      expect(otherCrypto.decrypt(ciphertext)).toBe('segredo');
      expect(otherCrypto.blindIndex('valor')).not.toBe(
        crypto.blindIndex('valor'),
      );
    });
  });

  describe('key ring e rotação de chaves', () => {
    it('suporta múltiplas chaves no keyRing para leitura de dados antigos', () => {
      const cryptoV1 = SensitiveFieldEncryptionService.forTesting(
        KEY_A,
        KEY_B,
        1,
      );
      const ciphertextV1 = cryptoV1.encrypt('dados-antigos');

      const cryptoV2 = cryptoV1.withHistoricalKey(2, KEY_C, KEY_D);
      expect(cryptoV2.getCurrentKeyId()).toBe(1);
      expect(cryptoV2.getAvailableKeyIds()).toEqual([1, 2]);

      const ciphertextV2 = cryptoV2.encrypt('dados-novos');
      expect(cryptoV2.decrypt(ciphertextV2)).toBe('dados-novos');

      expect(cryptoV2.decrypt(ciphertextV1)).toBe('dados-antigos');

      expect(cryptoV2.canDecrypt(ciphertextV1)).toBe(true);
      expect(cryptoV2.canDecrypt(ciphertextV2)).toBe(true);
    });

    it('blindIndexWithKeyId usa chave histórica correta', () => {
      const cryptoV1 = SensitiveFieldEncryptionService.forTesting(
        KEY_A,
        KEY_B,
        1,
      );
      const cryptoV2 = cryptoV1.withHistoricalKey(2, KEY_C, KEY_D);

      const canonical = canonicalCpf('11122233344');
      const indexV1 = cryptoV1.blindIndex(canonical);
      const indexV2 = cryptoV2.blindIndexWithKeyId(canonical, 1);
      expect(indexV1).toBe(indexV2);

      const indexCurrent = cryptoV2.blindIndex(canonical);
      expect(indexCurrent).toBe(indexV1);
    });

    it('lança erro ao adicionar keyId duplicado', () => {
      const crypto = SensitiveFieldEncryptionService.forTesting(KEY_A, KEY_B);
      expect(() => crypto.withHistoricalKey(1, KEY_C, KEY_D)).toThrow(
        'KeyId 1 já existe no keyRing',
      );
    });
  });

  describe('validação de chaves no construtor', () => {
    it('rejeita encryptionKey com tamanho errado', () => {
      const badKey = Buffer.from('curta');
      expect(() =>
        SensitiveFieldEncryptionService.forTesting(badKey, KEY_B),
      ).toThrow('encryptionKey deve ter exatamente 32 bytes');
    });

    it('rejeita blindedIndexKey com tamanho errado', () => {
      const badKey = Buffer.from('curta');
      expect(() =>
        SensitiveFieldEncryptionService.forTesting(KEY_A, badKey),
      ).toThrow('blindedIndexKey deve ter exatamente 32 bytes');
    });

    it('rejeita chaves iguais (encryptionKey === blindedIndexKey)', () => {
      expect(() =>
        SensitiveFieldEncryptionService.forTesting(KEY_A, KEY_A),
      ).toThrow('devem ser chaves DIFERENTES');
    });

    it('rejeita currentKeyId fora do range', () => {
      const keyRing = new Map([
        [1, { encryptionKey: KEY_A, blindedIndexKey: KEY_B }],
      ]);
      expect(() => new SensitiveFieldEncryptionService(0, keyRing)).toThrow(
        'currentKeyId deve estar entre 1 e 4294967295',
      );
      expect(
        () => new SensitiveFieldEncryptionService(4294967296, keyRing),
      ).toThrow('currentKeyId deve estar entre 1 e 4294967295');
    });

    it('rejeita currentKeyId inexistente no keyRing', () => {
      const keyRing = new Map([
        [1, { encryptionKey: KEY_A, blindedIndexKey: KEY_B }],
      ]);
      expect(() => new SensitiveFieldEncryptionService(2, keyRing)).toThrow(
        'currentKeyId 2 não existe no keyRing',
      );
    });
  });

  describe('canDecrypt', () => {
    it('retorna true para envelope válido com keyId conhecido', () => {
      const ciphertext = crypto.encrypt('teste');
      expect(crypto.canDecrypt(ciphertext)).toBe(true);
    });

    it('retorna false para envelope com keyId desconhecido', () => {
      const ciphertext = crypto.encrypt('teste');
      const buf = Buffer.from(ciphertext, 'base64');
      buf.writeUInt32BE(999, 1);
      expect(crypto.canDecrypt(buf.toString('base64'))).toBe(false);
    });

    it('retorna false para base64 inválido', () => {
      expect(crypto.canDecrypt('não-é-base64-valida!!!')).toBe(false);
    });

    it('retorna false para envelope truncado', () => {
      expect(crypto.canDecrypt('YQ==')).toBe(false);
    });
  });
});

describe('canonicalização', () => {
  it('canonicalEmail', () => {
    expect(canonicalEmail('  Ana@Hotmail.COM ')).toBe('ana@hotmail.com');
  });

  it('canonicalCpf extrai apenas dígitos', () => {
    expect(canonicalCpf('111.222.333-44')).toBe('11122233344');
    expect(canonicalCpf('11122233344')).toBe('11122233344');
  });

  it('canonicalPhone extrai apenas dígitos', () => {
    expect(canonicalPhone('(11) 91234-5678')).toBe('11912345678');
  });

  it('canonicalRegistrationNumber trim', () => {
    expect(canonicalRegistrationNumber(' CRM-1234 ')).toBe('CRM-1234');
  });

  it('canonicalBirthDate formata YYYY-MM-DD', () => {
    expect(canonicalBirthDate('1990-05-15')).toBe('1990-05-15');
    expect(canonicalBirthDate(new Date('1990-05-15'))).toBe('1990-05-15');
  });

  it('canonicalAddress normaliza espaços', () => {
    expect(canonicalAddress('  Rua A,   123  ')).toBe('Rua A, 123');
  });

  it('canonicalFullName normaliza espaços', () => {
    expect(canonicalFullName('  João   Silva  ')).toBe('João Silva');
  });
});

describe('índice cego (blindIndex)', () => {
  const crypto = SensitiveFieldEncryptionService.forTesting(KEY_A, KEY_B);

  it('é determinístico para o mesmo valor', () => {
    const cpf = canonicalCpf('111.222.333-44');
    expect(crypto.blindIndex(cpf)).toBe(crypto.blindIndex(cpf));
  });

  it('difere para valores diferentes', () => {
    const i1 = crypto.blindIndex(canonicalCpf('11122233344'));
    const i2 = crypto.blindIndex(canonicalCpf('11122233348'));
    expect(i1).not.toBe(i2);
  });

  it('difere para chaves diferentes', () => {
    const cpf = canonicalCpf('11122233344');
    const i1 = crypto.blindIndex(cpf);
    const otherCrypto = SensitiveFieldEncryptionService.forTesting(
      KEY_A,
      KEY_C,
    );
    expect(otherCrypto.blindIndex(cpf)).not.toBe(i1);
  });

  it('mesma chave → mesmo índice', () => {
    const cpf = canonicalCpf('11122233344');
    const i1 = crypto.blindIndex(cpf);
    const otherCrypto = SensitiveFieldEncryptionService.forTesting(
      KEY_A,
      KEY_B,
    );
    expect(otherCrypto.blindIndex(cpf)).toBe(i1);
  });

  it('tem 64 caracteres hexadecimais (HMAC-SHA256)', () => {
    const index = crypto.blindIndex(canonicalEmail('ana@hotmail.com'));
    expect(/^[0-9a-f]{64}$/.test(index)).toBe(true);
  });

  it('não revela o plaintext (one-way)', () => {
    const index = crypto.blindIndex(canonicalCpf('11122233348'));
    expect(() => crypto.decrypt(index)).toThrow();
  });
});
