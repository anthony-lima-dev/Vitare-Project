import { createContext } from "react";
import type { Staff, LegalActAcceptance } from "@vitare/core-typings";

export interface RegisterStaffData {
  fullName: string;
  email: string;
  cpf: string;
  registrationNumber: string;
  role: string;
  password: string;
  /** Obrigatória para a PRIMEIRA conta (bootstrap controlado). */
  bootstrapKey?: string;
  /** Aceite dos termos e aviso de privacidade (versão vigente). */
  legalActs?: LegalActAcceptance[];
}

export interface StaffAuthPorts {
  login(email: string, password: string): Promise<{ accessToken: string; staff: Staff }>;
  register(data: RegisterStaffData): Promise<{ accessToken: string; staff: Staff }>;
  me(): Promise<Staff>;
}

export interface StaffSessionPort {
  getAccessToken(): string | null;
  save(accessToken: string, staff: Staff): void;
  clear(): void;
  saveProfile(staff: Staff): void;
  getProfile(): Staff | null;
}

export interface StaffAuthContextValue {
  staff: Staff | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterStaffData) => Promise<void>;
  logout: () => void;
}

export const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export interface StaffAuthUseCases {
  login(email: string, password: string): Promise<Staff>;
  register(data: RegisterStaffData): Promise<Staff>;
  logout(): void;
  hydrateSession(): Promise<Staff | null>;
}
