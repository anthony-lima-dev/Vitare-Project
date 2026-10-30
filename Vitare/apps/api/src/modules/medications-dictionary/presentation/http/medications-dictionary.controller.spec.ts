import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsDictionaryController } from './medications-dictionary.controller';
import { MedicationsDictionaryService } from '../../application/medications-dictionary.service';

describe('MedicationsDictionaryController', () => {
  let controller: MedicationsDictionaryController;
  const mockService = { search: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationsDictionaryController],
      providers: [
        { provide: MedicationsDictionaryService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<MedicationsDictionaryController>(
      MedicationsDictionaryController,
    );
  });

  it('delega a busca textual ao serviço', async () => {
    mockService.search.mockResolvedValueOnce([]);
    await controller.search({ search: 'dipirona' });
    expect(mockService.search).toHaveBeenCalledWith('dipirona');
  });
});
