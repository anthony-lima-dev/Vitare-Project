import { apiClient } from "./client";
import type { ChronicCondition, CreateConditionPayload } from "@vitare/core-typings";
import { cachedGet, invalidateCachedGet } from "../pwa/offline-cache";

export const conditionsApi = {
  findAll: () =>
    cachedGet<ChronicCondition[]>(
      "/conditions",
      () => apiClient.get<ChronicCondition[]>("/conditions"),
    ),
  create: async (data: CreateConditionPayload) => {
    const response = await apiClient.post<ChronicCondition>("/conditions", data);
    await invalidateCachedGet("/conditions");
    return response;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/conditions/${id}`);
    await invalidateCachedGet("/conditions");
    return response;
  },
};
