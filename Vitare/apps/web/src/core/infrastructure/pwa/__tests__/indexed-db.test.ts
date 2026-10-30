import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  putIndexedDbCache,
  getIndexedDbCache,
  deleteIndexedDbCache,
  clearIndexedDbScope,
  IndexedDbCacheRecord,
} from '../indexed-db';
import { withStore } from '../indexed-db';

describe('IndexedDB Cache', () => {
  beforeEach(async () => {
    await withStore('responses', 'readwrite', (store) => store.clear());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createRecord = (overrides: Partial<IndexedDbCacheRecord> = {}): IndexedDbCacheRecord => ({
    key: 'test-key',
    scope: 'user-123',
    url: '/api/test',
    storedAt: Date.now(),
    expiresAt: Date.now() + 60000,
    data: { test: 'data' },
    ...overrides,
  });

  describe('putIndexedDbCache / getIndexedDbCache', () => {
    it('should store and retrieve a record', async () => {
      const record = createRecord();
      await putIndexedDbCache(record);

      const retrieved = await getIndexedDbCache(record.key);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe(record.key);
      expect(retrieved?.data).toEqual(record.data);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await getIndexedDbCache('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should overwrite existing record with same key', async () => {
      await putIndexedDbCache(createRecord({ key: 'same', data: { v: 1 } }));
      await putIndexedDbCache(createRecord({ key: 'same', data: { v: 2 } }));

      const retrieved = await getIndexedDbCache('same');
      expect(retrieved?.data).toEqual({ v: 2 });
    });

    it('should store records with different scopes separately', async () => {
      await putIndexedDbCache(createRecord({ key: 'k1', scope: 'user-1', data: { u: 1 } }));
      await putIndexedDbCache(createRecord({ key: 'k2', scope: 'user-2', data: { u: 2 } }));

      const r1 = await getIndexedDbCache('k1');
      const r2 = await getIndexedDbCache('k2');

      expect(r1?.scope).toBe('user-1');
      expect(r2?.scope).toBe('user-2');
    });
  });

  describe('deleteIndexedDbCache', () => {
    it('should remove a record by key', async () => {
      await putIndexedDbCache(createRecord({ key: 'to-delete' }));
      await deleteIndexedDbCache('to-delete');

      const retrieved = await getIndexedDbCache('to-delete');
      expect(retrieved).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(deleteIndexedDbCache('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clearIndexedDbScope', () => {
    it('should remove all records for a given scope', async () => {
      await putIndexedDbCache(createRecord({ key: 'k1', scope: 'user-1' }));
      await putIndexedDbCache(createRecord({ key: 'k2', scope: 'user-1' }));
      await putIndexedDbCache(createRecord({ key: 'k3', scope: 'user-2' }));

      await clearIndexedDbScope('user-1');

      const r1 = await getIndexedDbCache('k1');
      const r2 = await getIndexedDbCache('k2');
      const r3 = await getIndexedDbCache('k3');

      expect(r1).toBeNull();
      expect(r2).toBeNull();
      expect(r3).not.toBeNull();
    });

    it('should not throw for non-existent scope', async () => {
      await expect(clearIndexedDbScope('non-existent')).resolves.not.toThrow();
    });
  });

  describe('TTL and expiration', () => {
    it('should store expiresAt timestamp', async () => {
      const now = Date.now();
      const record = createRecord({ storedAt: now, expiresAt: now + 3600000 });
      await putIndexedDbCache(record);

      const retrieved = await getIndexedDbCache(record.key);
      expect(retrieved?.expiresAt).toBe(record.expiresAt);
    });
  });
});
