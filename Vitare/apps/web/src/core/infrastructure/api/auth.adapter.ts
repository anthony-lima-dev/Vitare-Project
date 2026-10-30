import type { AuthPorts } from "../../application/auth/ports/auth-ports";
import type { User, LegalActAcceptance, TokenPair } from "@vitare/core-typings";
import { authApi } from "./auth.api";
import { patientsApi } from "./patients.api";
import { legalApi, type LegalActRecord } from "./legal.api";

/** Adaptador HTTP; a camada de aplicação estabelece a sessão antes de obter o perfil. */
export class AuthApiAdapter implements AuthPorts {
  async login(email: string, password: string): Promise<TokenPair> {
    const { data } = await authApi.login({ email, password });
    return data;
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    legalActs?: LegalActAcceptance[],
  ): Promise<TokenPair> {
    const { data } = await authApi.register(
      { fullName, email, password },
      legalActs,
    );
    return data;
  }

  async completeGoogleLogin(code: string): Promise<TokenPair> {
    const { data } = await authApi.exchangeGoogleCode(code);
    return data;
  }

  async getProfile(): Promise<User> {
    const { data } = await patientsApi.getProfile();
    return data;
  }

  async getFreshProfile(): Promise<User> {
    const { data } = await patientsApi.getProfileFresh();
    return data;
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const response =
      (await authApi.refreshToken?.(refreshToken)) ??
      (await import("./client")).apiClient.post<TokenPair>("/auth/refresh", {
        refreshToken,
      });
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  }

  async listLegalAcceptances(userId: string): Promise<LegalActAcceptance[]> {
    const { data } = await legalApi.listByHolder(userId);
    if (!data) return [];
    return data.map((record: LegalActRecord) => ({
      actType: record.actType as LegalActAcceptance["actType"],
      documentVersion: record.documentVersion,
      contentHash: record.contentHash,
    }));
  }
}

export const authApiAdapter = new AuthApiAdapter();
