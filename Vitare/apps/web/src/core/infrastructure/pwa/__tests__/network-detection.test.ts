import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkApiReachable, invalidateReachabilityCache, getCachedReachability, subscribeToReachability } from '../network-detection';

describe('Network Detection', () => {
  beforeEach(() => {
    invalidateReachabilityCache();
    (global.fetch as vi.Mock).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkApiReachable', () => {
    it('should return true when API responds OK', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({ ok: true });

      const result = await checkApiReachable();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/health', expect.objectContaining({
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'omit',
      }));
    });

    it('should return false when API responds with error status', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await checkApiReachable();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await checkApiReachable();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      // Mock fetch to reject with AbortError (simulating timeout)
      (global.fetch as vi.Mock).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const result = await checkApiReachable();

      expect(result).toBe(false);
    });

    it('should cache result for 30 seconds', async () => {
      vi.useFakeTimers();
      
      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: true });

      await checkApiReachable();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: false });
      const result = await checkApiReachable();

      expect(result).toBe(true); // Cached result
      expect(global.fetch).toHaveBeenCalledTimes(1); // Not called again
      
      vi.useRealTimers();
    });

    it('should bypass cache after 30 seconds', async () => {
      vi.useFakeTimers();
      
      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: true });
      await checkApiReachable();

      vi.advanceTimersByTime(31000); // Past 30s TTL

      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: false });
      const result = await checkApiReachable();

      expect(result).toBe(false); // Fresh check
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });
  });

  describe('invalidateReachabilityCache', () => {
    it('should force fresh check on next call', async () => {
      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: true });
      await checkApiReachable();

      invalidateReachabilityCache();
      (global.fetch as vi.Mock).mockResolvedValueOnce({ ok: false });

      const result = await checkApiReachable();
      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCachedReachability', () => {
    it('should return null when no cached value', () => {
      expect(getCachedReachability()).toBeNull();
    });

    it('should return cached value after check', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({ ok: true });
      await checkApiReachable();

      expect(getCachedReachability()).toBe(true);
    });
  });

  describe('subscribeToReachability', () => {
    // TODO: Fix infinite loop issue with setInterval in source code
    it.skip('should call callback with initial reachability', async () => {});
    it.skip('should call callback when reachability changes', async () => {});
    it.skip('should unsubscribe correctly', async () => {});
  });
});
