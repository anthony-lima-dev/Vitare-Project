export interface ForbiddenMedicationWithDetails {
  id: string;
  userId: string;
  medicationsDictionaryId: string;
  medicationsName: string;
  medicationsLaboratorio: string;
  reason: string;
  createdAt: Date;
}

export abstract class ForbiddenMedicationsRepository {
  abstract findAllByUser(
    userId: string,
  ): Promise<ForbiddenMedicationWithDetails[]>;
  abstract findById(id: string): Promise<ForbiddenMedicationWithDetails | null>;
  abstract create(
    userId: string,
    data: { medicationsDictionaryId: string; reason: string },
  ): Promise<ForbiddenMedicationWithDetails>;
  abstract remove(id: string): Promise<void>;
  abstract isForbidden(
    userId: string,
    medicationsDictionaryId: string,
  ): Promise<boolean>;
}
