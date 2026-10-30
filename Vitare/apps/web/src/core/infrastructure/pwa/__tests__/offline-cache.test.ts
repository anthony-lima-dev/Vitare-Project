import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cachedGet, clearPatientOfflineCache, resetCacheRecoveryFlag } from '../offline-cache';
import { withStore } from '../indexed-db';

// Preserve original localStorage
const originalLocalStorage = global.localStorage;

// Mock axios response type
const createMockResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
  request: undefined,
});

// LocalStorage mock (defined in test-setup.ts)
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('Offline Cache', () => {
  beforeEach(async () => {
    await withStore('responses', 'readwrite', (store) => store.clear());
    resetCacheRecoveryFlag();
    vi.useFakeTimers();
    // Mock localStorage to return a default user scope
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vitare:cache:userId') return 'user-123';
      return null;
    });
    // Assign mock to global.localStorage for the module under test
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('cachedGet', () => {
    it('should return network response when online', async () => {
      const mockData = { id: '123', name: 'Test' };
      const request = vi.fn().mockResolvedValue(createMockResponse(mockData));

      const result = await cachedGet('/api/test', request);

      expect(result.data).toEqual(mockData);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('should cache successful response in IndexedDB', async () => {
      const mockData = { id: '123' };
      const request = vi.fn().mockResolvedValue(createMockResponse(mockData));

      await cachedGet('/api/test', request);

      // Wait for async cache write
      await vi.runAllTimersAsync();

      const cached = await withStore('responses', 'readonly', (store) => store.getAll());
      expect(cached.length).toBeGreaterThan(0);
      expect(cached[0]?.data).toEqual(mockData);
    });

    it('should return cached data on network failure', async () => {
      const mockData = { id: '123', cached: true };
      const cacheKey = 'user-123:GET:/api/test';

      // Pre-populate cache
      await withStore('responses', 'readwrite', (store) => {
        store.put({
          key: cacheKey,
          scope: 'user-123',
          url: '/api/test',
          storedAt: Date.now(),
          expiresAt: Date.now() + 60000,
          data: mockData,
        });
      });

      const request = vi.fn().mockRejectedValue(new Error('Network Error'));
      const result = await cachedGet('/api/test', request, {}, { cache: true });

      expect(result.data).toEqual(mockData);
      expect(result.headers['x-vitare-cache']).toBe('indexeddb');
      expect(result.statusText).toBe('OK (IndexedDB cache)');
    });

    it('should throw error for HTTP errors (not network failure)', async () => {
      const request = vi.fn().mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      await expect(cachedGet('/api/test', request)).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('should throw error when cache is too old', async () => {
      const mockData = { id: '123' };
      const cacheKey = 'user-123:GET:/api/test';

      await withStore('responses', 'readwrite', (store) => {
        store.put({
          key: cacheKey,
          scope: 'user-123',
          url: '/api/test',
          storedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (older than MAX_OFFLINE_AGE_MS)
          expiresAt: Date.now() + 60000,
          data: mockData,
        });
      });

      const request = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(cachedGet('/api/test', request)).rejects.toThrow('Network Error');
    });

    it('should respect cache: false option', async () => {
      const request = vi.fn().mockResolvedValue(createMockResponse({ id: '1' }));

      await cachedGet('/api/test', request, {}, { cache: false });

      // Should not have cached
      const cached = await withStore('responses', 'readonly', (store) => store.getAll());
      expect(cached.length).toBe(0);
    });

    it('should use custom scope when provided', async () => {
      const request = vi.fn().mockResolvedValue(createMockResponse({ id: '1' }));

      await cachedGet('/api/test', request, {}, { scope: 'custom-scope' });

      await vi.runAllTimersAsync();
      const cached = await withStore('responses', 'readonly', (store) => store.getAll());
      expect(cached[0]?.scope).toBe('custom-scope');
    });
  });

  describe('clearPatientOfflineCache', () => {
    it('should clear all cache for current user scope', async () => {
      await withStore('responses', 'readwrite', (store) => {
        store.put({ key: 'k1', scope: 'user-1', url: '/a', storedAt: 0, expiresAt: 0, data: {} });
        store.put({ key: 'k2', scope: 'user-1', url: '/b', storedAt: 0, expiresAt: 0, data: {} });
        store.put({ key: 'k3', scope: 'user-2', url: '/c', storedAt: 0, expiresAt: 0, data: {} });
      });

      // Mock localStorage to return user-1
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'vitare:cache:userId') return 'user-1';
        return null;
      });

      await clearPatientOfflineCache();

      const remaining = await withStore('responses', 'readonly', (store) => store.getAll());
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.key).toBe('k3');
    });
  });
});
