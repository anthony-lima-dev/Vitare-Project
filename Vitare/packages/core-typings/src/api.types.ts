import type { BloodType } from "./blood-types";

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  birthDate: string | null;
  bloodType: BloodType | null;
  weightKg: number | null;
  heightCm: number | null;
  cpf: string | null;
  phone: string | null;
  address: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  medicationsDictionaryId: string | null;
  isActive: boolean;
}

export interface CreateMedicationPayload {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  medicationsDictionaryId?: string;
}

export interface ChronicCondition {
  id: string;
  userId: string;
  diseaseId: string;
  diseaseName: string;
  diseaseCode: string;
  notes: string | null;
  diagnosedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateConditionPayload {
  diseaseId: string;
  diagnosedAt?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  isPrimary: boolean;
}

export interface CreateContactPayload {
  name: string;
  phone: string;
  relationship?: string;
  isPrimary?: boolean;
}

export interface UpdatePatientPayload {
  fullName?: string;
  birthDate?: string;
  bloodType?: BloodType;
  weightKg?: number;
  heightCm?: number;
  cpf?: string;
  phone?: string;
  address: string | null;
}

export interface Allergy {
  id: string;
  userId: string;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateAllergyPayload {
  name: string;
  severity?: string;
  notes?: string;
}

export interface ForbiddenMedication {
  id: string;
  userId: string;
  medicationsDictionaryId: string;
  medicationsName: string;
  medicationsLaboratorio: string;
  reason: string;
  createdAt: string;
}

export interface CreateForbiddenMedicationPayload {
  medicationsDictionaryId: string;
  reason: string;
}

export interface Staff {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  registrationNumber: string;
  role: string;
  password?: string;
}

export interface StaffTokenResponse {
  accessToken: string;
  staff: Staff;
}

export interface LegalDocument {
  actType: 'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'EXPLICIT_CONSENT';
  title: string;
  version: string;
  contentHash: string;
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION';
  purpose: string;
  origin: string;
}

export interface LegalActAcceptance {
  actType: 'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'EXPLICIT_CONSENT';
  documentVersion: string;
  contentHash: string;
}

/**
 * Documentos jurídicos exigidos no onboarding (T-11).
 * Espelha as versões vigentes configuradas no backend
 * (apps/api/src/config/configuration.ts, LEGAL.requiredDocuments).
 * O backend é a fonte da verdade para validação; o frontend usa estes
 * valores apenas para exibição e para montar o envio do aceite.
 */
export const REQUIRED_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    actType: 'TERMS_OF_USE',
    title: 'Termos de Uso',
    version: 'v1.0.0',
    contentHash: 'sha256:terms-of-use-v1-0-0',
    legalBasis: 'CONTRACT',
    purpose: 'Aceite dos Termos de Uso (cadastro de paciente)',
    origin: 'patient-register',
  },
  {
    actType: 'PRIVACY_NOTICE',
    title: 'Aviso de Privacidade',
    version: 'v1.0.0',
    contentHash: 'sha256:privacy-notice-v1-0-0',
    legalBasis: 'LEGAL_OBLIGATION',
    purpose: 'Ciência do Aviso de Privacidade (cadastro de paciente)',
    origin: 'patient-register',
  },
];

export interface EmergencyFeedItem {
  id: string;
  triggeredAt: string; // ISO date
  status: "TRIGGERED" | "NOTIFIED" | "ACCEPTED" | "RESOLVED";
  latitude: number | null;
  longitude: number | null;
  assignedStaffId: string | null;
  acceptedAt: string | null;
  resolvedAt: string | null;
  patient: {
    fullName: string;
    cpf: string | null;
  };
}

export interface PatientFullProfile {
  patient: {
    fullName: string;
    email: string;
    phone: string | null;
    address: string | null;
    birthDate: string | null;
    bloodType: BloodType | null;
    weightKg: number | null;
    heightCm: number | null;
  };
  conditions: Array<{
    name: string;
    code: string;
    diagnosedAt: string | null;
    notes: string | null;
  }>;
  allergies: Array<{
    name: string;
    severity: string | null;
    notes: string | null;
  }>;
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
  }>;
  inactiveMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate: string | null;
  }>;
  forbiddenMedications: Array<{
    name: string;
    laboratorio: string;
    reason: string;
  }>;
}
