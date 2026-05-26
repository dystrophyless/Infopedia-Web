import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { AuthTokens } from '../types';

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RefreshableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<string | null> | null = null;

function shouldSkipRefresh(config: InternalAxiosRequestConfig | undefined) {
  const url = config?.url ?? '';
  return url.startsWith('/api/auth/');
}

function redirectToLogin() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
}

async function refreshAccessToken() {
  if (refreshRequest) return refreshRequest;

  refreshRequest = (async () => {
    const { refreshToken, user, logout, setAuth } = useAuthStore.getState();

    if (!refreshToken) return null;

    try {
      const { data } = await axios.post<AuthTokens>(
        `${API_URL}/api/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      setAuth(data.access_token, data.refresh_token, user);
      return data.access_token;
    } catch {
      logout();
      return null;
    }
  })().finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RefreshableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest)
    ) {
      originalRequest._retry = true;
      const token = await refreshAccessToken();

      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
