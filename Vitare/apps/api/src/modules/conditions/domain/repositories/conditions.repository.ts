export interface ConditionWithDisease {
  id: string;
  userId: string;
  diseaseId: string;
  diseaseName: string;
  diseaseCode: string;
  notes: string | null;
  diagnosedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export abstract class ConditionsRepository {
  abstract findAllActiveByUser(userId: string): Promise<ConditionWithDisease[]>;
  abstract findById(id: string): Promise<ConditionWithDisease | null>;
  abstract create(
    userId: string,
    diseaseId: string,
    data: { notes?: string; diagnosedAt?: Date },
  ): Promise<ConditionWithDisease>;
  abstract softDelete(id: string): Promise<void>;
}
