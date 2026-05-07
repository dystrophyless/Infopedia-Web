import { apiClient } from './client';
import type { AuthTokens, User } from '../types';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);
  const { data } = await apiClient.post<AuthTokens>('/api/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  language?: 'ru' | 'kk';
  grade?: '10' | '11' | 'undefined';
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>('/api/users', {
    username: payload.username,
    email: payload.email,
    password: payload.password,
    language: payload.language ?? 'ru',
    grade: payload.grade ?? 'undefined',
  });
  return data;
}
