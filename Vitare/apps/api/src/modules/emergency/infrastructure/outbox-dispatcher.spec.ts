// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { Test, TestingModule } from '@nestjs/testing';
import { OutboxDispatcher } from './outbox-dispatcher';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { EmergencyGateway } from '../presentation/emergency.gateway';
import { RedisService } from '../../../infra/redis/redis.service';
import { EMERGENCY_REPOSITORY } from '../application/ports/emergency-ports';

describe('OutboxDispatcher', () => {
  let dispatcher: OutboxDispatcher;
  let prismaMock: Partial<PrismaService>;
  let gatewayMock: Partial<EmergencyGateway>;
  let redisMock: Partial<RedisService>;
  let repoMock: any;

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn(),
      outboxEvent: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    gatewayMock = {
      publishOperationalEvent: jest.fn(),
    };
    redisMock = {
      isEnabled: true,
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    };
    repoMock = {
      markNotifiedIfCurrent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxDispatcher,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmergencyGateway, useValue: gatewayMock },
        { provide: RedisService, useValue: redisMock },
        { provide: EMERGENCY_REPOSITORY, useValue: repoMock },
      ],
    }).compile();

    dispatcher = module.get(OutboxDispatcher);
  });

  it('acquires lock before publishing and releases after', async () => {
    const event = {
      id: 'evt-1',
      type: 'emergency.triggered',
      payload: { id: 'emg-1' },
    };
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb(prismaMock),
    );
    (prismaMock.outboxEvent.findMany as jest.Mock).mockResolvedValue([event]);
    (prismaMock.outboxEvent.update as jest.Mock).mockResolvedValue({});

    await (dispatcher as any).flushOnce();

    expect(redisMock.acquireLock).toHaveBeenCalledWith(
      'outbox:lock:evt-1',
      expect.any(String),
      5000,
    );
    expect(gatewayMock.publishOperationalEvent).toHaveBeenCalledWith(
      'emergency.triggered',
      expect.objectContaining({ id: 'emg-1', eventId: 'evt-1' }),
    );
    expect(redisMock.releaseLock).toHaveBeenCalled();
  });

  it('skips publishing if lock not acquired', async () => {
    (redisMock.acquireLock as jest.Mock).mockResolvedValueOnce(false);
    const event = {
      id: 'evt-2',
      type: 'emergency.triggered',
      payload: { id: 'emg-2' },
    };
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb(prismaMock),
    );
    (prismaMock.outboxEvent.findMany as jest.Mock).mockResolvedValue([event]);

    await (dispatcher as any).flushOnce();

    expect(gatewayMock.publishOperationalEvent).not.toHaveBeenCalled();
  });
});
