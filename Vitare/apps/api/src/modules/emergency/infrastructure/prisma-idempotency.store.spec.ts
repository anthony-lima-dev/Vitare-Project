/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma } from '../../../../generated/prisma/client';
import {
  IdempotencyInProgressError,
  IdempotencyPayloadMismatchError,
} from '../../../common/errors/domain-error';
import { PrismaIdempotencyStore } from './prisma-idempotency.store';

function uniqueError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('unique violation', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

interface FakeTx {
  idempotencyRecord: {
    create: jest.Mock;
    update: jest.Mock;
  };
}

function makePrisma() {
  const tx: FakeTx = {
    idempotencyRecord: { create: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((cb: (t: FakeTx) => unknown) =>
      Promise.resolve(cb(tx)),
    ),
    idempotencyRecord: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { prisma, tx };
}

describe('PrismaIdempotencyStore', () => {
  const input = {
    userId: 'u-1',
    scope: 'emergency.trigger',
    key: 'k-1',
    requestHash: 'hash-a',
    ttlHours: 24,
  };

  it('executa a operação UMA vez e marca o registro como COMPLETED', async () => {
    const { prisma, tx } = makePrisma();
    const store = new PrismaIdempotencyStore(prisma as never);
    tx.idempotencyRecord.create.mockResolvedValueOnce({});
    tx.idempotencyRecord.update.mockResolvedValueOnce({});

    const operation = jest.fn().mockResolvedValue({ id: 'ev-1' });
    const handle = await store.execute(input, operation);

    expect(handle.replay).toBe(false);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(tx.idempotencyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('repetição com o mesmo payload → replay SEM executar de novo', async () => {
    const { prisma, tx } = makePrisma();
    const store = new PrismaIdempotencyStore(prisma as never);
    tx.idempotencyRecord.create.mockRejectedValueOnce(uniqueError());
    prisma.idempotencyRecord.findUnique.mockResolvedValueOnce({
      status: 'COMPLETED',
      requestHash: 'hash-a',
      responsePayload: { id: 'ev-9' },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const operation = jest.fn();
    const handle = await store.execute(input, operation);

    expect(handle.replay).toBe(true);
    expect(handle.result).toEqual({ id: 'ev-9' });
    expect(operation).not.toHaveBeenCalled();
  });

  it('mesma chave com payload divergente → 409 (payload mismatch)', async () => {
    const { prisma, tx } = makePrisma();
    const store = new PrismaIdempotencyStore(prisma as never);
    tx.idempotencyRecord.create.mockRejectedValueOnce(uniqueError());
    prisma.idempotencyRecord.findUnique.mockResolvedValueOnce({
      status: 'COMPLETED',
      requestHash: 'hash-OUTRO',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(store.execute(input, jest.fn())).rejects.toThrow(
      IdempotencyPayloadMismatchError,
    );
  });

  it('operação concorrente em andamento → 409 após uma espera', async () => {
    const { prisma, tx } = makePrisma();
    const store = new PrismaIdempotencyStore(prisma as never);
    tx.idempotencyRecord.create.mockRejectedValueOnce(uniqueError());
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      status: 'IN_PROGRESS',
      requestHash: 'hash-a',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(store.execute(input, jest.fn())).rejects.toThrow(
      IdempotencyInProgressError,
    );
  });
});
