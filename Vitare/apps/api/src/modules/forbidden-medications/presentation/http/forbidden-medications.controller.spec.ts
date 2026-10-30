import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenMedicationsController } from './forbidden-medications.controller';
import { ForbiddenMedicationsService } from '../../application/forbidden-medications.service';

describe('ForbiddenMedicationsController', () => {
  let controller: ForbiddenMedicationsController;
  const mockService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForbiddenMedicationsController],
      providers: [
        { provide: ForbiddenMedicationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ForbiddenMedicationsController>(
      ForbiddenMedicationsController,
    );
  });

  it('cria restrição vinculada ao usuário autenticado', async () => {
    mockService.create.mockResolvedValueOnce({ id: 'fm-1' });
    await controller.create(
      { id: 'user-1', email: 'a@b.co' },
      {
        medicationsDictionaryId: 'med-1',
        reason: 'Contraindicado pelo ITU.',
      },
    );
    expect(mockService.create).toHaveBeenCalledWith('user-1', {
      medicationsDictionaryId: 'med-1',
      reason: 'Contraindicado pelo ITU.',
    });
  });
});
