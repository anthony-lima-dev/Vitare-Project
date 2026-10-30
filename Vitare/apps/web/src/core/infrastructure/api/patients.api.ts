import { apiClient } from "./client";
import type { User, UpdatePatientPayload } from "@vitare/core-typings";
import {
  cachedGet,
  invalidateCachedGet,
  setOfflineCacheUserScope,
} from "../pwa/offline-cache";
import { putIndexedDbCache } from "../pwa/indexed-db";

export const patientsApi = {
  /** Consulta de identidade sem fallback de cache: obrigatória após login/cadastro. */
  getProfileFresh: () => apiClient.get<User>("/patients/me"),

  /** Consulta com suporte offline para telas de perfil já autenticadas. */
  getProfile: async () => {
    const response = await cachedGet<User>("/patients/me", () =>
      apiClient.get<User>("/patients/me"),
    );
    if (response.data?.id) {
      setOfflineCacheUserScope(response.data.id);

      // A response proveniente do IndexedDB mantém o timestamp original;
      // somente uma resposta efetivamente obtida do backend pode renovar o TTL.
      if (response.headers["x-vitare-cache"] !== "indexeddb") {
        const storedAt = Date.now();
        await putIndexedDbCache({
          key: `${response.data.id}:GET:/patients/me`,
          scope: response.data.id,
          url: "/patients/me",
          storedAt,
          expiresAt: storedAt + 15 * 60 * 1000,
          data: response.data,
        });
      }
    }
    return response;
  },
  updateProfile: async (data: UpdatePatientPayload) => {
    const response = await apiClient.put<User>("/patients/me", data);
    if (response.data?.id) {
      setOfflineCacheUserScope(response.data.id);
      await invalidateCachedGet("/patients/me");
    }
    return response;
  },
  deleteAccount: () => apiClient.delete("/patients/me"),
};
