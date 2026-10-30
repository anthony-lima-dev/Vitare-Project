import type { User, LegalActAcceptance, TokenPair } from "@vitare/core-typings";

export interface AuthPorts {
  login(email: string, password: string): Promise<TokenPair>;
  register(
    fullName: string,
    email: string,
    password: string,
    legalActs?: LegalActAcceptance[],
  ): Promise<TokenPair>;
  completeGoogleLogin(code: string): Promise<TokenPair>;
  /** Perfil com fallback controlado para cache/offline durante hidratação de sessão. */
  getProfile(): Promise<User>;
  /** Perfil diretamente da API, sem cache offline, logo após autenticação/troca de conta. */
  getFreshProfile(): Promise<User>;
  refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  listLegalAcceptances(userId: string): Promise<LegalActAcceptance[]>;
}

export interface SessionPort {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  save(tokens: { accessToken: string; refreshToken: string }): void;
  clear(): void;
  saveProfile(user: User): void;
  getProfile(): User | null;
}

export interface OfflineCachePort {
  setUserScope(userId: string): void;
  clear(): Promise<void>;
}

export interface AuthUseCases {
  login(email: string, password: string): Promise<User>;
  register(
    fullName: string,
    email: string,
    password: string,
    legalActs?: LegalActAcceptance[],
  ): Promise<User>;
  completeGoogleLogin(code: string): Promise<User>;
  logout(): void;
  refreshUser(): Promise<User | null>;
  hydrateSession(): Promise<User | null>;
  ensureLegalAcceptance(user: User): Promise<void>;
}
