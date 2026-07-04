import { apiClient } from './client';
import type { BookCatalogItem, ChapterCatalogItem } from '../types';

export async function getTopicBooks(): Promise<BookCatalogItem[]> {
  const { data } = await apiClient.get<BookCatalogItem[]>('/api/topics/books');
  return data;
}

export async function getTopicChapters(): Promise<ChapterCatalogItem[]> {
  const { data } = await apiClient.get<ChapterCatalogItem[]>('/api/topics/chapters');
  return data;
}
