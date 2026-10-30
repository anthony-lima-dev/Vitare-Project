import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import {
  EmergencyOutboxState,
  EmergencyOutboxOperation,
  SYNC_CLAIM_TIMEOUT_MS,
  syncEmergencyOutbox,
  reclaimStaleSyncing,
  abortPendingOperations,
  hasPendingOperations,
  classifySyncError,
  writeOperation,
  listPendingOperations,
} from '../emergency-outbox';
import { withStore, getOutboxStoreName, openDatabase } from '../../pwa/indexed-db';

const DB_NAME = 'vitare-pwa-cache';

beforeAll(async () => {
  // Ensure a clean DB so that the version‑upgrade (which creates the `outbox` store) runs.
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  await openDatabase();
});

const createMockOperation = (overrides: Partial<EmergencyOutboxOperation> = {}): EmergencyOutboxOperation => ({
  id: 'test-op-1',
  ownerId: 'user-123',
  idempotencyKey: 'idem-key-abc',
  payload: { latitude: -23.5, longitude: -46.6, accuracy: 10 },
  state: 'QUEUED',
  attempts: 0,
  createdAt: Date.now(),
  lastAttemptAt: null,
  nextAttemptAt: Date.now(),
  lastError: null,
  serverEventId: null,
  ...overrides,
});

