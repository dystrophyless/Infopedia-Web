import { apiClient } from '../../../api/client';
import type { BookCatalogItem, ChapterCatalogItem } from '../../../types';

export async function getSearchFilterBooks(): Promise<BookCatalogItem[]> {
  const { data } = await apiClient.get<BookCatalogItem[]>('/api/topics/books');
  return data;
}

export async function getSearchFilterChapters(): Promise<ChapterCatalogItem[]> {
  const { data } = await apiClient.get<ChapterCatalogItem[]>('/api/topics/chapters');
  return data;
}

// Compatibility names mirror the historical shared topics API without coupling
// this feature to semantic-search task endpoints.
export const getTopicBooks = getSearchFilterBooks;
export const getTopicChapters = getSearchFilterChapters;
