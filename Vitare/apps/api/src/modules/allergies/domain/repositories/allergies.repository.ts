import { Allergy } from '../entities/allergy.entity';

export abstract class AllergiesRepository {
  abstract findAllByUser(userId: string): Promise<Allergy[]>;
  abstract findById(id: string): Promise<Allergy | null>;
  abstract create(
    userId: string,
    data: { name: string; severity?: string; notes?: string },
  ): Promise<Allergy>;
  abstract remove(id: string): Promise<void>;
}
