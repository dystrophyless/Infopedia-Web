import { apiClient } from './client';
import type { Term } from '../types';

export async function searchTerms(query: string, limit = 10): Promise<Term[]> {
  const { data } = await apiClient.get<Term[]>('/api/search/', {
    params: { query, limit },
  });
  return data;
}

export async function getTerm(id: number | string): Promise<Term> {
  const { data } = await apiClient.get<Term>(`/api/terms/${id}`);
  return data;
}

export async function getTermBooks(id: number | string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/api/terms/${id}/books_list`);
  return data;
}