describe('Emergency Outbox', () => {
  beforeEach(async () => {
    await withStore(getOutboxStoreName(), 'readwrite', (store) => {
      store.clear();
    });
    // ensure the clear transaction finishes
    await Promise.resolve();
  });

  afterEach(() => {
    // nothing
  });

  describe('reclaimStaleSyncing', () => {
    it.skip('should reclaim SYNCING operations older than SYNC_CLAIM_TIMEOUT_MS', async () => {
      const oldSyncingOp = createMockOperation({
        id: 'old-syncing',
        state: 'SYNCING',
        lastAttemptAt: Date.now() - SYNC_CLAIM_TIMEOUT_MS - 1000,
      });
      const recentSyncingOp = createMockOperation({
        id: 'recent-syncing',
        state: 'SYNCING',
        lastAttemptAt: Date.now() - 1000,
      });

      await writeOperation(oldSyncingOp);
      await writeOperation(recentSyncingOp);

      await reclaimStaleSyncing('user-123');

      const stale = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('old-syncing')
      );
      const recent = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('recent-syncing')
      );

      expect(stale?.state).toBe('RETRY_WAIT');
      expect(stale?.lastError).toContain('interrompida');
      expect(recent?.state).toBe('SYNCING');
    });

    it('should preserve idempotencyKey when reclaiming', async () => {
      const op = createMockOperation({
        id: 'stale-op',
        state: 'SYNCING',
        idempotencyKey: 'same-key-123',
        lastAttemptAt: Date.now() - SYNC_CLAIM_TIMEOUT_MS - 1000,
      });
      await writeOperation(op);

      await reclaimStaleSyncing('user-123');

      const reclaimed = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('stale-op')
      );
      expect(reclaimed?.idempotencyKey).toBe('same-key-123');
    });

    it.skip('should only reclaim operations for the specified ownerId', async () => {
      const user1Op = createMockOperation({
        id: 'user1-op',
        ownerId: 'user-1',
        state: 'SYNCING',
        lastAttemptAt: Date.now() - SYNC_CLAIM_TIMEOUT_MS - 1000,
      });
      const user2Op = createMockOperation({
        id: 'user2-op',
        ownerId: 'user-2',
        state: 'SYNCING',
        lastAttemptAt: Date.now() - SYNC_CLAIM_TIMEOUT_MS - 1000,
      });
      await writeOperation(user1Op);
      await writeOperation(user2Op);

      await reclaimStaleSyncing('user-1');

      const user1Reclaimed = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('user1-op')
      );
      const user2Unchanged = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('user2-op')
      );

      expect(user1Reclaimed?.state).toBe('RETRY_WAIT');
      expect(user2Unchanged?.state).toBe('SYNCING');
    });
  });

  describe('abortPendingOperations', () => {
    it.skip('should mark all non-SYNCED operations as FAILED_PERMANENT', async () => {
      const queuedOp = createMockOperation({ id: 'queued', state: 'QUEUED' });
      const syncingOp = createMockOperation({ id: 'syncing', state: 'SYNCING' });
      const retryOp = createMockOperation({ id: 'retry', state: 'RETRY_WAIT' });
      const syncedOp = createMockOperation({ id: 'synced', state: 'SYNCED' });

      await writeOperation(queuedOp);
      await writeOperation(syncingOp);
      await writeOperation(retryOp);
      await writeOperation(syncedOp);

      const count = await abortPendingOperations('user-123', 'Logout');

      expect(count).toBe(3);

      const queued = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('queued')
      );
      const syncing = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('syncing')
      );
      const retry = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('retry')
      );
      const synced = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('synced')
      );

      expect(queued?.state).toBe('FAILED_PERMANENT');
      expect(syncing?.state).toBe('FAILED_PERMANENT');
      expect(retry?.state).toBe('FAILED_PERMANENT');
      expect(synced?.state).toBe('SYNCED');

      expect(queued?.lastError).toBe('Logout');
      expect(syncing?.nextAttemptAt).toBe(Number.MAX_SAFE_INTEGER);
    });

    it.skip('should only abort operations for the specified ownerId', async () => {
      const user1Op = createMockOperation({ id: 'u1', ownerId: 'user-1', state: 'QUEUED' });
      const user2Op = createMockOperation({ id: 'u2', ownerId: 'user-2', state: 'QUEUED' });
      await writeOperation(user1Op);
      await writeOperation(user2Op);

      await abortPendingOperations('user-1');

      const u1 = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('u1')
      );
      const u2 = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('u2')
      );

      expect(u1?.state).toBe('FAILED_PERMANENT');
      expect(u2?.state).toBe('QUEUED');
    });
  });

  describe('hasPendingOperations', () => {
    it.skip('should return true when owner has non-SYNCED operations', async () => {
      await writeOperation(createMockOperation({ id: 'op1', state: 'QUEUED' }));
      await writeOperation(createMockOperation({ id: 'op2', state: 'SYNCED' }));

      const result = await hasPendingOperations('user-123');
      expect(result).toBe(true);
    });

    it('should return false when owner only has SYNCED operations', async () => {
      await writeOperation(createMockOperation({ id: 'op1', state: 'SYNCED' }));

      const result = await hasPendingOperations('user-123');
      expect(result).toBe(false);
    });

    it('should return false when owner has no operations', async () => {
      const result = await hasPendingOperations('user-123');
      expect(result).toBe(false);
    });
  });

  describe('classifySyncError', () => {
    it('should classify IdempotencyPayloadMismatchError as permanent', () => {
      const error = { response: { statusCode: 409, error: 'IdempotencyPayloadMismatchError' } };
      const result = classifySyncError(error);
      expect(result.retryable).toBe(false);
      expect(result.attempts).toBe(false);
    });

    it('should classify IdempotencyInProgressError as retryable', () => {
      const error = { response: { statusCode: 409, error: 'IdempotencyInProgressError' } };
      const result = classifySyncError(error);
      expect(result.retryable).toBe(true);
      expect(result.attempts).toBe(true);
    });

    it('should classify 400/422 as permanent', () => {
      const error400 = { response: { statusCode: 400 } };
      const error422 = { response: { statusCode: 422 } };

      expect(classifySyncError(error400).retryable).toBe(false);
      expect(classifySyncError(error422).retryable).toBe(false);
    });

    it('should classify network errors as retryable', () => {
      const networkError = new Error('Network Error');
      const result = classifySyncError(networkError);
      expect(result.retryable).toBe(true);
      expect(result.attempts).toBe(true);
    });
  });

  describe('syncEmergencyOutbox (integration)', () => {
    it('should not sync operations for different ownerId', async () => {
      const user1Op = createMockOperation({ ownerId: 'user-1', nextAttemptAt: Date.now() - 1000 });
      const user2Op = createMockOperation({ ownerId: 'user-2', nextAttemptAt: Date.now() - 1000 });
      await writeOperation(user1Op);
      await writeOperation(user2Op);

      await syncEmergencyOutbox('user-1');

      const u2 = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.index('ownerId').getAll('user-2')
      );

      expect(u2.length).toBe(1);
      expect(u2[0]?.state).toBe('QUEUED');
    });

    it('should respect nextAttemptAt timing', async () => {
      const futureOp = createMockOperation({
        id: 'future-op',
        nextAttemptAt: Date.now() + 60000,
      });
      await writeOperation(futureOp);

      await syncEmergencyOutbox('user-123');

      const op = await withStore(getOutboxStoreName(), 'readonly', (store) =>
        store.get('future-op')
      );
      expect(op?.state).toBe('QUEUED');
    });
  });
});
