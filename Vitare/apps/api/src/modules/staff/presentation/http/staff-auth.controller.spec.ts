// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from '../../application/staff-auth.service';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';
import type { Request } from 'express';

describe('StaffAuthController', () => {
  let controller: StaffAuthController;
  const mockService = {
    register: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffAuthController],
      providers: [{ provide: StaffAuthService, useValue: mockService }],
    }).compile();

    controller = module.get<StaffAuthController>(StaffAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register encaminha o contexto de provisionamento para o serviço', async () => {
    mockService.register.mockResolvedValueOnce({ accessToken: 't' });
    await controller.register(
      {
        fullName: 'Maria',
        email: 'm@h.org',
        cpf: '12345678901',
        registrationNumber: 'CRM-1',
        role: 'MEDICO_SOCORRISTA' as never,
        password: 'Senha1!',
      },
      'bootstrap-abc',
      { user: { id: 's-0', role: 'ADMINISTRATIVO' } } as unknown as Request & {
        user?: { id: string; role: string };
      },
    );
    expect(mockService.register).toHaveBeenCalledWith(
      'Maria',
      'm@h.org',
      '12345678901',
      'CRM-1',
      'MEDICO_SOCORRISTA',
      'Senha1!',
      {
        bootstrapKey: 'bootstrap-abc',
        actor: { id: 's-0', role: 'ADMINISTRATIVO' },
      },
      [],
    );
  });

  it('login delega ao serviço', async () => {
    mockService.login.mockResolvedValueOnce({ accessToken: 't' });
    await controller.login({ email: 'm@h.org', password: 'Senha1!' });
    expect(mockService.login).toHaveBeenCalledWith('m@h.org', 'Senha1!');
  });

  describe('proteção da sessão staff (GET /staff/auth/me)', () => {
    const reflector = new Reflector();

    it('é @Public para o guard global de paciente — token de staff não seria aceito pela estratégia jwt', () => {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        StaffAuthController.prototype.me,
        StaffAuthController,
      ]);
      expect(isPublic).toBe(true);
    });

    it('permanece autenticado pelo StaffJwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        StaffAuthController.prototype.me,
      ) as unknown[];
      expect(guards).toContain(StaffJwtAuthGuard);
    });

    it('me delega ao serviço com o id do staff autenticado', async () => {
      mockService.me.mockResolvedValueOnce({ id: 's-0' });
      await controller.me({ user: { id: 's-0' } } as Request & {
        user: { id: string };
      });
      expect(mockService.me).toHaveBeenCalledWith('s-0');
    });
  });
});
