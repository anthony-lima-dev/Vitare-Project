import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from '../../application/patients.service';

describe('PatientsController', () => {
  let controller: PatientsController;
  const mockService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [{ provide: PatientsService, useValue: mockService }],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
  });

  it('getProfile usa apenas o id autenticado', async () => {
    mockService.getProfile.mockResolvedValueOnce({ id: 'u-1' });
    await controller.getProfile({ id: 'u-1', email: 'a@b.co' });
    expect(mockService.getProfile).toHaveBeenCalledWith('u-1');
  });

  it('updateProfile não permite alterar o dono do perfil', async () => {
    mockService.updateProfile.mockResolvedValueOnce({ id: 'u-1' });
    await controller.updateProfile(
      { id: 'u-1', email: 'a@b.co' },
      { fullName: 'Novo Nome' },
    );
    expect(mockService.updateProfile).toHaveBeenCalledWith('u-1', {
      fullName: 'Novo Nome',
    });
  });
});
