// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { ConfigService } from '@nestjs/config';
import { EmergencyService } from './emergency.service';
import { TriggerEmergencyUseCase } from './trigger-emergency.use-case';
import type { EmergencyRepositoryPort } from './ports/emergency-ports';

/**
 * Fachada de aplicação: a chave de idempotência é OBRIGATÓRIA no contrato
 * do acionamento (finding 5.1) — nunca um parâmetro opcional.
 */
describe('EmergencyService (fachada de aplicação)', () => {
  let repository: EmergencyRepositoryPort;
  let triggerUseCase: { execute: jest.Mock };
  let service: EmergencyService;

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
    triggerUseCase = { execute: jest.fn() };
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'EMERGENCY_IDEMPOTENCY_TTL_HOURS') return '24';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new EmergencyService(
      repository,
      triggerUseCase as unknown as TriggerEmergencyUseCase,
      config,
    );
  });

  it('repassa a chave de idempotência obrigatória ao use case', async () => {
    triggerUseCase.execute.mockResolvedValue({
      event: { id: 'event-1' },
      replay: false,
    });

    await service.trigger(
      'user-1',
      { latitude: -23.5, longitude: -46.6 },
      '0f8d2a9e-1111-4222-8333-444455556666',
    );

    expect(triggerUseCase.execute).toHaveBeenCalledTimes(1);
    expect(triggerUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      input: { latitude: -23.5, longitude: -46.6 },
      idempotencyKey: '0f8d2a9e-1111-4222-8333-444455556666',
      idempotencyTtlHours: 24,
    });
  });

  it('preserva o resultado de replay idempotente', async () => {
    triggerUseCase.execute.mockResolvedValue({
      event: { id: 'event-9' },
      replay: true,
    });

    const result = await service.trigger(
      'user-1',
      {},
      '0f8d2a9e-1111-4222-8333-444455556666',
    );

    expect(result.event.id).toBe('event-9');
    expect(result.replay).toBe(true);
  });

  it('lista o histórico apenas do usuário autenticado', async () => {
    (repository.findAllByUser as jest.Mock).mockResolvedValue([]);
    await service.findAllByUser('user-1');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock method
    expect(repository.findAllByUser).toHaveBeenCalledWith('user-1');
  });
});
