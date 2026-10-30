import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { StaffAuthService, AuthMethod } from './staff-auth.service';
import { StaffRepository } from '../domain/repositories/staff.repository';
import type { LegalActInput } from '../../../modules/legal/domain/entities/legal-act.entity';
import { LegalActService } from '../../../modules/legal/application/legal-act.service';
import { hashPassword } from '../../../common/utils/hash.util';

describe('StaffAuthService', () => {
  let service: StaffAuthService;

  const mockStaffRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createFirstStaff: jest.fn(),
  };
  const mockJwtService = { sign: jest.fn(() => 'staff-token') };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'STAFF_JWT_SECRET') return 'staff-secret';
      if (key === 'STAFF_JWT_EXPIRES_IN') return '2h';
      if (key === 'STAFF_BOOTSTRAP_KEY') return 'bootstrap-key-123';
      if (key === 'LEGAL.requiredDocuments')
        return [
          {
            actType: 'TERMS_OF_USE',
            version: 'v1.0.0',
            contentHash: 'sha256:terms-v1',
          },
          {
            actType: 'PRIVACY_NOTICE',
            version: 'v1.0.0',
            contentHash: 'sha256:privacy-v1',
          },
        ];
      return undefined;
    }),
  };
  const mockLegalActService = {
    validateOnboardingAcceptance: jest.fn().mockResolvedValue(undefined),
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

  const dto = {
    fullName: 'Maria',
    email: 'maria@hospital.org',
    cpf: '12345678901',
    registrationNumber: 'CRM-1234',
    role: 'MEDICO_SOCORRISTA',
    password: 'Senha1!',
  };

  beforeEach(async () => {
    // resetAllMocks limpa também filas de mockResolvedValueOnce, evitando
    // que um teste afete o seguinte (o que ocorria entre login e provisionamento).
    jest.resetAllMocks();
    // resetAllMocks também remove implementações — restaura as respostas
    // padrão dos mocks de JwtService e ConfigService (composição do teste).
    mockJwtService.sign.mockImplementation(() => 'staff-token');
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'STAFF_JWT_SECRET') return 'staff-secret';
      if (key === 'STAFF_JWT_EXPIRES_IN') return '2h';
      if (key === 'STAFF_BOOTSTRAP_KEY') return 'bootstrap-key-123';
      if (key === 'LEGAL.requiredDocuments')
        return [
          {
            actType: 'TERMS_OF_USE',
            version: 'v1.0.0',
            contentHash: 'sha256:terms-v1',
          },
          {
            actType: 'PRIVACY_NOTICE',
            version: 'v1.0.0',
            contentHash: 'sha256:privacy-v1',
          },
        ];
      return undefined;
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffAuthService,
        { provide: StaffRepository, useValue: mockStaffRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LegalActService, useValue: mockLegalActService },
      ],
    }).compile();

    service = module.get<StaffAuthService>(StaffAuthService);
  });

  describe('checkRealm', () => {
    it('retorna OAUTH_GOOGLE para e-mail @gmail.com', async () => {
      const result = await service.checkRealm('usuario@gmail.com');
      expect(result).toEqual({
        email: 'usuario@gmail.com',
        authMethod: AuthMethod.OAUTH_GOOGLE,
      });
      expect(mockStaffRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna OAUTH_GOOGLE para e-mail @googlemail.com', async () => {
      const result = await service.checkRealm('usuario@googlemail.com');
      expect(result).toEqual({
        email: 'usuario@googlemail.com',
        authMethod: AuthMethod.OAUTH_GOOGLE,
      });
      expect(mockStaffRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna LOCAL para e-mail @hotmail.com não cadastrado (sem vínculo OAuth no model Staff)', async () => {
      const result = await service.checkRealm('usuario@hotmail.com');
      expect(result).toEqual({
        email: 'usuario@hotmail.com',
        authMethod: AuthMethod.LOCAL,
      });
      expect(mockStaffRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna LOCAL para e-mail corporativo (o model Staff não vincula googleId)', async () => {
      const result = await service.checkRealm('usuario@hospital.org');
      expect(result).toEqual({
        email: 'usuario@hospital.org',
        authMethod: AuthMethod.LOCAL,
      });
      expect(mockStaffRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('provisionamento', () => {
    it('registro com staff existente exige ADMINISTRATIVO autenticado', async () => {
      mockStaffRepository.count.mockResolvedValueOnce(3);
      await expect(
        service.register(
          dto.fullName,
          dto.email,
          dto.cpf,
          dto.registrationNumber,
          dto.role,
          dto.password,
          { bootstrapKey: 'bootstrap-key-123' },
          legalActs,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockStaffRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita provisionamento de staff sem aceite obrigatório', async () => {
      mockLegalActService.validateOnboardingAcceptance.mockImplementationOnce(
        () => {
          throw new BadRequestException('aceite obrigatório');
        },
      );
      await expect(
        service.register(
          dto.fullName,
          dto.email,
          dto.cpf,
          dto.registrationNumber,
          dto.role,
          dto.password,
          { actor: { id: 'admin-1', role: 'ADMINISTRATIVO' } },
          [],
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockStaffRepository.create).not.toHaveBeenCalled();
      expect(
        mockLegalActService.validateOnboardingAcceptance,
      ).toHaveBeenCalledWith([]);
    });

    it('rejeita aceite de versão antiga na provisão de staff', async () => {
      mockLegalActService.validateOnboardingAcceptance.mockImplementationOnce(
        () => {
          throw new BadRequestException('versão antiga');
        },
      );
      const oldActs: LegalActInput[] = [
        {
          actType: 'TERMS_OF_USE',
          documentVersion: 'v0.9.0',
          contentHash: 'sha256:terms-old',
        },
        {
          actType: 'PRIVACY_NOTICE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:privacy-v1',
        },
      ];
      await expect(
        service.register(
          dto.fullName,
          dto.email,
          dto.cpf,
          dto.registrationNumber,
          dto.role,
          dto.password,
          { actor: { id: 'admin-1', role: 'ADMINISTRATIVO' } },
          oldActs,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockStaffRepository.create).not.toHaveBeenCalled();
    });

    it('bootstrap sem chave → 403 (não cria conta privilegiada)', async () => {
      mockStaffRepository.count.mockResolvedValueOnce(0);
      await expect(
        service.register(
          dto.fullName,
          dto.email,
          dto.cpf,
          dto.registrationNumber,
          dto.role,
          dto.password,
          undefined,
          legalActs,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockStaffRepository.createFirstStaff).not.toHaveBeenCalled();
    });

    it('bootstrap com chave válida → cria a primeira conta e atos jurídicos via createFirstStaff', async () => {
      mockStaffRepository.count.mockResolvedValueOnce(0);
      mockStaffRepository.createFirstStaff.mockResolvedValueOnce({
        id: 's-1',
        ...dto,
        passwordHash: 'hash',
      });
      const result = await service.register(
        dto.fullName,
        dto.email,
        dto.cpf,
        dto.registrationNumber,
        dto.role,
        dto.password,
        { bootstrapKey: 'bootstrap-key-123' },
        legalActs,
      );
      expect(mockStaffRepository.count).toHaveBeenCalled();
      expect(mockStaffRepository.createFirstStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          cpf: dto.cpf,
          legalActs,
        }),
      );
      expect(mockStaffRepository.create).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('staff-token');
    });

    it('ADMINISTRATIVO autenticado provisiona novos profissionais com atos jurídicos', async () => {
      mockStaffRepository.count.mockResolvedValueOnce(5);
      mockStaffRepository.findByEmail.mockResolvedValueOnce(null);
      mockStaffRepository.create.mockResolvedValueOnce({ id: 's-2', ...dto });
      await service.register(
        dto.fullName,
        dto.email,
        dto.cpf,
        dto.registrationNumber,
        dto.role,
        dto.password,
        { actor: { id: 'admin-1', role: 'ADMINISTRATIVO' } },
        legalActs,
      );
      expect(mockStaffRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, legalActs }),
      );
    });
  });

  describe('login', () => {
    it('credenciais inválidas → 401', async () => {
      mockStaffRepository.findByEmail.mockResolvedValueOnce(null);
      await expect(service.login('x@x.br', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('credenciais válidas → token emitido', async () => {
      const passwordHash = await hashPassword('Senha1!');
      mockStaffRepository.findByEmail.mockResolvedValueOnce({
        id: 's-3',
        passwordHash,
        fullName: 'Maria',
        email: dto.email,
        cpf: dto.cpf,
        registrationNumber: dto.registrationNumber,
        role: dto.role,
      });
      const result = await service.login(dto.email, 'Senha1!');
      expect(result.accessToken).toBe('staff-token');
    });
  });
});
