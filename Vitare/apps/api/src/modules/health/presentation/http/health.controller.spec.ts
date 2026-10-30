import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from '../../application/health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const mockHealth = {
    getLiveness: jest.fn(() => ({ status: 'ok', timestamp: 'now' })),
    getStarted: jest.fn(() => ({ status: 'ok', timestamp: 'now' })),
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealth }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('liveness não consulta dependências', () => {
    const result = controller.check();
    expect(result).toEqual({ status: 'ok', timestamp: 'now' });
    expect(mockHealth.getReadiness).not.toHaveBeenCalled();
  });

  it('readiness 200 quando tudo ok', async () => {
    mockHealth.getReadiness.mockResolvedValueOnce({
      status: 'ok',
      timestamp: 'now',
      checks: { postgresql: { status: 'ok' }, redis: { status: 'ok' } },
    });
    const status = jest.fn().mockReturnValue({ json: jest.fn() });
    await controller.ready({ status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(200);
  });

  it('readiness 503 quando PostgreSQL cai', async () => {
    mockHealth.getReadiness.mockResolvedValueOnce({
      status: 'unavailable',
      timestamp: 'now',
      checks: { postgresql: { status: 'error' }, redis: { status: 'ok' } },
    });
    const status = jest.fn().mockReturnValue({ json: jest.fn() });
    await controller.ready({ status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(503);
  });
});
