import { apiClient } from './client';
import type { SearchTask } from '../types';

export async function createSearchTask(query: string): Promise<SearchTask> {
  const { data } = await apiClient.post<SearchTask>('/api/search', { query });
  return data;
}

export async function getSearchTask(taskId: string): Promise<SearchTask> {
  const { data } = await apiClient.get<SearchTask>(`/api/search/${taskId}`);
  return data;
}

export function buildSseUrl(taskId: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
  return `${base}/api/search/${taskId}/events`;
}
