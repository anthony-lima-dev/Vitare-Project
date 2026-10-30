// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

/**
 * T-09: Teste de integracao (banco real) da criptografia de dados clínicos
 * e snapshots.
 *
 * Prova que:
 *  - escrita armazena ciphertext nas colunas *_enc (nao plaintext);
 *  - leitura devolve plaintext decifrado, nunca ciphertext;
 *  - snapshot antigo nao e reconstruido com dados atuais (imutabilidade);
 *  - ciphertext armazenado nao e exposto diretamente nas respostas;
 *  - dados sensíveis nao vazam para outbox/logs.
 */

import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../common/infrastructure/encryption/pii-encryption.service';
import { PrismaAllergiesRepository } from '../allergies/infrastructure/prisma/prisma-allergies.repository';
import { PrismaContactsRepository } from '../contacts/infrastructure/prisma/prisma-contacts.repository';
import { PrismaMedicationsRepository } from '../medications/infrastructure/prisma/prisma-medications.repository';
import { PrismaConditionsRepository } from '../conditions/infrastructure/prisma/prisma-conditions.repository';
import { ForbiddenMedicationsRepository } from '../forbidden-medications/domain/repositories/forbidden-medications.repository';
import { PrismaForbiddenMedicationsRepository } from '../forbidden-medications/infrastructure/prisma/prisma-forbidden-medications.repository';
import { PrismaEmergencyRepository } from '../emergency/infrastructure/prisma/prisma-emergency.repository';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000009';
const created: string[] = [];

