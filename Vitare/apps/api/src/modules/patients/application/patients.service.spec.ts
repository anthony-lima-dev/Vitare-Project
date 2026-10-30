import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PatientsRepository } from '../domain/repositories/patients.repository';
import { LegalActService } from '../../legal/application/legal-act.service';
import type { LegalActInput } from '../../legal/domain/entities/legal-act.entity';

describe('PatientsService', () => {
  let service: PatientsService;

  const mockPatientsRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const mockLegalActService = {
    validateOnboardingAcceptance: jest.fn().mockResolvedValue(undefined),
    hasCurrentAcceptance: jest.fn().mockResolvedValue(true),
  };

  const legalActs: LegalActInput[] = [
    {
      actType: 'TERMS_OF_USE',
      documentVersion: 'v1.0.0',
      contentHash: 'sha256:terms-v1',
    },
    {
      actType: 'PRIVACY_NOTICE',
      documentVersion: 'v1.0.0',
      contentHash: 'sha256:privacy-v1',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PatientsRepository, useValue: mockPatientsRepository },
        { provide: LegalActService, useValue: mockLegalActService },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('primeiro acesso: grava aceites na mesma transação da atualização do perfil', async () => {
    mockPatientsRepository.update.mockResolvedValueOnce({ id: 'u-1' } as any);
    await expect(
      service.updateProfile('u-1', {
        cpf: '12345678901',
        phone: '(11) 91234-5678',
        address: 'Rua X, 1',
        birthDate: '1990-01-01',
        bloodType: 'O+',
        legalActs,
      }),
    ).resolves.toBeDefined();
    expect(mockPatientsRepository.update).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ legalActs }),
    );
    expect(
      mockLegalActService.validateOnboardingAcceptance,
    ).toHaveBeenCalledWith(legalActs);
  });

  it('primeiro acesso: sem aceite vigente na base, bloqueia a atualização do perfil', async () => {
    mockLegalActService.hasCurrentAcceptance.mockResolvedValueOnce(false);
    await expect(
      service.updateProfile('u-1', { cpf: '12345678901' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPatientsRepository.update).not.toHaveBeenCalled();
  });

  it('primeiro acesso: com aceite vigente na base, atualiza sem exigir novos aceites', async () => {
    mockLegalActService.hasCurrentAcceptance.mockResolvedValueOnce(true);
    mockPatientsRepository.update.mockResolvedValueOnce({ id: 'u-1' } as any);
    await expect(
      service.updateProfile('u-1', { cpf: '12345678901' }),
    ).resolves.toBeDefined();
    expect(mockPatientsRepository.update).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ cpf: '12345678901' }),
    );
  });
});
