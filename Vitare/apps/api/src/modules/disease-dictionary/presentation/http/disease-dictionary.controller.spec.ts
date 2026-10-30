import { Test, TestingModule } from '@nestjs/testing';
import { DiseaseDictionaryController } from './disease-dictionary.controller';
import { DiseaseDictionaryService } from '../../application/disease-dictionary.service';

describe('DiseaseDictionaryController', () => {
  let controller: DiseaseDictionaryController;
  const mockService = { search: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiseaseDictionaryController],
      providers: [{ provide: DiseaseDictionaryService, useValue: mockService }],
    }).compile();

    controller = module.get<DiseaseDictionaryController>(
      DiseaseDictionaryController,
    );
  });

  it('delega a busca textual ao serviço', async () => {
    mockService.search.mockResolvedValueOnce([]);
    await controller.search({ search: 'diabetes' });
    expect(mockService.search).toHaveBeenCalledWith('diabetes');
  });
});
