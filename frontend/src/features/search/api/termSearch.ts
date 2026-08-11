import { apiClient } from '../../../api/client';
import type { Term } from '../../../types';
import type { SearchRequestClient } from './searchRequestClient';

export interface TermSearchRequest {
  query: string;
  grades: number[];
  bookRefs: string[];
  chapterRefs: string[];
  entOnly: boolean;
  skip: number;
  limit: number;
}

export interface TermSearchPageResponse {
  terms: Term[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export async function searchTerms(
  request: TermSearchRequest,
  signal?: AbortSignal,
  client: SearchRequestClient = apiClient,
): Promise<TermSearchPageResponse> {
  const params = new URLSearchParams();
  params.set('query', request.query);
  params.set('skip', String(request.skip));
  params.set('limit', String(request.limit));
  request.grades.forEach((grade) => params.append('grade', String(grade)));
  request.bookRefs.forEach((bookRef) => params.append('book', bookRef));
  request.chapterRefs.forEach((chapterRef) => params.append('chapter', chapterRef));
  params.set('ent_only', String(request.entOnly));
  const { data } = await client.get<TermSearchPageResponse>('/api/search/terms', {
    params,
    signal,
  });
  return data;
}
