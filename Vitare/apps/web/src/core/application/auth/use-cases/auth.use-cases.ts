import type { User, LegalActAcceptance, TokenPair } from "@vitare/core-typings";
import type {
  AuthPorts,
  SessionPort,
  OfflineCachePort,
  AuthUseCases,
} from "../ports/auth-ports";
import { REQUIRED_LEGAL_DOCUMENTS } from "@vitare/core-typings";

export function createAuthUseCases(
  ports: AuthPorts,
  session: SessionPort,
  offlineCache: OfflineCachePort,
): AuthUseCases {
  async function ensureLegalAcceptance(user: User): Promise<void> {
    try {
      const accepted = await ports.listLegalAcceptances(user.id);
      const missing = REQUIRED_LEGAL_DOCUMENTS.filter(
        (doc) =>
          !accepted.some(
            (a) =>
              a.actType === doc.actType &&
              a.documentVersion === doc.version &&
              a.contentHash === doc.contentHash,
          ),
      );
      if (missing.length === 0) return;

      // Public routes where we should NOT force redirect to /completar-cadastro
      const publicPaths = [
        "/",
        "/login",
        "/cadastro",
        "/esqueci-senha",
        "/auth/google/callback",
        "/auth/reset-password",
      ];
      const current = window.location.pathname;
      const isPublic = publicPaths.some((p) => current === p || current.startsWith(p + "/"));
      if (!isPublic && current !== "/completar-cadastro") {
        window.location.href = "/completar-cadastro";
      }
    } catch {
      // A indisponibilidade da consulta de aceites não deve descartar uma sessão válida.
    }
  }

  async function persistAuthenticatedSession(tokens: TokenPair): Promise<User> {
    // Captura a identidade anterior antes de limpar tokens/perfil. O cache é limpo
    // somente quando a identidade muda; uma reautenticação da mesma conta não deve
    // descartar desnecessariamente seus dados offline.
    const previousUserId = session.getProfile()?.id ?? null;
    session.clear();

    try {
      // O perfil deve ser obtido do servidor usando o access token recém-persistido.
      // Não usar cache offline nesta etapa: ele pode conter o perfil de outra conta.
      session.save(tokens);
      const user = await ports.getFreshProfile();

      if (previousUserId !== user.id) {
        await offlineCache.clear();
      }

      session.saveProfile(user);
      offlineCache.setUserScope(user.id);
      await ensureLegalAcceptance(user);
      return user;
    } catch (error) {
      session.clear();
      try {
        await offlineCache.clear();
      } catch {
        // A sessão permanece removida mesmo se a limpeza local falhar.
      }
      throw error;
    }
  }

  return {
    async login(email: string, password: string): Promise<User> {
      const tokens = await ports.login(email, password);
      return persistAuthenticatedSession(tokens);
    },

    async register(
      fullName: string,
      email: string,
      password: string,
      legalActs: LegalActAcceptance[] = [],
    ): Promise<User> {
      const tokens = await ports.register(fullName, email, password, legalActs);
      return persistAuthenticatedSession(tokens);
    },

    async completeGoogleLogin(code: string): Promise<User> {
      const tokens = await ports.completeGoogleLogin(code);
      return persistAuthenticatedSession(tokens);
    },

    logout(): void {
      session.clear();
      void offlineCache.clear().catch(() => {
        // O logout deve invalidar a sessão mesmo se o navegador falhar ao limpar o cache.
      });
    },

    async refreshUser(): Promise<User | null> {
      const token = session.getAccessToken();
      if (!token) return null;
      try {
        const user = await ports.getProfile();
        session.saveProfile(user);
        // Do not enforce legal acceptance on silent refresh; it is enforced
        // after explicit login/register/google flows via persistAuthenticatedSession.
        return user;
      } catch {
        session.clear();
        return null;
      }
    },

    async hydrateSession(): Promise<User | null> {
      const token = session.getAccessToken();
      if (!token) return null;
      try {
        const user = await ports.getProfile();
        session.saveProfile(user);
        offlineCache.setUserScope(user.id);
        // Do not enforce legal acceptance on silent hydration; it is enforced
        // after explicit login/register/google flows via persistAuthenticatedSession.
        return user;
      } catch {
        session.clear();
        return null;
      }
    },

    ensureLegalAcceptance,
  };
}
