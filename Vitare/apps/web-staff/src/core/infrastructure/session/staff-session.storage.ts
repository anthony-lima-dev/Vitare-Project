/**
 * Adaptador de armazenamento da sessão da equipe (localStorage).
 * Único ponto com as chaves reais — contexto, cliente HTTP e socket
 * consomem este contrato, nunca o `localStorage` diretamente.
 */
import type { Staff } from "@vitare/core-typings";

const ACCESS_TOKEN_KEY = "vitare:staff:accessToken";
const PROFILE_KEY = "vitare:staff:profile";

export const staffSessionStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getProfile(): Staff | null {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveProfile(staff: Staff): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(staff));
  },

  save(accessToken: string, staff: Staff): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(staff));
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  },
};
