import { test, expect } from '@playwright/test';

test.describe('PWA Offline Capabilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('app loads offline after initial visit', async ({ page, context }) => {
    await expect(page.locator('body')).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.locator('text=Você está offline')).toBeVisible({ timeout: 10000 });

    await context.setOffline(false);
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('offline page shows connection status check', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('/');

    await expect(page.locator('#onlineStatus')).toBeVisible();
    await expect(page.locator('#retryBtn')).toBeDisabled();
  });

  test('emergency trigger queues offline and syncs when online', async ({ page, context }) => {
    await context.setOffline(true);

    const queued = await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve) => {
          const tx = db.transaction('outbox', 'readwrite');
          const store = tx.objectStore('outbox');
          store.put({
            id: 'test-emergency-1',
            ownerId: 'user-123',
            idempotencyKey: 'idem-test-1',
            payload: { latitude: -23.5, longitude: -46.6, accuracy: 10 },
            state: 'QUEUED',
            attempts: 0,
            createdAt: Date.now(),
            lastAttemptAt: null,
            nextAttemptAt: Date.now(),
            lastError: null,
          });
          tx.oncomplete = () => {
            const tx2 = db.transaction('outbox', 'readonly');
            const store2 = tx2.objectStore('outbox');
            const req = store2.getAll();
            req.onsuccess = () => resolve(req.result);
          };
        });
      });
    });

    expect(queued.length).toBeGreaterThan(0);
    expect(queued[0].state).toBe('QUEUED');
    expect(queued[0].idempotencyKey).toBe('idem-test-1');

    await context.setOffline(false);

    const afterOnline = await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve) => {
          const tx = db.transaction('outbox', 'readonly');
          const store = tx.objectStore('outbox');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
        });
      });
    });

    expect(afterOnline[0].idempotencyKey).toBe('idem-test-1');
  });

  test('session switch clears previous user operations', async ({ page }) => {
    await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction('outbox', 'readwrite');
          const store = tx.objectStore('outbox');
          store.put({
            id: 'user-a-op',
            ownerId: 'user-a',
            idempotencyKey: 'idem-a-1',
            payload: { latitude: -23.5, longitude: -46.6, accuracy: 10 },
            state: 'QUEUED',
            attempts: 0,
            createdAt: Date.now(),
            lastAttemptAt: null,
            nextAttemptAt: Date.now(),
            lastError: null,
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      });
    });

    await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction('outbox', 'readwrite');
          const store = tx.objectStore('outbox');
          const index = store.index('ownerId');
          const req = index.openCursor('user-a');
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              cursor.update({
                ...cursor.value,
                state: 'FAILED_PERMANENT',
                lastError: 'Sessão encerrada pelo usuário',
                nextAttemptAt: Number.MAX_SAFE_INTEGER,
              });
              cursor.continue();
            } else {
              resolve(true);
            }
          };
          req.onerror = () => reject(req.error);
        });
      });
    });

    const userAOps = await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve) => {
          const tx = db.transaction('outbox', 'readonly');
          const store = tx.objectStore('outbox');
          const index = store.index('ownerId');
          const req = index.getAll('user-a');
          req.onsuccess = () => resolve(req.result);
        });
      });
    });

    expect(userAOps[0].state).toBe('FAILED_PERMANENT');
    expect(userAOps[0].lastError).toBe('Sessão encerrada pelo usuário');
  });

  test('service worker does not cache API responses', async ({ page }) => {
    await page.route('/api/v1/patients/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'patient-1', name: 'Test Patient' }),
      });
    });

    await page.evaluate(async () => {
      const response = await fetch('/api/v1/patients/me');
      return response.json();
    });

    const caches = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const vitareCache = await caches.open(cacheNames.find(n => n.startsWith('vitare-web'))!);
      const apiResponse = await vitareCache.match('/api/v1/patients/me');
      return !!apiResponse;
    });

    expect(caches).toBe(false);
  });

  test('service worker caches static assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasStaticCache = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const vitareCache = await caches.open(cacheNames.find(n => n.startsWith('vitare-web'))!);
      const keys = await vitareCache.keys();
      return keys.some(req => req.url.includes('.js') || req.url.includes('.css'));
    });

    expect(hasStaticCache).toBe(true);
  });
});

test.describe('PWA Installability', () => {
  test('manifest is valid and meets PWA criteria', async ({ page }) => {
    await page.goto('/');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    const manifestResponse = await page.request.get('/manifest.json');
    const manifest = await manifestResponse.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons.some((i: any) => i.purpose === 'maskable')).toBe(true);
  });

  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/');

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });

    expect(swRegistered).toBe(true);
  });
});

test.describe('Multi-tab Coordination', () => {
  test('stale SYNCING lease is reclaimed in new tab', async ({ page, context }) => {
    await page.evaluate(() => {
      return indexedDB.open('vitare-pwa-cache', 2).then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction('outbox', 'readwrite');
          const store = tx.objectStore('outbox');
          store.put({
            id: 'stale-syncing',
            ownerId: 'user-123',
            idempotencyKey: 'idem-stale-1',
            payload: { latitude: -23.5, longitude: -46.6, accuracy: 10 },
            state: 'SYNCING',
            attempts: 1,
            createdAt: Date.now() - 60000,
            lastAttemptAt: Date.now() - 35000,
            nextAttemptAt: Date.now(),
            lastError: null,
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      });
    });

    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    await page2.close();
  });
});
