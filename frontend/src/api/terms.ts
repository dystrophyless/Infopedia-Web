import { apiClient } from './client';
import type { FeaturedTerm, Term, Topic } from '../types';

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

export async function getFeaturedTerms(limit = 10): Promise<FeaturedTerm[]> {
  const { data } = await apiClient.get<FeaturedTerm[]>('/api/terms/featured', {
    params: { limit },
  });
  return data;
}

export type TermBook = NonNullable<Topic['book']>;

export async function getTermBooks(publicId: string): Promise<TermBook[]> {
  const { data } = await apiClient.get<TermBook[]>(`/api/terms/${publicId}/books_list`);
  return data;
}
