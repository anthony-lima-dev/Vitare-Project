/**
 * PWA Capability Detection
 * Reports installability and offline-readiness as SEPARATE capabilities.
 * One being true does NOT imply the other.
 */

export interface PwaCapabilities {
  /** App meets PWA install criteria (manifest, SW, HTTPS, icons) */
  installable: boolean;
  /** Service Worker registered AND precache complete (app works offline) */
  offlineReady: boolean;
  /** Background Sync API available (explicitly false for Vitare) */
  backgroundSync: false;
}

/**
 * Checks if the app meets PWA installability criteria.
 * Does NOT check if offline functionality works.
 */
export async function checkInstallable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return false;

    const manifestResponse = await fetch(manifestLink.getAttribute('href')!, { cache: 'no-store' });
    if (!manifestResponse.ok) return false;

    const manifest = await manifestResponse.json();
    if (!manifest.name || !manifest.short_name || !manifest.start_url || !manifest.icons?.length) {
      return false;
    }

    // Check service worker registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    // Check for HTTPS (or localhost)
    const isSecureContext = window.isSecureContext || location.hostname === 'localhost';
    if (!isSecureContext) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the app is ready for offline use.
 * Requires: SW controlling page + precache complete.
 * Does NOT check installability.
 */
export async function checkOfflineReady(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      return false;
    }

    // Check if SW is controlling this page
    if (navigator.serviceWorker.controller !== registration.active) {
      return false;
    }

    // Check if precache is complete by messaging SW
    return new Promise<boolean>((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.precacheComplete === true);
      };

      registration.active!.postMessage(
        { type: 'CHECK_PRECACHE' },
        [messageChannel.port2]
      );

      // Timeout after 2s
      setTimeout(() => resolve(false), 2000);
    });
  } catch {
    return false;
  }
}

/**
 * Returns both capabilities as separate booleans.
 * IMPORTANT: installable !== offlineReady. They are independent.
 * - installable: Can user "Add to Home Screen"?
 * - offlineReady: Will app work when network is down?
 */
export async function getPwaCapabilities(): Promise<PwaCapabilities> {
  const [installable, offlineReady] = await Promise.all([
    checkInstallable(),
    checkOfflineReady(),
  ]);

  return {
    installable,
    offlineReady,
    backgroundSync: false, // Explicitly not supported
  };
}

/**
 * Subscribe to capability changes.
 * Useful for UI that shows "Install App" or "Ready for Offline" badges.
 */
export function subscribeToCapabilities(
  callback: (caps: PwaCapabilities) => void
): () => void {
  let currentCaps: PwaCapabilities = {
    installable: false,
    offlineReady: false,
    backgroundSync: false,
  };

  const checkAndNotify = async () => {
    const newCaps = await getPwaCapabilities();
    if (
      newCaps.installable !== currentCaps.installable ||
      newCaps.offlineReady !== currentCaps.offlineReady
    ) {
      currentCaps = newCaps;
      callback(newCaps);
    }
  };

  // Initial check
  checkAndNotify();

  // Re-check on SW controller change
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', checkAndNotify);
  }

  // Re-check periodically
  const intervalId = setInterval(checkAndNotify, 30000);

  // Also check on online/offline events
  window.addEventListener('online', checkAndNotify);
  window.addEventListener('offline', checkAndNotify);

  return () => {
    clearInterval(intervalId);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', checkAndNotify);
    }
    window.removeEventListener('online', checkAndNotify);
    window.removeEventListener('offline', checkAndNotify);
  };
}