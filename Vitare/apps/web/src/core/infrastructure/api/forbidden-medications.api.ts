import { apiClient } from "./client";
import type {
  ForbiddenMedication,
  CreateForbiddenMedicationPayload,
} from "@vitare/core-typings";
import { cachedGet, invalidateCachedGet } from "../pwa/offline-cache";

export const forbiddenMedicationsApi = {
  findAll: () =>
    cachedGet<ForbiddenMedication[]>(
      "/forbidden-medications",
      () => apiClient.get<ForbiddenMedication[]>("/forbidden-medications"),
    ),
  create: async (data: CreateForbiddenMedicationPayload) => {
    const response = await apiClient.post<ForbiddenMedication>("/forbidden-medications", data);
    await invalidateCachedGet("/forbidden-medications");
    return response;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/forbidden-medications/${id}`);
    await invalidateCachedGet("/forbidden-medications");
    return response;
  },
};
