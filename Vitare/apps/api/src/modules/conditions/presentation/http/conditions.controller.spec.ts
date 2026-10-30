import { Test, TestingModule } from '@nestjs/testing';
import { ConditionsController } from './conditions.controller';
import { ConditionsService } from '../../application/conditions.service';

describe('ConditionsController', () => {
  let controller: ConditionsController;
  const mockService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConditionsController],
      providers: [{ provide: ConditionsService, useValue: mockService }],
    }).compile();

    controller = module.get<ConditionsController>(ConditionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cria condição para o usuário autenticado', async () => {
    mockService.create.mockResolvedValueOnce({ id: 'c-1' });
    await controller.create(
      { id: 'user-1', email: 'a@b.co' },
      {
        diseaseId: 'd-1',
      },
    );
    expect(mockService.create).toHaveBeenCalledWith('user-1', {
      diseaseId: 'd-1',
    });
  });

  it('softDelete valida posse no serviço', async () => {
    await controller.remove('c-1', { id: 'user-1', email: 'a@b.co' });
    expect(mockService.softDelete).toHaveBeenCalledWith('c-1', 'user-1');
  });
});
