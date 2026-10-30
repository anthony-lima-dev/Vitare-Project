import { Test, TestingModule } from '@nestjs/testing';
import { AllergiesController } from './allergies.controller';
import { AllergiesService } from '../../application/allergies.service';

describe('AllergiesController', () => {
  let controller: AllergiesController;
  const mockService = {
    findAllByUser: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllergiesController],
      providers: [{ provide: AllergiesService, useValue: mockService }],
    }).compile();

    controller = module.get<AllergiesController>(AllergiesController);
  });

  it('lista somente alergias do usuário autenticado', async () => {
    mockService.findAllByUser.mockResolvedValueOnce([]);
    await controller.findAll({ id: 'user-1', email: 'a@b.co' });
    expect(mockService.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('cria alergia vinculada ao usuário autenticado', async () => {
    mockService.create.mockResolvedValueOnce({ id: 'al-1' });
    await controller.create(
      { id: 'user-1', email: 'a@b.co' },
      {
        name: 'Penicilina',
      },
    );
    expect(mockService.create).toHaveBeenCalledWith('user-1', {
      name: 'Penicilina',
    });
  });
});
