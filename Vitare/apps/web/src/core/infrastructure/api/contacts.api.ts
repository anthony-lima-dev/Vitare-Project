import { apiClient } from "./client";
import type { EmergencyContact } from "@vitare/core-typings";
import { cachedGet, invalidateCachedGet } from "../pwa/offline-cache";

export const contactsApi = {
  findAll: () =>
    cachedGet<EmergencyContact[]>(
      "/emergency-contacts",
      () => apiClient.get<EmergencyContact[]>("/emergency-contacts"),
    ),
  create: async (data: Omit<EmergencyContact, "id">) => {
    const response = await apiClient.post<EmergencyContact>("/emergency-contacts", data);
    await invalidateCachedGet("/emergency-contacts");
    return response;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/emergency-contacts/${id}`);
    await invalidateCachedGet("/emergency-contacts");
    return response;
  },
};
