import { apiClient } from "./client";
import type { TokenPair } from "@vitare/core-typings";
import type { LegalActAcceptance } from "@vitare/core-typings";

export const AuthMethod = {
  OAUTH_GOOGLE: 'OAUTH_GOOGLE',
  LOCAL: 'LOCAL',
} as const;

export type AuthMethodType = typeof AuthMethod[keyof typeof AuthMethod];

export interface CheckRealmResponse {
  email: string;
  authMethod: AuthMethodType;
}

export const authApi = {
  register: (
    data: { fullName: string; email: string; password: string },
    legalActs?: LegalActAcceptance[],
  ) =>
    apiClient.post<TokenPair>("/auth/register", { ...data, legalActs }),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenPair>("/auth/login", data),

  checkRealm: (email: string) =>
    apiClient.post<CheckRealmResponse>("/auth/login/check-realm", { email }),

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post("/auth/reset-password", { token, newPassword }),

  googleLoginUrl: () => `${import.meta.env.VITE_API_URL || "/api/v1"}/auth/google`,

  exchangeGoogleCode: (code: string) =>
    apiClient.post<TokenPair>("/auth/google/exchange", { code }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<TokenPair>("/auth/refresh", { refreshToken }),
};
