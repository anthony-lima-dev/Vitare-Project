import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaPatientsRepository } from './prisma-patients.repository';

describe('PrismaPatientsRepository.update', () => {
  const userRow = () => ({
    id: 'u-1', passwordHash: 'hash', googleId: null, avatarUrl: null, bloodType: 'O+',
    emailEnc: 'alice@example.com', emailBlindedIndex: 'email-index', cpfEnc: null,
    cpfBlindedIndex: null, phoneEnc: null, addressEnc: null, birthDateEnc: null,
    fullNameEnc: 'Alice Example', weightKg: new Prisma.Decimal('70.50'), heightCm: 170,
    createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  function fixture() {
    const tx = {
      legalActRecord: { create: jest.fn() },
      user: { update: jest.fn().mockImplementation(async ({ data }) => ({ ...userRow(), ...data })) },
    };
    const prisma = { user: { findUnique: jest.fn() }, $transaction: jest.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) };
    const pii = {
      encrypt: jest.fn((value: string) => value),
      decrypt: jest.fn((value: string) => value),
      blindIndex: jest.fn((value: string) => `blind:${value}`),
    };
    return { tx, repository: new PrismaPatientsRepository(prisma as never, pii as never) };
  }

  it('serializes the domain NumericValue into Prisma.Decimal', async () => {
    const { tx, repository } = fixture();
    await repository.update('u-1', {
      weightKg: { toString: () => '72.25', toNumber: () => 72.25 },
    } as never);
    const updateCall = tx.user.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }];
    const sentWeight = updateCall[0].data.weightKg;
    expect(sentWeight).toBeInstanceOf(Prisma.Decimal);
    expect(sentWeight.toString()).toBe('72.25');
  });

  it('does not include weightKg in the update when it was omitted', async () => {
    const { tx, repository } = fixture();
    await repository.update('u-1', {});
    const updateCall = tx.user.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }];
    expect(updateCall[0].data).not.toHaveProperty('weightKg');
  });
});
