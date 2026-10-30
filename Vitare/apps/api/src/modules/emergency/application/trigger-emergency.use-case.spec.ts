// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { TriggerEmergencyUseCase } from './trigger-emergency.use-case';
import {
  IdempotencyInProgressError,
  IdempotencyPayloadMismatchError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from '../../../common/errors/domain-error';
import { EmergencyStatus } from '../domain/emergency-status';
import type { PatientSnapshot } from '../domain/clinical-snapshot';
import type {
  EmergencyEventRecord,
  EmergencyRepositoryPort,
} from './ports/emergency-ports';
import type { IdempotencyStorePort } from './ports/idempotency-port';

const KEY = '0f8d2a9e-1111-4222-8333-444455556666';

function makeEvent(
  overrides: Partial<EmergencyEventRecord> = {},
): EmergencyEventRecord {
  return {
    id: 'event-1',
    userId: 'user-1',
    triggeredAt: new Date(),
    latitude: null,
    longitude: null,
    patientSnapshot: {},
    status: EmergencyStatus.TRIGGERED,
    notes: null,
    assignedStaffId: null,
    acceptedAt: null,
    resolvedAt: null,
    ...overrides,
  };
}

/**
 * Finding 5.1 — chave de idempotência obrigatória e validada;
 * finding 5.2 — snapshot offline sanitizado por allowlist.
 */
describe('TriggerEmergencyUseCase', () => {
  let repository: EmergencyRepositoryPort;
  let store: IdempotencyStorePort;

  beforeEach(() => {
    repository = {
      buildSnapshotSource: jest.fn().mockResolvedValue({
        fullName: 'Maria Souza',
        cpf: '11122233344',
        bloodType: 'O+',
        birthDate: new Date('1990-05-10'),
        weightKg: 70,
        heightCm: 170,
        conditions: [
          { notes: null, disease: { name: 'Diabetes', code: 'E11' } },
        ],
        medications: [
          { name: 'Metformina', dosage: '500mg', frequency: '2x ao dia' },
        ],
        contacts: [{ name: 'João', phone: '11999999999', isPrimary: true }],
        allergies: [{ name: 'Dipirona', severity: 'Alta', notes: null }],
      }),
      createEvent: jest
        .fn()
        // eslint-disable-next-line @typescript-eslint/require-await -- sync mock implementation
        .mockImplementation(async (data: { patientSnapshot: unknown }) =>
          makeEvent({ patientSnapshot: data.patientSnapshot }),
        ),
      findById: jest.fn(),
      findAllByUser: jest.fn(),
      findManyByUser: jest
        .fn()
        .mockResolvedValue({ items: [], nextCursor: null }),
      transitionIfCurrent: jest.fn(),
      markNotifiedIfCurrent: jest.fn(),
    };
    store = {
      execute: jest.fn(
        async (
          _input: unknown,
          operation: (tx: unknown) => Promise<EmergencyEventRecord>,
        ) => ({ result: await operation(undefined), replay: false }),
      ),
    } as unknown as IdempotencyStorePort;
  });

  function makeUseCase() {
    return new TriggerEmergencyUseCase(repository, store);
  }

  it('rejeita acionamento sem chave de idempotência', async () => {
    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: {},
        idempotencyKey: '',
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow(MissingIdempotencyKeyError);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(store.execute).not.toHaveBeenCalled();
  });

  it('rejeita chave malformada/curta demais', async () => {
    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: {},
        idempotencyKey: 'ab',
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow(InvalidIdempotencyKeyError);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(store.execute).not.toHaveBeenCalled();
  });

  it('executa dentro do store idempotente com escopo estável e TTL', async () => {
    await makeUseCase().execute({
      userId: 'user-1',
      input: { latitude: -23.5, longitude: -46.6 },
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });

    const call = (store.execute as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(call.scope).toBe('emergency.trigger');
    expect(call.key).toBe(KEY);
    expect(call.userId).toBe('user-1');
    expect(call.ttlHours).toBe(24);
    expect(typeof call.requestHash).toBe('string');
  });

  it('devolve o resultado persistido em replay sem recriar o evento', async () => {
    (store.execute as jest.Mock).mockResolvedValue({
      result: makeEvent({ id: 'event-original' }),
      replay: true,
    });

    const result = await makeUseCase().execute({
      userId: 'user-1',
      input: {},
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });

    expect(result.replay).toBe(true);
    expect(result.event.id).toBe('event-original');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.createEvent).not.toHaveBeenCalled();
  });

  it('propaga conflito permanente de payload (mesma chave, payload divergente)', async () => {
    (store.execute as jest.Mock).mockRejectedValue(
      new IdempotencyPayloadMismatchError(),
    );

    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: {},
        idempotencyKey: KEY,
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow(IdempotencyPayloadMismatchError);
  });

  it('propaga conflito retryável de operação em andamento (409 tipado)', async () => {
    (store.execute as jest.Mock).mockRejectedValue(
      new IdempotencyInProgressError(),
    );

    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: {},
        idempotencyKey: KEY,
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow(IdempotencyInProgressError);
  });

  it('fingerprint cobre campos de proveniência do cliente (clientTriggeredAt)', async () => {
    const hashes: string[] = [];
    (store.execute as jest.Mock).mockImplementation(
      async (input: Record<string, unknown>) => {
        hashes.push(input.requestHash as string);
        return { result: makeEvent(), replay: false };
      },
    );
    const uc = makeUseCase();

    await uc.execute({
      userId: 'user-1',
      input: { clientTriggeredAt: '2026-01-01T00:00:00.000Z' },
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });
    await uc.execute({
      userId: 'user-1',
      input: { clientTriggeredAt: '2026-01-02T00:00:00.000Z' },
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });

    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
  });

  it('sanitiza snapshot offline: origem forçada como client e metadados do servidor', async () => {
    await makeUseCase().execute({
      userId: 'user-1',
      input: {
        latitude: -23.5,
        longitude: -46.6,
        patientSnapshot: {
          snapshotVersion: '1.1',
          origin: 'server',
          capturedAt: '2026-10-16T11:59:00.000Z',
          serverReceivedAt: '2000-01-01T00:00:00.000Z',
          patient: { fullName: 'Maria Souza', evilField: 'DROP ME' },
          conditions: [{ name: 'Diabetes', code: 'E11' }],
          unknownSection: { hack: true },
        },
      },
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });

    const created = (repository.createEvent as jest.Mock).mock.calls[0][0] as {
      patientSnapshot: PatientSnapshot;
    };
    const snapshot = created.patientSnapshot as unknown as Record<
      string,
      unknown
    >;

    expect(snapshot.origin).toBe('client');
    expect(snapshot.serverReceivedAt).not.toBe('2000-01-01T00:00:00.000Z');
    expect(snapshot.unknownSection).toBeUndefined();
    const patient = snapshot.patient as Record<string, unknown>;
    expect(patient.fullName).toBe('Maria Souza');
    expect(patient.evilField).toBeUndefined();
  });

  it('modo online constrói snapshot a partir da fonte autoritativa do servidor', async () => {
    await makeUseCase().execute({
      userId: 'user-1',
      input: { latitude: -23.5, longitude: -46.6 },
      idempotencyKey: KEY,
      idempotencyTtlHours: 24,
    });

    expect(repository.buildSnapshotSource).toHaveBeenCalledWith(
      'user-1',
      undefined,
    );
    const created = (repository.createEvent as jest.Mock).mock.calls[0][0] as {
      patientSnapshot: PatientSnapshot;
    };

    expect(created.patientSnapshot.origin).toBe('server');
    expect(created.patientSnapshot.patient.fullName).toBe('Maria Souza');
    expect(created.patientSnapshot.medications[0].frequency).toBe('2x ao dia');
  });

  it('recusa coordenadas incompletas (latitude sem longitude)', async () => {
    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: { latitude: 10 },
        idempotencyKey: KEY,
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow();
    expect(store.execute).not.toHaveBeenCalled();
  });

  it('recusa latitude fora do intervalo', async () => {
    await expect(
      makeUseCase().execute({
        userId: 'user-1',
        input: { latitude: 999, longitude: 0 },
        idempotencyKey: KEY,
        idempotencyTtlHours: 24,
      }),
    ).rejects.toThrow();
    expect(store.execute).not.toHaveBeenCalled();
  });
});
