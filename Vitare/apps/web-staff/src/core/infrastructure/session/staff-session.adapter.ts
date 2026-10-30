import type { StaffSessionPort } from "../../application/auth/ports/staff-auth.port";
import type { Staff } from "@vitare/core-typings";
import { staffSessionStorage } from "./staff-session.storage";

/**
 * Adapter que implementa StaffSessionPort usando o storage existente.
 */
export class StaffSessionAdapter implements StaffSessionPort {
  getAccessToken(): string | null {
    return staffSessionStorage.getAccessToken();
  }

  save(accessToken: string, staff: Staff): void {
    staffSessionStorage.save(accessToken, staff);
  }

  clear(): void {
    staffSessionStorage.clear();
  }

  saveProfile(staff: Staff): void {
    staffSessionStorage.saveProfile(staff);
  }

  getProfile(): Staff | null {
    return staffSessionStorage.getProfile();
  }
}

export const staffSessionAdapter = new StaffSessionAdapter();