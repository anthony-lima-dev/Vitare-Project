export interface PatientFullProfile {
  patient: {
    fullName: string;
    email: string;
    phone: string | null;
    address: string | null;
    birthDate: string | null;
    bloodType: string | null;
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

export abstract class PatientLookupRepository {
  abstract findFullProfileByCpf(
    cpf: string,
  ): Promise<PatientFullProfile | null>;
}
