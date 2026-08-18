import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  getFavoriteStatuses: vi.fn(),
  getFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));

vi.mock('../api/favorites', () => api);

import { useFavoritesStore } from './favoritesStore';

const term = (public_id: string) => ({ public_id, name: `Term ${public_id}` });

describe('favorites store', () => {
  beforeEach(() => {
    useFavoritesStore.getState().reset();
    useFavoritesStore.getState().setOwnerUserId(1);
    vi.clearAllMocks();
    api.getFavorites.mockResolvedValue({
      terms: [],
      total: 0,
      skip: 0,
      limit: 20,
      has_more: false,
    });
    api.getFavoriteStatuses.mockResolvedValue({ favorite_term_public_ids: [] });
    api.addFavorite.mockResolvedValue({ term_public_id: 'a', is_favorite: true });
    api.removeFavorite.mockResolvedValue(undefined);
  });

  it('deduplicates an in-flight status batch', async () => {
    let resolveStatuses!: (value: { favorite_term_public_ids: string[] }) => void;
    api.getFavoriteStatuses.mockReturnValue(
      new Promise((resolve) => {
        resolveStatuses = resolve;
      }),
    );

    const first = useFavoritesStore.getState().ensureStatuses(['a', 'a', 'b']);
    const second = useFavoritesStore.getState().ensureStatuses(['a', 'b']);
    expect(api.getFavoriteStatuses).toHaveBeenCalledTimes(1);
    expect(api.getFavoriteStatuses).toHaveBeenCalledWith(['a', 'b']);

    resolveStatuses({ favorite_term_public_ids: ['b'] });
    await Promise.all([first, second]);
    expect(useFavoritesStore.getState().statusByTermRef).toEqual({ a: false, b: true });
    expect(useFavoritesStore.getState().pendingByTermRef).toEqual({ a: false, b: false });
  });

  it('optimistically removes a favorite and restores it when deletion fails', async () => {
    api.getFavorites.mockResolvedValue({
      terms: [term('a')],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    });
    await useFavoritesStore.getState().loadFavorites();
    let rejectDelete!: (error: Error) => void;
    api.removeFavorite.mockReturnValue(
      new Promise((_, reject) => {
        rejectDelete = reject;
      }),
    );

    const removal = useFavoritesStore.getState().removeFavorite('a');
    expect(useFavoritesStore.getState().list).toEqual([]);
    expect(useFavoritesStore.getState().statusByTermRef.a).toBe(false);

    rejectDelete(new Error('network'));
    await expect(removal).rejects.toThrow('network');
    expect(useFavoritesStore.getState().list).toEqual([term('a')]);
    expect(useFavoritesStore.getState().statusByTermRef.a).toBe(true);
    expect(useFavoritesStore.getState().pendingByTermRef.a).toBe(false);
  });

  it('guards duplicate toggle clicks while a mutation is pending', async () => {
    let resolveAdd!: (value: { term_public_id: string; is_favorite: true }) => void;
    api.addFavorite.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );

    const first = useFavoritesStore.getState().toggleFavorite('a');
    const second = useFavoritesStore.getState().toggleFavorite('a');
    expect(second).toBe(first);
    expect(api.addFavorite).toHaveBeenCalledTimes(1);

    resolveAdd({ term_public_id: 'a', is_favorite: true });
    await first;
    expect(useFavoritesStore.getState().statusByTermRef.a).toBe(true);
    expect(useFavoritesStore.getState().pendingByTermRef.a).toBe(false);
  });

  it('ignores a list response that belongs to a previous account', async () => {
    let resolveList!: (value: unknown) => void;
    api.getFavorites.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    const loading = useFavoritesStore.getState().loadFavorites();
    useFavoritesStore.getState().setOwnerUserId(2);
    resolveList({ terms: [term('stale')], total: 1, skip: 0, limit: 20, has_more: false });
    await loading;
    expect(useFavoritesStore.getState().ownerUserId).toBe(2);
    expect(useFavoritesStore.getState().list).toEqual([]);
  });

  it('clears loaded favorites when switching accounts', async () => {
    api.getFavorites.mockResolvedValue({
      terms: [term('account-a')],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    await useFavoritesStore.getState().loadFavorites();
    expect(useFavoritesStore.getState().list).toEqual([term('account-a')]);

    useFavoritesStore.getState().setOwnerUserId(2);

    expect(useFavoritesStore.getState().ownerUserId).toBe(2);
    expect(useFavoritesStore.getState().list).toEqual([]);
    expect(useFavoritesStore.getState().statusByTermRef).toEqual({});
  });

  it('rebases the load-more cursor after removing a loaded favorite', async () => {
    api.getFavorites
      .mockResolvedValueOnce({
        terms: [term('a'), term('b')],
        total: 3,
        skip: 0,
        limit: 2,
        has_more: true,
      })
      .mockResolvedValueOnce({
        terms: [term('c')],
        total: 2,
        skip: 1,
        limit: 2,
        has_more: false,
      });

    await useFavoritesStore.getState().loadFavorites({ skip: 0, limit: 2 });
    await useFavoritesStore.getState().removeFavorite('a');
    await useFavoritesStore.getState().loadFavorites({
      skip: useFavoritesStore.getState().serverConsumed,
      limit: 2,
      append: true,
    });

    expect(api.getFavorites).toHaveBeenNthCalledWith(2, 1, 2);
    expect(useFavoritesStore.getState().list.map(({ public_id }) => public_id)).toEqual(['b', 'c']);
  });
});
