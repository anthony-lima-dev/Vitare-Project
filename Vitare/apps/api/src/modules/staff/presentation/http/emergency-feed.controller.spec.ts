import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmergencyFeedController } from './emergency-feed.controller';
import { EmergencyFeedRepository } from '../../domain/repositories/emergency-feed.repository';
import { AcceptEmergencyUseCase } from '../../../emergency/application/accept-emergency.use-case';
import { ResolveEmergencyUseCase } from '../../../emergency/application/resolve-emergency.use-case';
import { GetEmergencyFeedUseCase } from '../../application/get-emergency-feed.use-case';
import { UpdateStaffLocationUseCase } from '../../application/update-staff-location.use-case';
import { RedisService } from '../../../../infra/redis/redis.service';

describe('EmergencyFeedController', () => {
  let controller: EmergencyFeedController;
  const mockRepository = { findRecent: jest.fn() };
  const mockFeed = { execute: jest.fn() };
  const mockAccept = { execute: jest.fn() };
  const mockResolve = { execute: jest.fn() };
  const mockLocation = { execute: jest.fn() };
  const mockRedis = {
    key: (p: string) => `vitare:local:${p}`,
    geoAdd: jest.fn(),
    isEnabled: true,
  };
  const mockConfig = { get: () => undefined };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmergencyFeedController],
      providers: [
        { provide: GetEmergencyFeedUseCase, useValue: mockFeed },
        { provide: EmergencyFeedRepository, useValue: mockRepository },
        { provide: AcceptEmergencyUseCase, useValue: mockAccept },
        { provide: ResolveEmergencyUseCase, useValue: mockResolve },
        { provide: UpdateStaffLocationUseCase, useValue: mockLocation },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<EmergencyFeedController>(EmergencyFeedController);
  });

  it('limita a consulta ao máximo de 100 registros (delegação ao use case)', async () => {
    mockFeed.execute.mockResolvedValueOnce([]);
    await controller.findRecent('500');
    expect(mockFeed.execute).toHaveBeenCalledWith(500);
  });

  it('sem limite explícito delega com undefined (default do use case)', async () => {
    mockFeed.execute.mockResolvedValueOnce([]);
    await controller.findRecent();
    expect(mockFeed.execute).toHaveBeenCalledWith(undefined);
  });

  it('accept usa sempre o profissional autenticado', async () => {
    mockAccept.execute.mockResolvedValueOnce({ id: 'ev-1' });
    await controller.accept('b2a1c111-1111-4111-8111-111111111111', {
      user: { id: 's-1' },
    } as never);
    expect(mockAccept.execute).toHaveBeenCalledWith(
      'b2a1c111-1111-4111-8111-111111111111',
      's-1',
    );
  });

  it('resolve usa o profissional autenticado', async () => {
    mockResolve.execute.mockResolvedValueOnce({ id: 'ev-1' });
    await controller.resolve('b2a1c111-1111-4111-8111-111111111111', {
      user: { id: 's-1' },
    } as never);
    expect(mockResolve.execute).toHaveBeenCalledWith(
      'b2a1c111-1111-4111-8111-111111111111',
      's-1',
    );
  });

  it('atualização de localização delega ao use case com o MEMBRO autenticado (nunca do body)', async () => {
    mockLocation.execute.mockResolvedValueOnce(undefined);
    await controller.updateLocation({ user: { id: 's-2' } } as never, {
      latitude: -23.55,
      longitude: -46.63,
    });
    expect(mockLocation.execute).toHaveBeenCalledWith('s-2', -23.55, -46.63);
  });
});
