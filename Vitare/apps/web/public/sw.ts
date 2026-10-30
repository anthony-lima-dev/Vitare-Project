/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Vitare PWA Service Worker — Patient App
// Scope: '/' — does NOT intercept /api/ or /monitoramento/
// Clinical data and tokens are NEVER cached in Cache Storage.

const CACHE_NAME = 'vitare-web-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_MANIFEST = self.__WB_MANIFEST ?? [];

let precacheComplete = false;

// Assets that should never be cached (clinical, auth, realtime)
const EXCLUDE_PATTERNS = [
  /^\/api\//,
  /^\/monitoramento\//,
  /^\/socket\.io/,
  /\/auth\//,
  /\/emergency\//,
];

function shouldExclude(url: URL): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isNavigationRequest(request: Request): boolean {
  return request.mode === 'navigate';
}

function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|png|svg|ico|woff2|html)$/) !== null ||
    url.origin !== location.origin
  );
}

// Install: precache validated assets from build manifest
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const validEntries = PRECACHE_MANIFEST.filter((entry) => {
        const url = new URL(entry.url, location.origin);
        return !shouldExclude(url);
      });

      await cache.addAll(validEntries.map((e) => e.url));

      // Ensure offline page is cached
      await cache.add(OFFLINE_URL);

      precacheComplete = true;

      // Force activation without waiting for other tabs to close
      await self.skipWaiting();
    })()
  );
});

// Activate: clean up ONLY this app's caches (prefix by CACHE_NAME)
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('vitare-web-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Claim clients immediately so new SW controls current tab
      await self.clients.claim();
    })()
  );
});

// Fetch: network-first for navigation, cache-first for static assets
// NEVER caches responses from /api/, /monitoramento/, /socket.io
self.addEventListener('fetch', (event: FetchEvent) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip cross-origin requests (fonts, etc.) - let Workbox handle via runtimeCaching
  if (url.origin !== location.origin) {
    return;
  }

  // Exclude clinical/admin/realtime paths from SW entirely
  if (shouldExclude(url)) {
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Cache successful navigation responses for offline
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Offline: serve cached page or offline.html
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          return cache.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // Static assets: cache-first (precached in install)
  if (isStaticAsset(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Asset not available offline
          return new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // All other requests (API, etc.): pass through to network (no SW interference)
});

// Message handling for skipWaiting from workbox-window and capability checks
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CHECK_PRECACHE') {
    event.ports[0]?.postMessage({ precacheComplete });
  }
});

// Background Sync NOT implemented — unreliable browser support
// Sync is triggered via 'online' event + 'visibilitychange' in the client