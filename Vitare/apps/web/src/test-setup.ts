import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch for network detection tests
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock console.warn/error to reduce noise in tests
const originalWarn = console.warn;
const originalError = console.error;
beforeAll(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
  localStorageMock.removeItem.mockImplementation(() => {});
  (global.fetch as vi.Mock).mockReset();
});

// Helper to reset IndexedDB between tests
export async function resetIndexedDB(): Promise<void> {
  // fake-indexeddb doesn't have a clean reset, so we rely on new DB names per test
}