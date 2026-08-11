import type { Term } from '../../../types';
import type { TermSearchPageResponse } from '../api/termSearch';

export interface SearchPageState {
  terms: Term[];
  total: number;
  hasMore: boolean;
}

export function replaceSearchPage(page: TermSearchPageResponse): SearchPageState {
  if (page.skip !== 0) throw new Error('A replacement search page must start at skip 0.');
  return { terms: [...page.terms], total: page.total, hasMore: page.has_more };
}

export function appendSearchPage(
  current: SearchPageState,
  page: TermSearchPageResponse,
): SearchPageState {
  if (page.skip !== current.terms.length) {
    throw new Error('An appended search page skip must equal the loaded term count.');
  }
  return {
    terms: [...current.terms, ...page.terms],
    total: page.total,
    hasMore: page.has_more,
  };
}
