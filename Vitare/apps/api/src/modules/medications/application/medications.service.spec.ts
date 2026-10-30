import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsService } from './medications.service';
import { MedicationsRepository } from '../domain/repositories/medications.repository';

describe('MedicationsService', () => {
  let service: MedicationsService;

  const mockMedicationsRepository = {
    findAllActiveByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findHistoryByMedication: jest.fn(),
    recordHistoryEntries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        { provide: MedicationsRepository, useValue: mockMedicationsRepository },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
