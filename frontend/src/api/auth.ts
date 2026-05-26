import { apiClient } from './client';
import type { AuthTokens } from '../types';

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
