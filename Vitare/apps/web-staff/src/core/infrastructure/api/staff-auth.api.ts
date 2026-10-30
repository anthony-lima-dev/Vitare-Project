import { staffApiClient } from "./staff-client.api";
import type { Staff, StaffTokenResponse } from "@vitare/core-typings";
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

export const staffAuthApi = {
  getSetupStatus: () =>
    staffApiClient.get<{ setupRequired: boolean }>("/staff/auth/setup-status"),
  me: () => staffApiClient.get<Staff>("/staff/auth/me"),
  login: (data: { email: string; password: string }) =>
    staffApiClient.post<StaffTokenResponse>("/staff/auth/login", data),
  checkRealm: (email: string) =>
    staffApiClient.post<CheckRealmResponse>("/staff/auth/login/check-realm", { email }),
  register: (
    data: {
      fullName: string;
      email: string;
      cpf: string;
      registrationNumber: string;
      role: string;
      password: string;
    },
    bootstrapKey?: string,
    legalActs?: LegalActAcceptance[],
  ) =>
    staffApiClient.post<StaffTokenResponse>(
      "/staff/auth/register",
      { ...data, legalActs },
      { headers: bootstrapKey ? { "x-bootstrap-key": bootstrapKey } : {} },
    ),
};
