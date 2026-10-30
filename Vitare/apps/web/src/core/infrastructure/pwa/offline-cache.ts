import {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearIndexedDbScope,
  getIndexedDbCache,
  putIndexedDbCache,
} from "./indexed-db";

const CACHE_USER_SCOPE_KEY = "vitare:cache:userId";
const ANONYMOUS_SCOPE = "anonymous";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DICTIONARY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_OFFLINE_AGE_MS = 24 * 60 * 60 * 1000;

// Cache failure recovery: track if we've already attempted recovery
let cacheRecoveryAttempted = false;

/**
 * Handles IndexedDB cache write failures (quota exceeded, corruption, etc.)
 * Attempts to clear expired entries first, then falls back to clearing all cache for current scope.
 * Returns true if recovery was attempted, false if cache should be skipped.
 */
async function handleCacheWriteFailure(error: unknown, scope: string): Promise<boolean> {
  if (cacheRecoveryAttempted) {
    // Already tried recovery in this session, don't loop
    console.warn("Vitare: cache recovery already attempted, skipping cache for this session.", error);
    return false;
  }

  cacheRecoveryAttempted = true;
  console.warn("Vitare: cache write failed, attempting recovery...", error);

  try {
    // Try to clear expired entries first (would require index scan)
    // For now, clear the current user's scope as nuclear option
    await clearIndexedDbScope(scope);
    console.info("Vitare: cleared IndexedDB scope for recovery");
    return true;
  } catch (recoveryError) {
    console.error("Vitare: cache recovery failed", recoveryError);
    return false;
  }
}

/**
 * Call this when storage quota changes (cross-tab) to reset recovery flag
 */
export function resetCacheRecoveryFlag(): void {
  cacheRecoveryAttempted = false;
}

// Listen for storage quota changes from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "vitare:cache:quota-exceeded") {
      resetCacheRecoveryFlag();
    }
  });
}

export function setOfflineCacheUserScope(userId: string): void {
  localStorage.setItem(CACHE_USER_SCOPE_KEY, userId);
}

export function getOfflineCacheUserScope(): string {
  return localStorage.getItem(CACHE_USER_SCOPE_KEY) ?? ANONYMOUS_SCOPE;
}

function createCachedResponse<T>(
  data: T,
  config: AxiosRequestConfig,
  cachedAt: number,
): AxiosResponse<T> {
  const headers = new AxiosHeaders({
    "x-vitare-cache": "indexeddb",
    "x-vitare-cache-at": new Date(cachedAt).toISOString(),
  });

  return {
    data,
    status: 200,
    statusText: "OK (IndexedDB cache)",
    headers,
    config: config as InternalAxiosRequestConfig,
    request: undefined,
  };
}

export async function cachedGet<T>(
  url: string,
  request: () => Promise<AxiosResponse<T>>,
  config: AxiosRequestConfig = {},
  options: { ttlMs?: number; cache?: boolean; scope?: string } = {},
): Promise<AxiosResponse<T>> {
  const { ttlMs = DEFAULT_TTL_MS, cache = true, scope } = options;
  if (!cache || typeof window === "undefined") return request();

  const effectiveScope = scope ?? getOfflineCacheUserScope();
  const key = `${effectiveScope}:GET:${url}`;
  const now = Date.now();

  try {
    const response = await request();

    // Write to cache with failure recovery
    try {
      await putIndexedDbCache({
        key,
        scope: effectiveScope,
        url,
        storedAt: now,
        expiresAt: now + ttlMs,
        data: response.data,
      });
    } catch (cacheError) {
      const recovered = await handleCacheWriteFailure(cacheError, effectiveScope);
      if (recovered) {
        // Retry once after recovery
        try {
          await putIndexedDbCache({
            key,
            scope: effectiveScope,
            url,
            storedAt: now,
            expiresAt: now + ttlMs,
            data: response.data,
          });
        } catch {
          // Give up on caching this response
        }
      }
    }

    return response;
  } catch (error) {
    // Only network failures use the offline snapshot. HTTP errors such as
    // 401/403/404 must continue following the normal API error flow.
    const isNetworkFailure =
      !error ||
      typeof error !== "object" ||
      !("response" in error) ||
      !(error as { response?: unknown }).response;
    if (!isNetworkFailure) throw error;

    const cached = await getIndexedDbCache<T>(key);
    if (!cached) throw error;

    const age = now - cached.storedAt;
    if (age > MAX_OFFLINE_AGE_MS) throw error;

    return createCachedResponse(cached.data, config, cached.storedAt);
  }
}

export async function invalidateCachedGet(
  url: string,
  options: { scope?: string } = {}
): Promise<void> {
  const effectiveScope = options.scope ?? getOfflineCacheUserScope();
  const key = `${effectiveScope}:GET:${url}`;
  const { deleteIndexedDbCache } = await import("./indexed-db");
  await deleteIndexedDbCache(key);
}

export async function clearPatientOfflineCache(): Promise<void> {
  const scope = getOfflineCacheUserScope();
  await clearIndexedDbScope(scope);
  localStorage.removeItem(CACHE_USER_SCOPE_KEY);
  resetCacheRecoveryFlag();
}

export const OFFLINE_CACHE_TTL = {
  standard: DEFAULT_TTL_MS,
  dictionary: DICTIONARY_TTL_MS,
};
