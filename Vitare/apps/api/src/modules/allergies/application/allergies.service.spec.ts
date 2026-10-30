import { Test, TestingModule } from '@nestjs/testing';
import { AllergiesService } from './allergies.service';
import { AllergiesRepository } from '../domain/repositories/allergies.repository';

describe('AllergiesService', () => {
  let service: AllergiesService;

  const mockAllergiesRepository = {
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergiesService,
        { provide: AllergiesRepository, useValue: mockAllergiesRepository },
      ],
    }).compile();

    service = module.get<AllergiesService>(AllergiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
