import { createContext } from "react";
import type { User, LegalActAcceptance } from "@vitare/core-typings";

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeGoogleLogin: (code: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    legalActs?: LegalActAcceptance[],
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
