/**
 * Network detection utility — does NOT rely on navigator.onLine
 * navigator.onLine only indicates local network interface status, not API reachability.
 * This module provides a robust check against the actual API endpoint.
 */

const HEALTH_ENDPOINT = '/api/v1/health';
const CHECK_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 30_000; // Cache result for 30 seconds

let lastCheck: { timestamp: number; result: boolean } | null = null;

/**
 * Checks if the API is reachable with a lightweight HEAD request.
 * Uses AbortController for timeout control.
 * Does NOT use navigator.onLine — that only reflects local interface state.
 */
export async function checkApiReachable(): Promise<boolean> {
  const now = Date.now();

  // Return cached result if within TTL
  if (lastCheck && now - lastCheck.timestamp < CACHE_TTL_MS) {
    return lastCheck.result;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(HEALTH_ENDPOINT, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
      // Don't send credentials for health check
      credentials: 'omit',
    });

    clearTimeout(timeoutId);

    const reachable = response.ok;
    lastCheck = { timestamp: now, result: reachable };
    return reachable;
  } catch {
    // Any error (timeout, network, CORS, etc.) = unreachable
    lastCheck = { timestamp: now, result: false };
    return false;
  }
}

/**
 * Clears the cached reachability result, forcing a fresh check on next call.
 * Call this after known network changes (e.g., after 'online' event).
 */
export function invalidateReachabilityCache(): void {
  lastCheck = null;
}

/**
 * Returns the last known reachability state without making a new request.
 * Useful for UI indicators that need immediate feedback.
 */
export function getCachedReachability(): boolean | null {
  return lastCheck?.result ?? null;
}

/**
 * Subscribe to reachability changes.
 * The callback is fired when a check completes with a different result than the previous check.
 * Returns an unsubscribe function.
 */
export function subscribeToReachability(
  callback: (reachable: boolean) => void
): () => void {
  let previousResult = lastCheck?.result ?? null;

  const checkAndNotify = async () => {
    const currentResult = await checkApiReachable();
    if (currentResult !== previousResult) {
      previousResult = currentResult;
      callback(currentResult);
    }
  };

  // Initial check
  checkAndNotify();

  // Set up periodic checks
  const intervalId = setInterval(checkAndNotify, CACHE_TTL_MS);

  // Also check on online event (but don't rely solely on it)
  const onlineHandler = () => {
    invalidateReachabilityCache();
    checkAndNotify();
  };
  window.addEventListener('online', onlineHandler);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
    window.removeEventListener('online', onlineHandler);
  };
}