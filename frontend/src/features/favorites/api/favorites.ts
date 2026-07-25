import { apiClient } from '../../../api/client';
import type { Term } from '../../../types';

export interface FavoritesPage {
  terms: Term[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface FavoriteStatusesResponse {
  favorite_term_public_ids: string[];
}

export interface FavoriteMutationResponse {
  term_public_id: string;
  is_favorite: true;
}

export async function getFavorites(skip = 0, limit = 20): Promise<FavoritesPage> {
  const { data } = await apiClient.get<FavoritesPage>('/api/favorites', {
    params: { skip, limit },
  });
  return data;
}

export async function getFavoriteStatuses(
  termPublicIds: string[],
): Promise<FavoriteStatusesResponse> {
  const { data } = await apiClient.post<FavoriteStatusesResponse>('/api/favorites/status', {
    term_public_ids: [...new Set(termPublicIds)],
  });
  return data;
}

export async function addFavorite(termRef: string): Promise<FavoriteMutationResponse> {
  const { data } = await apiClient.put<FavoriteMutationResponse>(`/api/favorites/${termRef}`);
  return data;
}

export async function removeFavorite(termRef: string): Promise<void> {
  await apiClient.delete(`/api/favorites/${termRef}`);
}

// Explicit aliases make the API boundary convenient for callers that use fetch-style verbs.
export const fetchFavorites = getFavorites;
export const fetchFavoriteStatuses = getFavoriteStatuses;
export const createFavorite = addFavorite;
export const deleteFavorite = removeFavorite;
