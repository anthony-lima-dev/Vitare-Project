import type { SessionPort } from "../../application/auth/ports/auth-ports";
import type { User } from "@vitare/core-typings";
import { authSessionStorage } from "./auth-session.storage";

const PROFILE_KEY = "vitare:userProfile";

/**
 * Adapter que implementa SessionPort estendendo o storage existente.
 */
export class AuthSessionAdapter implements SessionPort {
  getAccessToken(): string | null {
    return authSessionStorage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return authSessionStorage.getRefreshToken();
  }

  save(tokens: { accessToken: string; refreshToken: string }): void {
    authSessionStorage.save(tokens);
  }

  clear(): void {
    authSessionStorage.clear();
    localStorage.removeItem(PROFILE_KEY);
  }

  saveProfile(user: User): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  }

  getProfile(): User | null {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

export const sessionAdapter = new AuthSessionAdapter();