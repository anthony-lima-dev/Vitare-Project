import {
  Medication,
  MedicationHistoryEntry,
} from '../entities/medication.entity';

export interface CreateMedicationData {
  userId: string;
  medicationsDictionaryId?: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface UpdateMedicationData {
  medicationsDictionaryId?: string;
  name?: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  isActive?: boolean;
}

export abstract class MedicationsRepository {
  abstract findAllActiveByUser(userId: string): Promise<Medication[]>;
  abstract findById(id: string): Promise<Medication | null>;
  abstract create(data: CreateMedicationData): Promise<Medication>;
  abstract update(id: string, data: UpdateMedicationData): Promise<Medication>;
  abstract updateWithHistory(
    id: string,
    data: UpdateMedicationData,
    historyEntries: Array<{
      medicationId: string;
      userId: string;
      changedField: string;
      oldValue: string | null;
      newValue: string | null;
    }>,
  ): Promise<Medication>;
  abstract softDelete(id: string): Promise<void>;
  abstract findHistoryByMedication(
    medicationId: string,
  ): Promise<MedicationHistoryEntry[]>;
  abstract recordHistoryEntries(
    entries: Array<{
      medicationId: string;
      userId: string;
      changedField: string;
      oldValue: string | null;
      newValue: string | null;
    }>,
  ): Promise<void>;
}
