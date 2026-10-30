// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { AcceptEmergencyUseCase } from './accept-emergency.use-case';
import {
  AssignmentConflictError,
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
    status: EmergencyStatus.TRIGGERED,
    notes: null,
    assignedStaffId: null,
    acceptedAt: null,
    resolvedAt: null,
    ...overrides,
  };
}

/**
 * Aceitação exclusiva (finding 5.3): resultado MÍNIMO, sem snapshot clínico;
 * transição condicional — dois profissionais concorrentes, um único vencedor.
 */
describe('AcceptEmergencyUseCase', () => {
  let repository: EmergencyRepositoryPort;
  let useCase: AcceptEmergencyUseCase;

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
    useCase = new AcceptEmergencyUseCase(repository);
  });

  it('aceita incidente TRIGGERED e devolve resultado mínimo com atribuição', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(makeEvent());
    (repository.transitionIfCurrent as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.ACCEPTED,
        assignedStaffId: 'staff-1',
        acceptedAt: new Date(),
      }),
    );

    const result = await useCase.execute('event-1', 'staff-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).toHaveBeenCalledWith(
      'event-1',
      [EmergencyStatus.TRIGGERED, EmergencyStatus.NOTIFIED],
      EmergencyStatus.ACCEPTED,
      { assignedStaffId: 'staff-1' },
    );
    expect(result.id).toBe('event-1');
    expect(result.status).toBe(EmergencyStatus.ACCEPTED);
    expect(result.assignedStaffId).toBe('staff-1');
  });

  it('não expõe snapshot clínico na resposta de aceitação', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(makeEvent());
    (repository.transitionIfCurrent as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.ACCEPTED,
        assignedStaffId: 'staff-1',
      }),
    );

    const result = await useCase.execute('event-1', 'staff-1');
    const record = result as unknown as Record<string, unknown>;

    expect(record.patientSnapshot).toBeUndefined();
    expect(record.userId).toBeUndefined();
  });

  it('recusa incidente já encerrado', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.RESOLVED,
        assignedStaffId: 'staff-1',
      }),
    );

    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      AssignmentConflictError,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.transitionIfCurrent).not.toHaveBeenCalled();
  });

  it('recusa quando outro profissional já assumiu', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(
      makeEvent({
        status: EmergencyStatus.ACCEPTED,
        assignedStaffId: 'staff-2',
      }),
    );

    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      AssignmentConflictError,
    );
  });

  it('recusa quando a transição condicional perde a corrida', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(makeEvent());
    (repository.transitionIfCurrent as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      AssignmentConflictError,
    );
  });

  it('recusa incidente inexistente', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);
    await expect(useCase.execute('event-1', 'staff-1')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
