import { apiClient } from "./client";
import { cachedGet, OFFLINE_CACHE_TTL } from "../pwa/offline-cache";

export interface MedicationSearchResult {
  id: string;
  nome: string;
  laboratorio: string;
  substancias: string[];
  apresentacoes: string[];
  tarjas: string[];
}

export const medicationDictionaryApi = {
  search: (query: string) =>
    cachedGet<MedicationSearchResult[]>(
      "/medications-dictionary",
      () => apiClient.get<MedicationSearchResult[]>("/medications-dictionary", { params: { search: query } }),
      { params: { search: query } },
      { ttlMs: OFFLINE_CACHE_TTL.dictionary },
    ),
};
