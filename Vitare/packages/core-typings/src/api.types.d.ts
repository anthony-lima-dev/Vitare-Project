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
export interface EmergencyFeedItem {
    id: string;
    userId: string;
    triggeredAt: string;
    latitude: number | string | null;
    longitude: number | string | null;
    patientSnapshot: {
        patient: {
            fullName: string;
            cpf: string | null;
            bloodType: BloodType | null;
            birthDate: string | null;
            weightKg: number | null;
            heightCm: number | null;
        };
        conditions: Array<{
            name: string;
            code: string;
        }>;
        medications: Array<{
            name: string;
            dosage: string;
            frequency?: string;
            medicationsDictionaryId?: string;
        }>;
        contacts: Array<{
            name: string;
            phone: string;
            isPrimary: boolean;
        }>;
        allergies: Array<{
            name: string;
            severity: string | null;
            notes: string | null;
        }>;
        capturedAt: string;
    };
    status: "TRIGGERED" | "NOTIFIED" | "RESOLVED";
    notes: string | null;
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
