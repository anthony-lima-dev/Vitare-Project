/**
 * Adaptador de armazenamento da sessão do paciente (localStorage).
 * Único ponto com as chaves reais — as camadas de aplicação dependem apenas
 * deste contrato, nunca do `localStorage` diretamente.
 */
const ACCESS_TOKEN_KEY = "vitare:accessToken";
const REFRESH_TOKEN_KEY = "vitare:refreshToken";

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const authSessionStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  save(tokens: AuthSessionTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
