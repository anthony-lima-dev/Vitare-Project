import type { OfflineCachePort } from "../../application/auth/ports/auth-ports";
import { setOfflineCacheUserScope, clearPatientOfflineCache } from "./offline-cache";

/**
 * Adapter que implementa OfflineCachePort usando a implementação existente.
 */
export class OfflineCacheAdapter implements OfflineCachePort {
  setUserScope(userId: string): void {
    setOfflineCacheUserScope(userId);
  }

  async clear(): Promise<void> {
    await clearPatientOfflineCache();
  }
}

export const offlineCacheAdapter = new OfflineCacheAdapter();