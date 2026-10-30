import { useState, useCallback, useEffect, type ReactNode } from "react";
import { StaffAuthContext, type StaffAuthContextValue, type RegisterStaffData } from "../../core/application/auth/ports/staff-auth.port";
import { createStaffAuthUseCases } from "../../core/application/auth/use-cases/staff-auth.use-cases";
import { staffAuthApiAdapter } from "../../core/infrastructure/api/staff-auth.adapter";
import { staffSessionAdapter } from "../../core/infrastructure/session/staff-session.adapter";

// Create use cases with adapters (composition root)
const staffAuthUseCases = createStaffAuthUseCases(
  staffAuthApiAdapter,
  staffSessionAdapter
);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffAuthContextValue["staff"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function hydrateSession() {
      try {
        const hydratedStaff = await staffAuthUseCases.hydrateSession();
        setStaff(hydratedStaff);
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
        const loggedStaff = await staffAuthUseCases.login(email, password);
        setStaff(loggedStaff);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (data: RegisterStaffData) => {
      setIsLoading(true);
      try {
        const registeredStaff = await staffAuthUseCases.register(data);
        setStaff(registeredStaff);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    staffAuthUseCases.logout();
    setStaff(null);
  }, []);

  const value: StaffAuthContextValue = {
    staff,
    isAuthenticated: !!staff,
    isLoading,
    isInitializing,
    login,
    register,
    logout,
  };

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
}
