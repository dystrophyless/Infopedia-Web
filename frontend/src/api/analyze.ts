import { API_URL, apiClient } from './client';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';

export async function createAnalyzeTask(file: File): Promise<AnalyzeTask> {
  const form = new FormData();
  form.append('file', file);

  const { data } = await apiClient.post<AnalyzeTask>('/api/analyze', form);
  return data;
}

export async function getAnalyzeTask(taskId: string): Promise<AnalyzeTask> {
  const { data } = await apiClient.get<AnalyzeTask>(`/api/analyze/${taskId}`);
  return data;
}

export async function getLatestAnalyzeResult(): Promise<AnalyzeChapterResult[]> {
  const { data } = await apiClient.get<AnalyzeChapterResult[]>('/api/analyze/latest');
  return data;
}

export function buildAnalyzeSseUrl(taskId: string): string {
  return `${API_URL}/api/analyze/${taskId}/events`;
}
