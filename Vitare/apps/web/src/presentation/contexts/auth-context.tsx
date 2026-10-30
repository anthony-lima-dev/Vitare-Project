import { useState, useCallback, useEffect, type ReactNode } from "react";
import type { LegalActAcceptance } from "@vitare/core-typings";
import { AuthContext, type AuthContextValue } from "../../core/application/auth/ports/auth-context.port";
import { createAuthUseCases } from "../../core/application/auth/use-cases/auth.use-cases";
import { authApiAdapter } from "../../core/infrastructure/api/auth.adapter";
import { sessionAdapter } from "../../core/infrastructure/session/session.adapter";
import { offlineCacheAdapter } from "../../core/infrastructure/pwa/offline-cache.adapter";

// Create use cases with adapters (composition root)
const authUseCases = createAuthUseCases(
  authApiAdapter,
  sessionAdapter,
  offlineCacheAdapter
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Ao montar a aplicação, hidrata a sessão usando os use cases
  useEffect(() => {
    async function hydrateSession() {
      try {
        const hydratedUser = await authUseCases.hydrateSession();
        setUser(hydratedUser);
      } catch {
        // Erro já tratado nos use cases
      } finally {
        setIsInitializing(false);
      }
    }

    hydrateSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const loggedUser = await authUseCases.login(email, password);
        setUser(loggedUser);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      legalActs?: LegalActAcceptance[]
    ) => {
      setIsLoading(true);
      try {
        const registeredUser = await authUseCases.register(fullName, email, password, legalActs);
        setUser(registeredUser);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const completeGoogleLogin = useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const loggedUser = await authUseCases.completeGoogleLogin(code);
        setUser(loggedUser);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    authUseCases.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const refreshedUser = await authUseCases.refreshUser();
    if (refreshedUser) setUser(refreshedUser);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitializing,
    login,
    register,
    completeGoogleLogin,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
