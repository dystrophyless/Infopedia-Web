import { API_URL, apiClient } from './client';
import { normalizeTopicLocale } from './topicLocale';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';

export async function createAnalyzeTask(file: File, locale: string = 'kk'): Promise<AnalyzeTask> {
  const form = new FormData();
  form.append('file', file);
  form.append('locale', normalizeTopicLocale(locale));

  const { data } = await apiClient.post<AnalyzeTask>('/api/analyze', form);
  return data;
}

export async function getAnalyzeTask(taskId: string): Promise<AnalyzeTask> {
  const { data } = await apiClient.get<AnalyzeTask>(`/api/analyze/${taskId}`);
  return data;
}

export async function getLatestAnalyzeResult(locale: string = 'kk'): Promise<AnalyzeChapterResult[]> {
  const { data } = await apiClient.get<AnalyzeChapterResult[]>('/api/analyze/latest', {
    params: { locale: normalizeTopicLocale(locale) },
  });
  return data;
}

export function buildAnalyzeSseUrl(taskId: string): string {
  return `${API_URL}/api/analyze/${taskId}/events`;
}
