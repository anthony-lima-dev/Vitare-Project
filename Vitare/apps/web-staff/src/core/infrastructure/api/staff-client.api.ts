import axios from "axios";
import { staffSessionStorage } from "../session/staff-session.storage";

function resolveStaffApiBaseUrl(value: string | undefined): string {
  const configured = value?.trim();

  if (!configured) return "/api/v1";
  if (configured.endsWith("/api/v1")) return configured;
  if (configured.endsWith("/api")) return `${configured}/v1`;

  return `${configured.replace(/\/$/, "")}/api/v1`;
}

const PUBLIC_STAFF_AUTH_ENDPOINT =
  /\/staff\/auth\/(?:login(?:\/check-realm)?|setup-status)(?:[/?]|$)/i;

function isPublicStaffAuthEndpoint(url?: string): boolean {
  return Boolean(url && PUBLIC_STAFF_AUTH_ENDPOINT.test(url));
}

export const staffApiClient = axios.create({
  baseURL: resolveStaffApiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 10_000,
});

staffApiClient.interceptors.request.use((config) => {
  const token = staffSessionStorage.getAccessToken();
  if (token && !isPublicStaffAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

staffApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isPublicStaffAuthEndpoint(error.config?.url)
    ) {
      staffSessionStorage.clear();

      if (!window.location.pathname.startsWith("/monitoramento/login")) {
        window.location.href = "/monitoramento/login";
      }
    }

    return Promise.reject(error);
  },
);
