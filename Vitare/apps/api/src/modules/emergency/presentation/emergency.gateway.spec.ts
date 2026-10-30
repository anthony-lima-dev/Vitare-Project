// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyGateway } from './emergency.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../infra/redis/redis.service';
import { Server, Socket } from 'socket.io';

describe('EmergencyGateway', () => {
  let gateway: EmergencyGateway;
  let jwtMock: Partial<JwtService>;
  let configMock: Partial<ConfigService>;
  let redisMock: Partial<RedisService>;
  let serverMock: Partial<Server>;
  let socketMock: Partial<Socket>;

  beforeEach(async () => {
    jwtMock = {
      verifyAsync: jest.fn(),
    };
    configMock = {
      get: jest.fn((key: string) => {
        if (key === 'STAFF_JWT_SECRET') return 'secret';
        if (key === 'CORS_ORIGIN')
          return 'https://app.example.com,https://admin.example.com';
        return null;
      }),
    };
    redisMock = {
      isEnabled: true,
      isBlocked: jest.fn().mockResolvedValue(false),
      addToBlocklist: jest.fn().mockResolvedValue(undefined),
    };
    serverMock = {
      sockets: {
        sockets: new Map(),
      },
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    socketMock = {
      handshake: {
        auth: { token: 'valid.token' },
        headers: {},
      },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyGateway,
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    gateway = module.get(EmergencyGateway);
    // @ts-ignore private field
    gateway['server'] = serverMock as Server;
  });

  it('populates CORS allowlist on init', () => {
    gateway.afterInit();
    // The internal allowlist is not exported, but we can test behavior via handleConnection
    expect(configMock.get).toHaveBeenCalledWith('CORS_ORIGIN');
  });

  it('rejects connection without token', async () => {
    socketMock.handshake.auth = {};
    await gateway.handleConnection(socketMock as Socket);
    expect(socketMock.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects connection with revoked token (blocklist)', async () => {
    (redisMock.isBlocked as jest.Mock).mockResolvedValueOnce(true);
    await gateway.handleConnection(socketMock as Socket);
    expect(socketMock.disconnect).toHaveBeenCalledWith(true);
  });

  it('accepts valid staff token', async () => {
    (jwtMock.verifyAsync as jest.Mock).mockResolvedValueOnce({
      sub: 'staff-1',
      type: 'staff',
    });
    await gateway.handleConnection(socketMock as Socket);
    expect(socketMock.join).toHaveBeenCalledWith('staff');
  });
});
