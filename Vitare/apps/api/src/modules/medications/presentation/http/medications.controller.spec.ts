import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from '../../application/medications.service';

describe('MedicationsController', () => {
  let controller: MedicationsController;
  const mockService = {
    findAllActiveByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationsController],
      providers: [{ provide: MedicationsService, useValue: mockService }],
    }).compile();

    controller = module.get<MedicationsController>(MedicationsController);
  });

  it('lista apenas medicamentos ativos do usuário autenticado', async () => {
    mockService.findAllActiveByUser.mockResolvedValueOnce([]);
    await controller.findAll({ id: 'u-1', email: 'a@b.co' });
    expect(mockService.findAllActiveByUser).toHaveBeenCalledWith('u-1');
  });

  it('update encaminha o id do usuário para a checagem de posse', async () => {
    mockService.update.mockResolvedValueOnce({ id: 'm-1' });
    await controller.update(
      'b2a1c111-1111-4111-8111-111111111111',
      { id: 'u-1', email: 'a@b.co' },
      { dosage: '500mg' },
    );
    expect(mockService.update).toHaveBeenCalledWith(
      'b2a1c111-1111-4111-8111-111111111111',
      'u-1',
      { dosage: '500mg' },
    );
  });
});
