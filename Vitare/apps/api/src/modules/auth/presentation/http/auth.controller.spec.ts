import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from '../../application/auth.service';
import { GoogleAuthSessionService } from '../../application/google-auth-session.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    validateGoogleUser: jest.fn(),
  };
  const mockGoogleSession = { create: jest.fn(), consume: jest.fn() };
  const mockConfig = {
    get: (key: string) => ({ APP_URL: 'http://localhost:5173' })[key],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: GoogleAuthSessionService, useValue: mockGoogleSession },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delega ao serviço sem propagar campos arbitrários', async () => {
    mockAuthService.register.mockResolvedValueOnce({
      accessToken: 'a',
      refreshToken: 'r',
    });
    const dto = {
      fullName: 'Ana',
      email: 'ana@hotmail.com',
      password: 'Pass1!23',
    };
    await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(
      'Ana',
      'ana@hotmail.com',
      'Pass1!23',
      [],
    );
  });

  it('login emite os tokens para o usuário autenticado pela estratégia', async () => {
    mockAuthService.login.mockResolvedValueOnce({ accessToken: 'a' });
    const result = await controller.login(
      { user: { id: 'u-1' } } as never,
      {} as LoginDto,
    );
    expect(result).toEqual({ accessToken: 'a' });
  });

  it('refresh propaga o erro de rotação inválida', async () => {
    mockAuthService.refreshTokens.mockRejectedValueOnce(
      new UnauthorizedException('Refresh token inválido ou expirado'),
    );
    await expect(controller.refresh({ refreshToken: 'x' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout é idempotente sobre o refresh token apresentado', async () => {
    mockAuthService.logout.mockResolvedValueOnce(undefined);
    await expect(
      controller.logout({ refreshToken: 'x' }),
    ).resolves.toBeUndefined();
    expect(mockAuthService.logout).toHaveBeenCalledWith('x');
  });
});
