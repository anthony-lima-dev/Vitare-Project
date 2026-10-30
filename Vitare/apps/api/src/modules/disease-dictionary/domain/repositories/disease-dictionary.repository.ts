export interface DiseaseSearchResult {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
}

export abstract class DiseaseDictionaryRepository {
  abstract search(query: string): Promise<DiseaseSearchResult[]>;
  abstract findById(id: string): Promise<DiseaseSearchResult | null>;
}
