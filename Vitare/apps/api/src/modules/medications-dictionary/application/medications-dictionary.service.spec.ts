import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsDictionaryService } from './medications-dictionary.service';
import { MedicationsDictionaryRepository } from '../domain/repositories/medications-dictionary.repository';

describe('MedicationsDictionaryService', () => {
  let service: MedicationsDictionaryService;

  const mockRepository = {
    search: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsDictionaryService,
        { provide: MedicationsDictionaryRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<MedicationsDictionaryService>(
      MedicationsDictionaryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
