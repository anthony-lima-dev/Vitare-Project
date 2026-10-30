// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { ResolveEmergencyUseCase } from './resolve-emergency.use-case';
import {
  OperationForbiddenError,
  ResourceNotFoundError,
} from '../../../common/errors/domain-error';
import { EmergencyStatus } from '../domain/emergency-status';
import type {
  EmergencyEventRecord,
  EmergencyRepositoryPort,
} from './ports/emergency-ports';

function makeEvent(
  overrides: Partial<EmergencyEventRecord> = {},
): EmergencyEventRecord {
  return {
    id: 'event-1',
    userId: 'user-1',
    triggeredAt: new Date(),
    latitude: null,
    longitude: null,
    patientSnapshot: { patient: { fullName: 'Segredo Clínico' } },
    status: EmergencyStatus.ACCEPTED,
    notes: null,
    assignedStaffId: 'staff-1',
    acceptedAt: new Date(),
    resolvedAt: null,
    ...overrides,
  };
}

/**
 * Finding 5.4 — o retorno idempotente de evento RESOLVED NUNCA pode
 * anteceder a checagem de autorização: profissional não atribuído que chama
 * resolve em evento já encerrado recebe OperationForbiddenError, não os
 * dados do evento.
 */
describe('ResolveEmergencyUseCase', () => {
  let repository: EmergencyRepositoryPort;
  let useCase: ResolveEmergencyUseCase;

  beforeEach(() => {
    repository = {
      buildSnapshotSource: jest.fn(),
      createEvent: jest.fn(),
      findById: jest.fn(),
      findAllByUser: jest.fn(),
      findManyByUser: jest
        .fn()
        .mockResolvedValue({ items: [], nextCursor: null }),
      transitionIfCurrent: jest.fn(),
      markNotifiedIfCurrent: jest.fn(),
    };
    useCase = new ResolveEmergencyUseCase(repository);
  });

  it('BLOQUEIA profissional não atribuído mesmo em evento já RESOLVED (regressão 5.4)', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.RESOLVED,
        assignedStaffId: 'staff-1',
      }),
    );

    await expect(useCase.execute('event-1', 'staff-intruso')).rejects.toThrow(
      OperationForbiddenError,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).not.toHaveBeenCalled();
  });

  it('permite resultado idempotente ao profissional atribuído em evento já RESOLVED', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.RESOLVED,
        assignedStaffId: 'staff-1',
        resolvedAt: new Date(),
      }),
    );

    const result = await useCase.execute('event-1', 'staff-1');

    expect(result.id).toBe('event-1');
    expect(result.status).toBe(EmergencyStatus.RESOLVED);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).not.toHaveBeenCalled();
  });

  it('não expõe snapshot clínico no resultado de encerramento', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.RESOLVED,
        assignedStaffId: 'staff-1',
      }),
    );

    const result = (await useCase.execute(
      'event-1',
      'staff-1',
    )) as unknown as Record<string, unknown>;

    expect(result.patientSnapshot).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });

  it('encerra evento ACCEPTED atribuído com transição condicional', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(makeEvent());
    (repository.transitionIfCurrent as jest.Mock).mockResolvedValue(
      makeEvent({ status: EmergencyStatus.RESOLVED, resolvedAt: new Date() }),
    );

    const result = await useCase.execute('event-1', 'staff-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).toHaveBeenCalledWith(
      'event-1',
      [EmergencyStatus.ACCEPTED],
      EmergencyStatus.RESOLVED,
      {},
    );
    expect(result.status).toBe(EmergencyStatus.RESOLVED);
  });

  it('bloqueia profissional não atribuído em evento ainda aberto', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({ assignedStaffId: 'staff-2' }),
    );

    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      OperationForbiddenError,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).not.toHaveBeenCalled();
  });

  it('bloqueia evento sem profissional atribuído', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({ assignedStaffId: null }),
    );

    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      OperationForbiddenError,
    );
  });

  it('recusa incidente inexistente', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);
    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