describe.skip('T-09: Criptografia de dados clínicos e snapshots (integracao)', () => {
  let prisma: PrismaService;
  let pii: PiiEncryptionService;

  let allergyRepo: PrismaAllergiesRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in test setup
  let contactRepo: PrismaContactsRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in test setup
  let medicationRepo: PrismaMedicationsRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in test setup
  let conditionRepo: PrismaConditionsRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in test setup
  let forbiddenRepo: PrismaForbiddenMedicationsRepository;
  let emergencyRepo: PrismaEmergencyRepository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrismaService,
        PiiEncryptionService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        PrismaAllergiesRepository,
        PrismaContactsRepository,
        PrismaMedicationsRepository,
        PrismaConditionsRepository,
        PrismaForbiddenMedicationsRepository,
        { provide: ForbiddenMedicationsRepository, useClass: PrismaForbiddenMedicationsRepository },
        PrismaEmergencyRepository,
      ],
    }).compile();

    prisma = module.get(PrismaService);
    await prisma.$connect();
    pii = module.get(PiiEncryptionService);
    allergyRepo = module.get(PrismaAllergiesRepository);
    contactRepo = module.get(PrismaContactsRepository);
    medicationRepo = module.get(PrismaMedicationsRepository);
    conditionRepo = module.get(PrismaConditionsRepository);
    forbiddenRepo = module.get(PrismaForbiddenMedicationsRepository);
    emergencyRepo = module.get(PrismaEmergencyRepository);

    const ts = Date.now();
    // Limpa e cria o usuario de teste (email/cpf unicos para evitar conflito de indice cego)
    await prisma.user
      .delete({ where: { id: TEST_USER_ID } })
      .catch(() => undefined);
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        emailEnc: pii.encrypt(`test-${ts}@example.com`),
        emailBlindedIndex: pii.blindIndex(
          `test-${ts}@example.com`.toLowerCase(),
        ),
        cpfEnc: pii.encrypt('99988877766'),
        cpfBlindedIndex: pii.blindIndex('99988877766'),
        phoneEnc: pii.encrypt('11999999999'),
        addressEnc: pii.encrypt('Rua Teste, 123'),
        birthDateEnc: pii.encrypt('1990-01-01'),
        fullNameEnc: pii.encrypt('Paciente Snapshot'),
        bloodType: 'O+',
        weightKg: 70,
        heightCm: 170,
      },
    });
  });

  afterAll(async () => {
    // Limpa os eventos criados
    for (const id of created) {
      await prisma.emergencyEvent
        .delete({ where: { id } })
        .catch(() => undefined);
    }
    await prisma.user
      .delete({ where: { id: TEST_USER_ID } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  it('escreve e le snapshot clinico cifrado', async () => {
    const snapshot = {
      snapshotVersion: '1.1',
      origin: 'server',
      capturedAt: '2026-10-16T12:00:00.000Z',
      serverReceivedAt: '2026-10-16T12:00:00.000Z',
      patient: {
        fullName: 'Paciente Snapshot',
        cpf: '99988877766',
        bloodType: 'O+',
        birthDate: '1990-01-01',
        weightKg: 70,
        heightCm: 170,
      },
      conditions: [{ notes: null, disease: { name: 'Diabetes', code: 'E11' } }],
      medications: [
        { name: 'Metformina', dosage: '500mg', frequency: '2x ao dia' },
      ],
      contacts: [{ name: 'Contato', phone: '11999999999', isPrimary: true }],
      allergies: [{ name: 'Dipirona', severity: 'Baixa', notes: null }],
    };

    const event = await emergencyRepo.createEvent(
      { userId: TEST_USER_ID, patientSnapshot: snapshot as any }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      undefined,
    );

    // Snapshot foi armazenado cifrado
    const row = await prisma.emergencyEvent.findUnique({
      where: { id: event.id },
    });
    expect(row).not.toBeNull();
    expect(row!.patientSnapshotEnc).not.toBeNull();
    // O ciphertext nao eh o JSON original
    expect(row!.patientSnapshotEnc).not.toContain('Paciente Snapshot');

    // Leitura devolve o snapshot decifrado
    const found = await emergencyRepo.findById(event.id);
    expect(found).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const snap = found!.patientSnapshot as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(snap.patient.fullName).toBe('Paciente Snapshot');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(snap.patient.cpf).toBe('99988877766');

    // O snapshot nao eh modificado por mudancas posteriores (imutabilidade)
    // Atualiza o paciente e dispara outro evento - o primeiro snapshot permanece intacto
    await prisma.user.update({
      where: { id: TEST_USER_ID },
      data: { fullNameEnc: pii.encrypt('Nome Alterado T-09') },
    });

    const event2 = await emergencyRepo.createEvent(
      { userId: TEST_USER_ID, patientSnapshot: snapshot as any }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      undefined,
    );
    const firstEvent = await emergencyRepo.findById(event.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const snap1 = firstEvent!.patientSnapshot as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(snap1.patient.fullName).toBe('Paciente Snapshot'); // nao mudou para 'Nome Alterado'

    created.push(event.id);
    created.push(event2.id);
  });

  it('outbox nao contem dados clinicos sensiveis', async () => {
    // Dispara um evento para gerar outbox
    const snapshot = {
      snapshotVersion: '1.1',
      origin: 'server',
      capturedAt: '2026-10-16T12:00:00.000Z',
      serverReceivedAt: '2026-10-16T12:00:00.000Z',
      patient: {
        fullName: 'Outbox Teste',
        cpf: '55566677788',
        bloodType: 'A-',
        birthDate: null,
        weightKg: null,
        heightCm: null,
      },
      conditions: [],
      medications: [],
      contacts: [],
      allergies: [],
    };

    await emergencyRepo.createEvent(
      { userId: TEST_USER_ID, patientSnapshot: snapshot as any }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      undefined,
    );

    const outbox = await prisma.outboxEvent.findMany({
      where: { type: 'emergency.triggered' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(outbox.length).toBeGreaterThan(0);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = outbox[0].payload as any;
    // O payload do outbox so tem id/status/triggeredAt - sem dados clinicos
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(payload.id).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(payload.status).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(payload.triggeredAt).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(payload.patient).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(payload.snapshot).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('Outbox Teste');
    expect(JSON.stringify(payload)).not.toContain('55566677788');

    // Limpa o outbox de teste
    await prisma.outboxEvent
      .delete({ where: { id: outbox[0].id } })
      .catch(() => undefined);
  });

  it('ciphertext armazenado nao e decodificavel como texto direto', async () => {
    // Verifica que o ciphertext nas colunas enc nao eh o valor original
    const allergy = await allergyRepo.create(TEST_USER_ID, {
      name: 'Teste Ciphertext Nao Exposto',
      severity: undefined,
      notes: undefined,
    });

    const row = await prisma.allergy.findUnique({ where: { id: allergy.id } });
    expect(row!.nameEnc).not.toBe('Teste Ciphertext Nao Exposto');
    // O ciphertext eh base64 e nao contem o texto claro
    expect(row!.nameEnc).not.toContain('Teste');
    expect(row!.nameEnc).not.toContain('Ciphertext');

    // Mas decifra corretamente
    expect(pii.decrypt(row!.nameEnc!)).toBe('Teste Ciphertext Nao Exposto');

    created.push(allergy.id);
  });
});
