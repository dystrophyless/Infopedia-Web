import { apiClient } from './client';
import type { User, UserGrade } from '../types';

export interface UsernameAvailability {
  username: string;
  available: boolean;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/users/me');
  return data;
}

export async function checkUsernameAvailability(username: string): Promise<UsernameAvailability> {
  const { data } = await apiClient.get<UsernameAvailability>('/api/users/username-availability', {
    params: { username },
  });
  return data;
}

export async function setMyUsername(username: string): Promise<User> {
  const { data } = await apiClient.patch<User>('/api/users/me/username', {
    username,
  });
  return data;
}

export async function updateMyUsername(userId: number, username: string): Promise<User> {
  const { data } = await apiClient.patch<User>(`/api/users/${userId}`, {
    username,
  });
  return data;
}

export async function setMyGrade(grade: UserGrade): Promise<User> {
  const { data } = await apiClient.patch<User>('/api/users/me/grade', {
    grade,
  });
  return data;
}

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiClient.patch('/api/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export interface PasswordCreationResult {
  created: boolean;
}

export async function createMyPassword(newPassword: string): Promise<PasswordCreationResult> {
  const { data } = await apiClient.post<PasswordCreationResult>('/api/users/me/password', {
    new_password: newPassword,
  });
  return data;
}

export async function verifyMyCurrentPassword(currentPassword: string): Promise<void> {
  await apiClient.post('/api/users/me/password/verify', {
    current_password: currentPassword,
  });
}

export async function deleteMyAccount(userId: number): Promise<void> {
  await apiClient.delete(`/api/users/${userId}`);
}
