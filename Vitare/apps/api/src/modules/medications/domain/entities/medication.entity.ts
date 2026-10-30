/** Medicamento em uso pelo paciente (agregado do contexto Medications). */
export interface Medication {
  id: string;
  userId: string;
  medicationsDictionaryId: string | null;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Linha de auditoria imutável de alterações de um medicamento. */
export interface MedicationHistoryEntry {
  id: string;
  medicationId: string;
  userId: string;
  changedAt: Date;
  changedField: string;
  oldValue: string | null;
  newValue: string | null;
}
