import { Test, TestingModule } from '@nestjs/testing';
import { ConditionsService } from './conditions.service';
import { ConditionsRepository } from '../domain/repositories/conditions.repository';

describe('ConditionsService', () => {
  let service: ConditionsService;

  const mockConditionsRepository = {
    findAllActiveByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionsService,
        { provide: ConditionsRepository, useValue: mockConditionsRepository },
      ],
    }).compile();

    service = module.get<ConditionsService>(ConditionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
