import { apiClient } from "./client";
import type { CreateMedicationPayload, Medication } from "@vitare/core-typings";
import { cachedGet, invalidateCachedGet } from "../pwa/offline-cache";

export const medicationsApi = {
  findAll: () =>
    cachedGet<Medication[]>(
      "/medications",
      () => apiClient.get<Medication[]>("/medications"),
    ),
  create: async (data: CreateMedicationPayload) => {
    const response = await apiClient.post<Medication>("/medications", data);
    await invalidateCachedGet("/medications");
    return response;
  },
  update: async (id: string, data: Partial<CreateMedicationPayload>) => {
    const response = await apiClient.patch<Medication>(`/medications/${id}`, data);
    await invalidateCachedGet("/medications");
    return response;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/medications/${id}`);
    await invalidateCachedGet("/medications");
    return response;
  },
};
