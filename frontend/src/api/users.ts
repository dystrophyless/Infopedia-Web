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

export async function deleteMyAccount(userId: number): Promise<void> {
  await apiClient.delete(`/api/users/${userId}`);
}
