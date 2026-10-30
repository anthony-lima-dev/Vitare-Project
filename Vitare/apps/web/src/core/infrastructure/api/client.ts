import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { authSessionStorage } from "../session/auth-session.storage";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
const PUBLIC_AUTH_ENDPOINT =
  /\/auth\/(?:register|login(?:\/check-realm)?|google(?:\/exchange)?|refresh|forgot-password|reset-password|logout)(?:[/?]|$)/i;

function isPublicAuthEndpoint(url?: string): boolean {
  return Boolean(url && PUBLIC_AUTH_ENDPOINT.test(url));
}

apiClient.interceptors.request.use((config) => {
  // Não enviar credenciais antigas a endpoints públicos de autenticação.
  if (!isPublicAuthEndpoint(config.url)) {
    const token = authSessionStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
          originalRequest.headers.set("Authorization", `Bearer ${token}`);
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    const refreshToken = authSessionStorage.getRefreshToken();
    if (!refreshToken) {
      authSessionStorage.clear();
      isRefreshing = false;
      if (window.location.pathname !== "/login")
        window.location.href = "/login";
      refreshQueue.forEach((callback) => callback(null));
      refreshQueue = [];
      return Promise.reject(error);
    }

    let refreshedTokens: { accessToken: string; refreshToken: string };
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      refreshedTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (refreshError) {
      authSessionStorage.clear();
      const queued = refreshQueue;
      refreshQueue = [];
      queued.forEach((callback) => callback(null));
      if (window.location.pathname !== "/login")
        window.location.href = "/login";
      isRefreshing = false;
      return Promise.reject(refreshError ?? error);
    }

    authSessionStorage.save(refreshedTokens);
    const queued = refreshQueue;
    refreshQueue = [];
    queued.forEach((callback) => callback(refreshedTokens.accessToken));

    originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
    originalRequest.headers.set(
      "Authorization",
      `Bearer ${refreshedTokens.accessToken}`,
    );
    isRefreshing = false;

    try {
      return await apiClient(originalRequest);
    } catch (retryError) {
      if (
        axios.isAxiosError(retryError) &&
        retryError.response?.status === 401
      ) {
        authSessionStorage.clear();
        if (window.location.pathname !== "/login")
          window.location.href = "/login";
      }
      return Promise.reject(retryError);
    }
  },
);
