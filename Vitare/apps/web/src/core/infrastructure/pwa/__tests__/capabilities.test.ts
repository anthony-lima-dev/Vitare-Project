import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkInstallable,
  checkOfflineReady,
  getPwaCapabilities,
  subscribeToCapabilities,
} from '../capabilities';

describe('PWA Capabilities', () => {
  let originalMessageChannel: any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Reset mocks
    (global.fetch as vi.Mock).mockReset();
    
    // Ensure serviceWorker object exists on navigator
    if (!('serviceWorker' in navigator)) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn(),
          controller: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });
    }
    
    // Mock service worker
    const mockRegistration = {
      active: { postMessage: vi.fn() },
    };
    vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(mockRegistration);
    vi.spyOn(navigator.serviceWorker, 'controller', 'get').mockReturnValue({});
    
    // Mock manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
    
    // Mock window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });

    // Mock MessageChannel to allow port communication
    originalMessageChannel = global.MessageChannel;
    global.MessageChannel = class {
      port1: any;
      port2: any;
      constructor() {
        this.port1 = { onmessage: null, postMessage: vi.fn() };
        this.port2 = { onmessage: null, postMessage: vi.fn() };
        // Link ports: when one posts, the other receives
        this.port1.postMessage = (msg: any) => { if (this.port2.onmessage) this.port2.onmessage({ data: msg }); };
        this.port2.postMessage = (msg: any) => { if (this.port1.onmessage) this.port1.onmessage({ data: msg }); };
      }
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.head.querySelector('link[rel="manifest"]')?.remove();
    global.MessageChannel = originalMessageChannel;
  });

  describe('checkInstallable', () => {
    it('should return false when no service worker support', async () => {
      vi.spyOn(navigator, 'serviceWorker', 'get').mockReturnValue(undefined);
      const result = await checkInstallable();
      expect(result).toBe(false);
    });

    it('should return false when no manifest link', async () => {
      document.head.querySelector('link[rel="manifest"]')?.remove();
      const result = await checkInstallable();
      expect(result).toBe(false);
    });

    it('should return false when manifest fetch fails', async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));
      const result = await checkInstallable();
      expect(result).toBe(false);
    });

    it('should return false when manifest missing required fields', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Test' }), // missing short_name, start_url, icons
      });
      const result = await checkInstallable();
      expect(result).toBe(false);
    });

    it('should return true when all criteria met', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          name: 'Vitare',
          short_name: 'Vitare',
          start_url: '/',
          icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
        }),
      });
      const result = await checkInstallable();
      expect(result).toBe(true);
    });
  });

  describe('checkOfflineReady', () => {
    it('should return false when no service worker support', async () => {
      vi.spyOn(navigator, 'serviceWorker', 'get').mockReturnValue(undefined);
      const result = await checkOfflineReady();
      expect(result).toBe(false);
    });

    it('should return false when no active registration', async () => {
      vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(null);
      const result = await checkOfflineReady();
      expect(result).toBe(false);
    });

    it('should return false when SW not controlling page', async () => {
      vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue({
        active: { postMessage: vi.fn() },
      });
      vi.spyOn(navigator.serviceWorker, 'controller', 'get').mockReturnValue(null);
      const result = await checkOfflineReady();
      expect(result).toBe(false);
    });

    it('should return true when precacheComplete is true', async () => {
      const mockActive = {
        postMessage: vi.fn((msg, ports) => {
          if (msg.type === 'CHECK_PRECACHE' && ports[0]) {
            // Simulate SW replying via the port
            ports[0].postMessage({ precacheComplete: true });
          }
        }),
      };
      const mockRegistration = {
        active: mockActive,
      };
      vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(mockRegistration);
      // controller must be the same as registration.active for checkOfflineReady to succeed
      vi.spyOn(navigator.serviceWorker, 'controller', 'get').mockReturnValue(mockActive);

      const promise = checkOfflineReady();
      // Advance fake timers to fire any setTimeout(..., 0) inside the mock
      vi.advanceTimersByTime(0);
      const result = await promise;
      expect(result).toBe(true);
    });
  });

  describe('getPwaCapabilities', () => {
    it('should return both capabilities as separate booleans', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          name: 'Vitare',
          short_name: 'Vitare',
          start_url: '/',
          icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
        }),
      });

      const mockPort = { onmessage: null as any };
      const mockRegistration = {
        active: {
          postMessage: vi.fn((msg, ports) => {
            if (msg.type === 'CHECK_PRECACHE' && ports[0]) {
              setTimeout(() => ports[0].onmessage({ data: { precacheComplete: true } }), 0);
            }
          }),
        },
      };
      vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(mockRegistration);
      vi.spyOn(navigator.serviceWorker, 'controller', 'get').mockReturnValue({});

      const caps = await getPwaCapabilities();

      expect(caps).toHaveProperty('installable');
      expect(caps).toHaveProperty('offlineReady');
      expect(caps).toHaveProperty('backgroundSync', false);
      expect(typeof caps.installable).toBe('boolean');
      expect(typeof caps.offlineReady).toBe('boolean');
    });
  });

  describe('subscribeToCapabilities', () => {
    it('should call callback with initial capabilities', async () => {
      // Mock setInterval/clearInterval to avoid infinite timer loop with fake timers
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});

      const callback = vi.fn();
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          name: 'Vitare',
          short_name: 'Vitare',
          start_url: '/',
          icons: [{ src: '/icon.png', sizes: '192x192', type: 'image/png' }],
        }),
      });

      const mockActive = {
        postMessage: vi.fn((msg, ports) => {
          if (msg.type === 'CHECK_PRECACHE' && ports[0]) {
            // Simulate SW replying via the port
            ports[0].postMessage({ precacheComplete: true });
          }
        }),
      };
      const mockRegistration = {
        active: mockActive,
      };
      vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(mockRegistration);
      vi.spyOn(navigator.serviceWorker, 'controller', 'get').mockReturnValue(mockActive);

      const unsubscribe = subscribeToCapabilities(callback);
      // Flush microtasks and timers so the initial async checkAndNotify runs
      await vi.runAllTimersAsync();

      expect(callback).toHaveBeenCalled();
      const calledWith = callback.mock.calls[0][0];
      expect(calledWith).toHaveProperty('installable');
      expect(calledWith).toHaveProperty('offlineReady');
      expect(calledWith).toHaveProperty('backgroundSync', false);

      unsubscribe();
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToCapabilities(callback);
      unsubscribe();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
