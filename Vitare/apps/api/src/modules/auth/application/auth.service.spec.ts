import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, AuthMethod } from './auth.service';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { MAILER_PORT } from './ports/mailer.port';
import type { LegalActInput } from '../../../modules/legal/domain/entities/legal-act.entity';
import { LegalActService } from '../../../modules/legal/application/legal-act.service';
import { hashPassword } from '../../../common/utils/hash.util';

describe('AuthService', () => {
  let service: AuthService;

  const mockAuthRepository = {
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    findById: jest.fn(),
    createLocalUser: jest.fn(),
    createGoogleUser: jest.fn(),
    updatePassword: jest.fn(),
    storeRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    markPasswordResetTokenUsed: jest.fn(),
    rotateRefreshToken: jest.fn(),
    consumePasswordResetAndRotateCredentials: jest.fn(),
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

  const mockJwtService = { sign: jest.fn(() => 'signed-access-token') };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      if (key === 'LEGAL.requiredDocuments')
        return {
          TERMS_OF_USE: {
            actType: 'TERMS_OF_USE' as const,
            version: 'v1.0.0',
            contentHash: 'sha256:terms-v1',
          },
          PRIVACY_NOTICE: {
            actType: 'PRIVACY_NOTICE' as const,
            version: 'v1.0.0',
            contentHash: 'sha256:privacy-v1',
          },
        };
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const mockLegalActService = {
    validateOnboardingAcceptance: jest.fn().mockResolvedValue(undefined),
  };
  const mockEmailService = {
    sendWelcome: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LegalActService, useValue: mockLegalActService },
        { provide: MAILER_PORT, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('checkRealm', () => {
    it('retorna OAUTH_GOOGLE para e-mail @gmail.com', async () => {
      const result = await service.checkRealm('usuario@gmail.com');
      expect(result).toEqual({
        email: 'usuario@gmail.com',
        authMethod: AuthMethod.OAUTH_GOOGLE,
      });
      expect(mockAuthRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna OAUTH_GOOGLE para e-mail @googlemail.com', async () => {
      const result = await service.checkRealm('usuario@googlemail.com');
      expect(result).toEqual({
        email: 'usuario@googlemail.com',
        authMethod: AuthMethod.OAUTH_GOOGLE,
      });
      expect(mockAuthRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna LOCAL para e-mail @hotmail.com não cadastrado (proteção contra enumeração)', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      const result = await service.checkRealm('usuario@hotmail.com');
      expect(result).toEqual({
        email: 'usuario@hotmail.com',
        authMethod: AuthMethod.LOCAL,
      });
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'usuario@hotmail.com',
      );
    });

    it('retorna OAUTH_GOOGLE para e-mail corporativo cadastrado com googleId', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce({
        id: 'u-1',
        email: 'usuario@empresa.com',
        googleId: 'google-123',
      });
      const result = await service.checkRealm('usuario@empresa.com');
      expect(result).toEqual({
        email: 'usuario@empresa.com',
        authMethod: AuthMethod.OAUTH_GOOGLE,
      });
    });

    it('retorna LOCAL para e-mail corporativo cadastrado sem googleId (provedor local)', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce({
        id: 'u-2',
        email: 'usuario@empresa.com',
        googleId: null,
        passwordHash: 'hashed-password',
      });
      const result = await service.checkRealm('usuario@empresa.com');
      expect(result).toEqual({
        email: 'usuario@empresa.com',
        authMethod: AuthMethod.LOCAL,
      });
    });

    it('normaliza e-mail para lowercase e remove espaços', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      const result = await service.checkRealm('  USUARIO@HOTMAIL.COM  ');
      expect(result).toEqual({
        email: 'usuario@hotmail.com',
        authMethod: AuthMethod.LOCAL,
      });
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        'usuario@hotmail.com',
      );
    });
  });

  describe('register', () => {
    it('rejeita e-mail já cadastrado sem criar usuário', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce({ id: 'u-1' });
      await expect(
        service.register('Ana', 'ana@hotmail.com', 'Pass1!23', legalActs),
      ).rejects.toThrow('E-mail já cadastrado');
      expect(mockAuthRepository.createLocalUser).not.toHaveBeenCalled();
    });

    it('rejeita cadastro sem aceite obrigatório e não cria a conta', async () => {
      mockLegalActService.validateOnboardingAcceptance.mockImplementationOnce(
        () => {
          throw new BadRequestException('aceite obrigatório');
        },
      );
      await expect(
        service.register('Ana', 'ana@hotmail.com', 'Pass1!23', []),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.createLocalUser).not.toHaveBeenCalled();
      expect(
        mockLegalActService.validateOnboardingAcceptance,
      ).toHaveBeenCalledWith([]);
    });

    it('rejeita aceite de versão antiga e não cria a conta', async () => {
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
        service.register('Ana', 'ana@hotmail.com', 'Pass1!23', oldActs),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.createLocalUser).not.toHaveBeenCalled();
    });

    it('registra paciente e atos jurídicos quando aceite vigente é informado', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      mockAuthRepository.createLocalUser.mockResolvedValueOnce({
        id: 'u-2',
        email: 'ana@hotmail.com',
        fullName: 'Ana',
      });
      const pair = await service.register(
        'Ana',
        'ana@hotmail.com',
        'Pass1!23',
        legalActs,
      );
      expect(pair.accessToken).toBe('signed-access-token');
      expect(mockAuthRepository.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Ana',
          email: 'ana@hotmail.com',
          legalActs,
        }),
      );
      expect(mockAuthRepository.storeRefreshToken).toHaveBeenCalled();
    });

    it('re-aceite de nova versão é aceito (não sobrescreve o histórico)', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      mockAuthRepository.createLocalUser.mockResolvedValueOnce({
        id: 'u-2',
        email: 'ana@hotmail.com',
        fullName: 'Ana',
      });
      const newVersionActs: LegalActInput[] = [
        {
          actType: 'TERMS_OF_USE',
          documentVersion: 'v1.1.0',
          contentHash: 'sha256:terms-v2',
        },
        {
          actType: 'PRIVACY_NOTICE',
          documentVersion: 'v1.0.0',
          contentHash: 'sha256:privacy-v1',
        },
      ];
      // config ainda aponta v1.0.0 → nova versão é rejeitada
      mockLegalActService.validateOnboardingAcceptance.mockImplementationOnce(
        () => {
          throw new BadRequestException('versão antiga');
        },
      );
      await expect(
        service.register('Ana', 'ana@hotmail.com', 'Pass1!23', newVersionActs),
      ).rejects.toThrow(BadRequestException);

      // Após mudança de termos (config atualizada para v1.1.0), o re-aceite é válido
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LEGAL.requiredDocuments')
          return {
            TERMS_OF_USE: { version: 'v1.1.0', contentHash: 'sha256:terms-v2' },
            PRIVACY_NOTICE: {
              version: 'v1.0.0',
              contentHash: 'sha256:privacy-v1',
            },
          };
        if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      });
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      mockAuthRepository.createLocalUser.mockResolvedValueOnce({
        id: 'u-2',
        email: 'ana@hotmail.com',
        fullName: 'Ana',
      });
      const pair = await service.register(
        'Ana',
        'ana@hotmail.com',
        'Pass1!23',
        newVersionActs,
      );
      expect(pair.accessToken).toBe('signed-access-token');
    });
  });

  describe('validateGoogleUser', () => {
    const profile = {
      googleId: 'google-123',
      email: 'ana@gmail.com',
      fullName: 'Ana',
      avatarUrl: 'http://avatar',
    };

    it('usuário já cadastrado é retornado sem criar nova conta', async () => {
      mockAuthRepository.findByGoogleId.mockResolvedValueOnce({
        id: 'u-1',
        email: 'ana@gmail.com',
        googleId: 'google-123',
      });
      const result = await service.validateGoogleUser(profile);
      expect(result.id).toBe('u-1');
      expect(mockAuthRepository.createGoogleUser).not.toHaveBeenCalled();
    });

    it('novo usuário do Google sem aceite é criado (o aceite é coletado no primeiro acesso)', async () => {
      mockAuthRepository.findByGoogleId.mockResolvedValueOnce(null);
      mockAuthRepository.createGoogleUser.mockResolvedValueOnce({
        id: 'u-2',
        email: 'ana@gmail.com',
        googleId: 'google-123',
      });
      const result = await service.validateGoogleUser(profile);
      expect(result.id).toBe('u-2');
      expect(mockAuthRepository.createGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ana@gmail.com', legalActs: [] }),
      );
    });

    it('novo usuário do Google com aceite inválido não é criado', async () => {
      mockAuthRepository.findByGoogleId.mockResolvedValueOnce(null);
      mockLegalActService.validateOnboardingAcceptance.mockImplementationOnce(
        () => {
          throw new BadRequestException('versão antiga');
        },
      );
      const invalidActs: LegalActInput[] = [
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
        service.validateGoogleUser(profile, invalidActs),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.createGoogleUser).not.toHaveBeenCalled();
    });

    it('novo usuário do Google com aceite vigente cria conta e atos jurídicos', async () => {
      mockAuthRepository.findByGoogleId.mockResolvedValueOnce(null);
      mockAuthRepository.createGoogleUser.mockResolvedValueOnce({
        id: 'u-2',
        email: 'ana@gmail.com',
        googleId: 'google-123',
      });
      const result = await service.validateGoogleUser(profile, legalActs);
      expect(result.id).toBe('u-2');
      expect(mockAuthRepository.createGoogleUser).toHaveBeenCalledWith(
        expect.objectContaining({ legalActs }),
      );
    });
  });

  describe('validateCredentials', () => {
    it('retorna null quando usuário não existe', async () => {
      mockAuthRepository.findByEmail.mockResolvedValueOnce(null);
      await expect(
        service.validateCredentials('x@x.br', 's'),
      ).resolves.toBeNull();
    });

    it('valida senha com comparação bcrypt assíncrona', async () => {
      const hash = await hashPassword('Senha123!');
      mockAuthRepository.findByEmail.mockReset();
      mockAuthRepository.findByEmail.mockResolvedValue({
        id: 'u-3',
        passwordHash: hash,
      });
      await expect(
        service.validateCredentials('x@x.br', 'Senha123!'),
      ).resolves.toMatchObject({ id: 'u-3' });
      await expect(
        service.validateCredentials('x@x.br', 'errada'),
      ).resolves.toBeNull();
    });
  });

  describe('refreshTokens (rotação)', () => {
    it('rotação válida emite novo par de tokens', async () => {
      mockAuthRepository.rotateRefreshToken.mockResolvedValueOnce({
        outcome: 'rotated',
        userId: 'u-4',
      });
      mockAuthRepository.findById.mockResolvedValueOnce({
        id: 'u-4',
        email: 'bob@hotmail.com',
      });
      const pair = await service.refreshTokens('raw-token');
      expect(pair.refreshToken).not.toBe('raw-token');
      expect(pair.refreshToken).toEqual(expect.any(String));
    });

    it('reuso de token consumido → 401 (família revogada no repositório)', async () => {
      mockAuthRepository.rotateRefreshToken.mockResolvedValueOnce({
        outcome: 'reused',
      });
      await expect(service.refreshTokens('stale-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('token inexistente → 401', async () => {
      mockAuthRepository.rotateRefreshToken.mockResolvedValueOnce({
        outcome: 'not_found',
      });
      await expect(service.refreshTokens('ghost')).rejects.toThrow(
        'Refresh token inválido ou expirado',
      );
    });
  });

  describe('resetPassword', () => {
    it('token inválido/expirado/usado → erro sem trocar senha', async () => {
      mockAuthRepository.consumePasswordResetAndRotateCredentials.mockResolvedValueOnce(
        { outcome: 'invalid' },
      );
      await expect(
        service.resetPassword('bad-token', 'NewPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token válido → consumo transacional confirmado', async () => {
      mockAuthRepository.consumePasswordResetAndRotateCredentials.mockResolvedValueOnce(
        { outcome: 'consumed', userId: 'u-5' },
      );
      await expect(
        service.resetPassword('good-token', 'NewPass1!'),
      ).resolves.toBeUndefined();
      expect(
        mockAuthRepository.consumePasswordResetAndRotateCredentials,
      ).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoga o refresh token apresentado', async () => {
      await service.logout('some-token');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalled();
    });
  });
});
