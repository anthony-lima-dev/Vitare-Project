// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaEmergencyRepository } from './prisma-emergency.repository';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';

describe('PrismaEmergencyRepository pagination', () => {
  let repo: PrismaEmergencyRepository;
  let prismaMock: Partial<PrismaService>;

  beforeEach(async () => {
    prismaMock = {
      emergencyEvent: {
        findMany: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaEmergencyRepository,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: PiiEncryptionService,
          useValue: { decrypt: jest.fn((v) => v) },
        },
      ],
    }).compile();

    repo = module.get(PrismaEmergencyRepository);
  });

  it('returns items and nextCursor when more pages', async () => {
    const fakeEvents = Array.from({ length: 21 }, (_, i) => ({
      id: `evt-${i}`,
      userId: 'user-1',
      triggeredAt: new Date(Date.now() + i * 1000),
      latitude: null,
      longitude: null,
      patientSnapshot: null,
      patientSnapshotEnc: null,
      status: 'TRIGGERED',
      notes: null,
      notesEnc: null,
      assignedStaffId: null,
      acceptedAt: null,
      resolvedAt: null,
    }));
    (prismaMock.emergencyEvent.findMany as jest.Mock).mockResolvedValue(
      fakeEvents,
    );

    const result = await repo.findManyByUser('user-1', {
      take: 20,
      orderBy: { createdAt: 'asc', id: 'asc' },
    });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe('evt-19');
  });

  it('returns null nextCursor when no more pages', async () => {
    const fakeEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `evt-${i}`,
      userId: 'user-1',
      triggeredAt: new Date(Date.now() + i * 1000),
      latitude: null,
      longitude: null,
      patientSnapshot: null,
      patientSnapshotEnc: null,
      status: 'TRIGGERED',
      notes: null,
      notesEnc: null,
      assignedStaffId: null,
      acceptedAt: null,
      resolvedAt: null,
    }));
    (prismaMock.emergencyEvent.findMany as jest.Mock).mockResolvedValue(
      fakeEvents,
    );

    const result = await repo.findManyByUser('user-1', { take: 20 });
    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });
});
