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

  it('serializes the authenticated filtered term page with repeated canonical parameters', async () => {
    const payload = { terms: [{ public_id: 'term-1', name: 'Term one' }], total: 1, skip: 0, limit: 11, has_more: false };
    get.mockResolvedValueOnce({ data: payload });

    await expect(searchTerms({
      query: 'python', grades: [7, 10], bookRefs: ['book:signed:a', 'book:signed:b'],
      chapterRefs: ['chapter:signed:a'], entOnly: true, skip: 0, limit: 11,
    })).resolves.toBe(payload);
    expect(get).toHaveBeenCalledOnce();
    const [url, config] = get.mock.calls[0];
    expect(url).toBe('/api/search/terms');
    expect(config.params).toBeInstanceOf(URLSearchParams);
    expect(config.params.toString()).toBe(
      'query=python&skip=0&limit=11&grade=7&grade=10&book=book%3Asigned%3Aa&book=book%3Asigned%3Ab&chapter=chapter%3Asigned%3Aa&ent_only=true',
    );
    expect(config.params.toString()).not.toMatch(/publisher|section|label|\[\]/);
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
