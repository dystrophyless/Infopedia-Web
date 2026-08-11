import { apiClient } from './client';
import type { FeaturedTerm, Term, Topic } from '../types';
import type { SearchRequestClient } from '../features/search/api/searchRequestClient';

export { searchTerms } from '../features/search/api/termSearch';

export async function getTerm(publicId: string): Promise<Term> {
  const { data } = await apiClient.get<Term>(`/api/terms/${publicId}`);
  return data;
}

export async function getFeaturedTerms(limit = 10, client: SearchRequestClient = apiClient): Promise<FeaturedTerm[]> {
  const { data } = await client.get<FeaturedTerm[]>('/api/terms/featured', {
    params: { limit },
  });
  return data;
}

export type TermBook = NonNullable<Topic['book']>;

export async function getTermBooks(publicId: string): Promise<TermBook[]> {
  const { data } = await apiClient.get<TermBook[]>(`/api/terms/${publicId}/books_list`);
  return data;
}
