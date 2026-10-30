import { Test, TestingModule } from '@nestjs/testing';
import { DiseaseDictionaryService } from './disease-dictionary.service';
import { DiseaseDictionaryRepository } from '../domain/repositories/disease-dictionary.repository';

describe('DiseaseDictionaryService', () => {
  let service: DiseaseDictionaryService;

  const mockRepository = {
    search: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiseaseDictionaryService,
        { provide: DiseaseDictionaryRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<DiseaseDictionaryService>(DiseaseDictionaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
