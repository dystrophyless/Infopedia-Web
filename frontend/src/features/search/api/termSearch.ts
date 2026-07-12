import { apiClient } from '../../../api/client';
import type { Term } from '../../../types';

export interface TermSearchParams {
  query: string;
  limit: number;
}

export async function searchTerms(query: string, limit = 10): Promise<Term[]> {
  const params: TermSearchParams = { query, limit };
  const { data } = await apiClient.get<Term[]>('/api/search/', { params });
  return data;
}
