import { apiClient } from './client';
import type { FeaturedTerm, Term } from '../types';

export async function searchTerms(query: string, limit = 10): Promise<Term[]> {
  const { data } = await apiClient.get<Term[]>('/api/search/', {
    params: { query, limit },
  });
  return data;
}

export async function getTerm(publicId: string): Promise<Term> {
  const { data } = await apiClient.get<Term>(`/api/terms/${publicId}`);
  return data;
}

export async function getFeaturedTerms(): Promise<FeaturedTerm[]> {
  const { data } = await apiClient.get<FeaturedTerm[]>('/api/terms/featured');
  return data;
}

export async function getTermBooks(publicId: string): Promise<Array<{ public_id?: string; name: string }>> {
  const { data } = await apiClient.get<Array<{ public_id?: string; name: string }>>(`/api/terms/${publicId}/books_list`);
  return data;
}
