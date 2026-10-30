import {
  EncryptionService,
  canonicalCpf,
  canonicalEmail,
  canonicalPhone,
  canonicalRegistrationNumber,
} from './encryption.util';

const KEY_A = Buffer.from(
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  'base64',
); // 32 bytes
const KEY_B = Buffer.from(
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  'base64',
); // 32 bytes

describe('EncryptionService', () => {
  const crypto = new EncryptionService(KEY_A, KEY_B);

  it('cifra e decifra com roundtrip exato', () => {
    const plaintext = '111.222.333-44';
    const ciphertext = crypto.encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(crypto.decrypt(ciphertext)).toBe(plaintext);
  });

  it('não é determinístico: mesmo plaintext gera ciphertexts diferentes (IV aleatório)', () => {
    const c1 = crypto.encrypt('ana@hotmail.com');
    const c2 = crypto.encrypt('ana@hotmail.com');
    expect(c1).not.toBe(c2);
    expect(crypto.decrypt(c1)).toBe('ana@hotmail.com');
    expect(crypto.decrypt(c2)).toBe('ana@hotmail.com');
  });

  it('rejeita ciphertext adulterado/corrompido (integridade AES-GCM)', () => {
    const ciphertext = crypto.encrypt('senha-secreta');
    const buf = Buffer.from(ciphertext, 'base64');
    // Flipa um byte do payload (não o IV nem a tag, quando possível).
    const tampered = Buffer.from(buf);
    tampered[40] = tampered[40] ^ 0xff;
    expect(() => crypto.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('rejeita entrada inválida no decrypt', () => {
    expect(() => crypto.decrypt('não-é-base64-valida!!!')).toThrow();
    expect(() =>
      crypto.decrypt(Buffer.from('0000', 'hex').toString('base64')),
    ).toThrow();
  });

  it('índice cego é determinístico para o mesmo valor', () => {
    const cpf = canonicalCpf('111.222.333-44');
    expect(crypto.blindIndex(cpf)).toBe(crypto.blindIndex(cpf));
  });

  it('índice cego difere para valores diferentes e para chaves diferentes', () => {
    const cpf = canonicalCpf('111.222.333-44');
    const i1 = crypto.blindIndex(cpf);
    const i2 = crypto.blindIndex(canonicalCpf('11122233348'));
    expect(i1).not.toBe(i2);
    const otherCrypto = new EncryptionService(KEY_A, KEY_B);
    // Mesma chave → mesmo índice
    expect(otherCrypto.blindIndex(cpf)).toBe(i1);
    const otherKey = new EncryptionService(
      KEY_A,
      Buffer.from('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=', 'base64'),
    );
    expect(otherKey.blindIndex(cpf)).not.toBe(i1);
  });

  it('índice cego tem 64 caracteres hexadecimais (HMAC-SHA256)', () => {
    const index = crypto.blindIndex(canonicalEmail('ana@hotmail.com'));
    expect(/^[0-9a-f]{64}$/.test(index)).toBe(true);
  });

  it('não revela o plaintext a partir do índice cego (one-way)', () => {
    const index = crypto.blindIndex(canonicalCpf('11122233348'));
    expect(() => crypto.decrypt(index)).toThrow();
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
});
