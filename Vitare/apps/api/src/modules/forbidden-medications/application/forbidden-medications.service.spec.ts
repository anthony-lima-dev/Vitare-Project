import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenMedicationsService } from './forbidden-medications.service';
import { ForbiddenMedicationsRepository } from '../domain/repositories/forbidden-medications.repository';

describe('ForbiddenMedicationsService', () => {
  let service: ForbiddenMedicationsService;

  const mockRepository = {
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForbiddenMedicationsService,
        { provide: ForbiddenMedicationsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ForbiddenMedicationsService>(
      ForbiddenMedicationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
