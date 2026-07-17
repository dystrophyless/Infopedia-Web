import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../../../api/client', () => ({
  apiClient: { get },
}));

import { getSearchFilterBooks, getSearchFilterChapters } from './filterCatalog';
import { searchTerms } from './termSearch';

describe('typed search API adapters', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('keeps ordinary term search on the GET /api/search/ contract', async () => {
    const payload = [{ public_id: 'term-1', name: 'Term one' }];
    get.mockResolvedValueOnce({ data: payload });

    await expect(searchTerms(' python ', 11)).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/search/', {
      params: { query: ' python ', limit: 11 },
    });
  });

  it('keeps filter catalogs on topic book and chapter endpoints', async () => {
    const books = [{ public_id: 'book-1', publisher: 'Арман', grade: 10 }];
    const chapters = [{ public_id: 'chapter-1', name: 'Python' }];
    get.mockResolvedValueOnce({ data: books }).mockResolvedValueOnce({ data: chapters });

    await expect(getSearchFilterBooks()).resolves.toBe(books);
    await expect(getSearchFilterChapters()).resolves.toBe(chapters);
    expect(get).toHaveBeenNthCalledWith(1, '/api/topics/books');
    expect(get).toHaveBeenNthCalledWith(2, '/api/topics/chapters', {
      params: { locale: 'kk' },
    });

    get.mockResolvedValueOnce({ data: chapters });
    await expect(getSearchFilterChapters('ru-RU')).resolves.toBe(chapters);
    expect(get).toHaveBeenNthCalledWith(3, '/api/topics/chapters', {
      params: { locale: 'ru' },
    });
  });
});
