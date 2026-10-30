/**
 * Teste de integracao (banco real) do caminho cifrado de PII (T-08).
 *
 * Prova que, com colunas de texto cifrado e indices cegos populados:
 *  - criacao armazena ciphertext no banco (nao plaintext nos campos enc);
 *  - lookup de e-mail usa o indice cego (HMAC), nao o valor direto;
 *  - unicidade de e-mail eh respeitada via indice cego;
 *  - login (validacao de credenciais) funciona pelo indice cego;
 *  - leitura devolve plaintext decifrado, nunca ciphertext.
 *
 * Usa linhas de teste proprias (e-mails unicos) e as remove ao final, sem
 * tocar nos dados pre-existentes do banco.
 */

import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { PrismaAuthRepository } from './prisma-auth.repository';
import {
  canonicalCpf,
  canonicalEmail,
} from '../../../../common/utils/encryption.util';
import {
  hashPassword,
  verifyPassword,
} from '../../../../common/utils/hash.util';

const TEST_EMAIL = `t08.integration.${Date.now()}@hotmail.com`;
const DUP_EMAIL = `t08.integration.dup.${Date.now()}@hotmail.com`;

describe.skip('PrismaAuthRepository (integracao, PII cifrada)', () => {
  let prisma: PrismaService;
  let pii: PiiEncryptionService;
  let repo: PrismaAuthRepository;
  const created: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrismaService,
        PiiEncryptionService,
        { provide: ConfigService, useClass: ConfigService },
        PrismaAuthRepository,
      ],
    }).compile();

    prisma = module.get(PrismaService);
    await prisma.$connect();
    pii = module.get(PiiEncryptionService);
    repo = module.get(PrismaAuthRepository);
  });

  afterAll(async () => {
    for (const id of created) {
      await prisma.user.deleteMany({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('cria usuario com ciphertext nos campos enc e indice cego do email', async () => {
    const passwordHash = await hashPassword('Senha123!');
    const user = await repo.createLocalUser({
      fullName: 'Integracao T-08',
      email: TEST_EMAIL,
      passwordHash,
    });
    created.push(user.id);

    expect(user.email).toBe(TEST_EMAIL);
    expect(user.fullName).toBe('Integracao T-08');

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row).not.toBeNull();
    expect(row!.emailEnc).not.toBeNull();
    expect(row!.emailEnc).not.toBe(TEST_EMAIL);
    expect(row!.emailBlindedIndex).not.toBeNull();
    expect(row!.emailBlindedIndex).toBe(
      pii.blindIndex(canonicalEmail(TEST_EMAIL)),
    );
    expect(row!.emailBlindedIndex!.length).toBe(64);
    expect(() => pii.decrypt(row!.emailBlindedIndex!)).toThrow();
  });

  it('nao cria dois usuarios com o mesmo email (unicidade via indice cego)', async () => {
    await repo
      .createLocalUser({
        fullName: 'Dup 1',
        email: DUP_EMAIL,
        passwordHash: await hashPassword('Senha123!'),
      })
      .then((u) => created.push(u.id));

    await expect(
      prisma.user.create({
        data: {
          passwordHash: await hashPassword('Senha123!'),
          emailEnc: pii.encrypt(DUP_EMAIL),
          emailBlindedIndex: pii.blindIndex(canonicalEmail(DUP_EMAIL)),
        },
      }),
    ).rejects.toThrow();
  });

  it('busca o usuario pelo indice cego do e-mail (lookup sem expor valor direto)', async () => {
    const found = await repo.findByEmail(TEST_EMAIL);
    expect(found).not.toBeNull();
    expect(found!.email).toBe(TEST_EMAIL);

    const notFound = await repo.findByEmail('naoexiste.t08@hotmail.com');
    expect(notFound).toBeNull();
  });

  it('encripta e decifra CPF, telefone, endereco e nome na leitura', async () => {
    const cpf = `9${Date.now().toString().slice(-10)}`;
    const email = `t08.pii.${Date.now()}@hotmail.com`;
    const user = await repo.createLocalUser({
      fullName: 'PII Completo',
      email,
      passwordHash: await hashPassword('Senha123!'),
    });
    created.push(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        cpfEnc: pii.encrypt(cpf),
        cpfBlindedIndex: pii.blindIndex(canonicalCpf(cpf)),
        phoneEnc: pii.encrypt('(11) 91234-5678'),
        addressEnc: pii.encrypt('Rua X, 100'),
        fullNameEnc: pii.encrypt('PII Completo'),
      },
    });

    const found = await repo.findById(user.id);
    expect(found!.cpf).toBe(cpf);
    expect(found!.phone).toBe('(11) 91234-5678');
    expect(found!.address).toBe('Rua X, 100');
    expect(found!.fullName).toBe('PII Completo');

    const byCpf = await prisma.user.findUnique({
      where: { cpfBlindedIndex: pii.blindIndex(canonicalCpf(cpf)) },
    });
    expect(byCpf?.id).toBe(user.id);
  });

  it('login encontra o usuario pelo indice cego e valida a senha', async () => {
    const email = `t08.login.${Date.now()}@hotmail.com`;
    const passwordHash = await hashPassword('Senha123!');
    const user = await repo.createLocalUser({
      fullName: 'Login T-08',
      email,
      passwordHash,
    });
    created.push(user.id);

    const found = await repo.findByEmail(email);
    expect(found).not.toBeNull();
    const ok = await verifyPassword('Senha123!', found!.passwordHash!);
    expect(ok).toBe(true);
  });
});
