import { apiClient } from './client';
import type { User } from '../types';

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/users/me');
  return data;
}
