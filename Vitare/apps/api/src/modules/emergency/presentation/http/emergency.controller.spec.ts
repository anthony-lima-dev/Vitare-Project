import { EmergencyController } from './emergency.controller';
import { EmergencyService } from '../../application/emergency.service';
import { TriggerEmergencyDto } from './dto/trigger-emergency.dto';

/**
 * Contrato HTTP do acionamento: o header x-idempotency-key é obrigatório
 * (finding 5.1). Sem a chave, o controlador NUNCA repassa ao use case.
 */
describe('EmergencyController', () => {
  let service: {
    trigger: jest.Mock;
    findAllByUser: jest.Mock;
    findManyByUser: jest.Mock;
  };
  let controller: EmergencyController;
  const user = { id: 'user-1' } as never;
  const VALID_KEY = '0f8d2a9e-1111-4222-8333-444455556666';

  beforeEach(() => {
    service = {
      trigger: jest.fn(),
      findAllByUser: jest.fn(),
      findManyByUser: jest.fn(),
    };
    controller = new EmergencyController(
      service as unknown as EmergencyService,
    );
  });

  it('rejeita acionamento sem chave de idempotência', async () => {
    const dto = new TriggerEmergencyDto();
    await expect(controller.trigger(user, dto, undefined)).rejects.toThrow();
    expect(service.trigger).not.toHaveBeenCalled();
  });

  it('rejeita acionamento com chave vazia', async () => {
    const dto = new TriggerEmergencyDto();
    await expect(controller.trigger(user, dto, '')).rejects.toThrow();
    expect(service.trigger).not.toHaveBeenCalled();
  });

  it('encaminha a chave do header ao caso de uso e devolve o evento', async () => {
    const dto = new TriggerEmergencyDto();
    service.trigger.mockResolvedValue({
      event: { id: 'event-1', status: 'TRIGGERED' },
      replay: false,
    });

    const response = await controller.trigger(user, dto, VALID_KEY);

    expect(service.trigger).toHaveBeenCalledWith('user-1', dto, VALID_KEY);
    expect(response.idempotentReplay).toBe(false);
    expect(response.id).toBe('event-1');
  });

  it('marca respostas de replay idempotente', async () => {
    const dto = new TriggerEmergencyDto();
    service.trigger.mockResolvedValue({
      event: { id: 'event-1', status: 'TRIGGERED' },
      replay: true,
    });

    const response = await controller.trigger(user, dto, VALID_KEY);
    expect(response.idempotentReplay).toBe(true);
  });

  it('lista o histórico do paciente autenticado', async () => {
    service.findManyByUser.mockResolvedValue({ items: [], nextCursor: null });
    await controller.findAll(user);
    expect(service.findManyByUser).toHaveBeenCalledWith('user-1', {});
  });
});
