import { apiClient } from "./client";
import { cachedGet, OFFLINE_CACHE_TTL } from "../pwa/offline-cache";

export interface DiseaseSearchResult {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
}

export const diseaseDictionaryApi = {
  search: (query: string) =>
    cachedGet<DiseaseSearchResult[]>(
      "/disease-dictionary",
      () => apiClient.get<DiseaseSearchResult[]>("/disease-dictionary", { params: { search: query } }),
      { params: { search: query } },
      { ttlMs: OFFLINE_CACHE_TTL.dictionary },
    ),
};
