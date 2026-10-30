import { Injectable } from '@nestjs/common';
import { DiseaseDictionaryRepository } from '../domain/repositories/disease-dictionary.repository';

@Injectable()
export class DiseaseDictionaryService {
  constructor(private readonly repository: DiseaseDictionaryRepository) {}

  search(query?: string) {
    if (!query || query.length < 2) return [];
    return this.repository.search(query);
  }
}
