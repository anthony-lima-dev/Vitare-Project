import { Injectable } from '@nestjs/common';
import { MedicationsDictionaryRepository } from '../domain/repositories/medications-dictionary.repository';

@Injectable()
export class MedicationsDictionaryService {
  constructor(private readonly repository: MedicationsDictionaryRepository) {}

  search(query?: string) {
    if (!query || query.length < 2) return [];
    return this.repository.search(query);
  }
}
