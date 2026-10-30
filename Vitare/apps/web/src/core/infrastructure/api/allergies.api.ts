import { apiClient } from "./client";
import type { Allergy, CreateAllergyPayload } from "@vitare/core-typings";
import { cachedGet, invalidateCachedGet } from "../pwa/offline-cache";

export const allergiesApi = {
  findAll: () =>
    cachedGet<Allergy[]>(
      "/allergies",
      () => apiClient.get<Allergy[]>("/allergies"),
    ),
  create: async (data: CreateAllergyPayload) => {
    const response = await apiClient.post<Allergy>("/allergies", data);
    await invalidateCachedGet("/allergies");
    return response;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/allergies/${id}`);
    await invalidateCachedGet("/allergies");
    return response;
  },
};
