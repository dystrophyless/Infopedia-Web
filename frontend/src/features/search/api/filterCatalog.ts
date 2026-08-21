import { apiClient } from '../../../api/client';
import { normalizeTopicLocale } from '../../../api/topicLocale';
import type { BookCatalogItem, ChapterCatalogItem } from '../../../types';
import type { SearchRequestClient } from './searchRequestClient';

export async function getSearchFilterBooks(client: SearchRequestClient = apiClient): Promise<BookCatalogItem[]> {
  const { data } = await client.get<BookCatalogItem[]>('/api/topics/books');
  return data;
}

export async function getSearchFilterChapters(
  locale: string = 'kk',
  client: SearchRequestClient = apiClient,
): Promise<ChapterCatalogItem[]> {
  const { data } = await client.get<ChapterCatalogItem[]>('/api/topics/chapters', {
    params: { locale: normalizeTopicLocale(locale) },
  });
  return data;
}

// Compatibility names mirror the historical shared topics API without coupling
// this feature to ordinary term-search endpoints.
export const getTopicBooks = getSearchFilterBooks;
export const getTopicChapters = getSearchFilterChapters;
