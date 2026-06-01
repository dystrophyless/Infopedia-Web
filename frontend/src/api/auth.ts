import { API_URL, apiClient } from './client';
import type { AuthTokens } from '../types';

const GOOGLE_NEXT_STORAGE_KEY = 'infopedia_google_auth_next';

function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.startsWith('/login') || next.startsWith('/register')) return '/';
  return next;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);
  const { data } = await apiClient.post<AuthTokens>('/api/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export interface StartRegistrationPayload {
  email: string;
  password: string;
}

export async function startRegistration(
  payload: StartRegistrationPayload
): Promise<void> {
  await apiClient.post('/api/auth/register', {
    email: payload.email,
    password: payload.password,
  });
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/api/auth/verify-email', {
    email: payload.email,
    code: payload.code,
  });
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/api/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/api/auth/reset-password', {
    token,
    new_password: newPassword,
  });
}

export function startGoogleAuth(next?: string) {
  const sanitizedNext = sanitizeNextPath(next);
  window.sessionStorage.setItem(GOOGLE_NEXT_STORAGE_KEY, sanitizedNext);
  window.location.assign(`${API_URL}/api/auth/google/url`);
}

export function consumeGoogleAuthNext(): string {
  const next = sanitizeNextPath(window.sessionStorage.getItem(GOOGLE_NEXT_STORAGE_KEY));
  window.sessionStorage.removeItem(GOOGLE_NEXT_STORAGE_KEY);
  return next;
}

export function consumeGoogleAuthTokensFromHash(): AuthTokens | null {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return null;

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: params.get('token_type') ?? 'bearer',
  };
}

export function consumeGoogleAuthErrorFromHash(): string | null {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const error = params.get('error');

  if (!error) return null;

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  return error;
}

export async function completeGoogleAuth(
  code: string,
  state: string
): Promise<AuthTokens> {
  const { data } = await apiClient.get<AuthTokens>('/api/auth/google/callback', {
    params: { code, state },
    withCredentials: true,
  });
  return data;
}
