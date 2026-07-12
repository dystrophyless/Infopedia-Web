import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import {
  SEARCH_FILTER_BOOKS,
  SEARCH_FILTER_CHAPTERS,
  SEARCH_FILTER_GRADES,
  createFilterOptionCatalog,
  getSelectedFilterOptions,
  isFilterSelectId,
  mapBookOptions,
  mapChapterOptions,
  resolveOptionLabel,
} from './filterOptions';

const t = ((key: string, options?: Record<string, unknown>) =>
  key === 'metadata.bookWithGrade'
    ? `${String(options?.publisher)} · ${String(options?.grade)}`
    : `translated:${key}`) as unknown as TFunction;

describe('search filter option characterization', () => {
  it('keeps the static grade, book, and chapter fallback catalogs', () => {
    expect(SEARCH_FILTER_GRADES.map(({ id }) => id)).toEqual(['7', '8', '9', '10', '11']);
    expect(SEARCH_FILTER_BOOKS.map(({ id }) => id)).toEqual([
      'atamura',
      'armanPv',
      'mektep',
      'almatykitap',
    ]);
    expect(SEARCH_FILTER_CHAPTERS).not.toHaveLength(0);
  });

  it('maps, labels, deduplicates, and validates live book options in source order', () => {
    expect(
      mapBookOptions(
        [
          { public_id: 'book-1', publisher: ' Арман ', grade: 10 },
          { public_id: 'book-1', publisher: 'Duplicate', grade: 11 },
          { public_id: 'book-2', publisher: ' ', grade: 9 },
          { public_id: '', publisher: 'No id', grade: 8 },
          { public_id: 'book-3', publisher: 'Мектеп', grade: 9 },
        ],
        t,
      ),
    ).toEqual([
      { id: 'book-1', label: 'Арман · 10' },
      { id: 'book-3', label: 'Мектеп · 9' },
    ]);
  });

  it('maps and deduplicates live chapters while trimming readable labels', () => {
    expect(
      mapChapterOptions([
        { public_id: 'CHAPTER_1', name: ' Chapter one ' },
        { public_id: 'CHAPTER_1', name: 'Duplicate' },
        { public_id: 'CHAPTER_2', name: ' ' },
        { public_id: '', name: 'No id' },
      ]),
    ).toEqual([{ id: 'CHAPTER_1', label: 'Chapter one' }]);
  });

  it('uses live catalogs only when they contain valid options', () => {
    expect(createFilterOptionCatalog([], []).book).toBe(SEARCH_FILTER_BOOKS);
    expect(createFilterOptionCatalog([], []).section).toBe(SEARCH_FILTER_CHAPTERS);

    const liveBook = [{ id: 'book-1', label: 'Book one' }];
    const liveChapter = [{ id: 'chapter-1', label: 'Chapter one' }];
    const catalog = createFilterOptionCatalog(liveBook, liveChapter);
    expect(catalog.book).toBe(liveBook);
    expect(catalog.section).toBe(liveChapter);
  });

  it('resolves translated and unknown selected values into visible chips', () => {
    expect(resolveOptionLabel({ id: '7', labelKey: 'searchFilters.grade7' }, t)).toBe(
      'translated:searchFilters.grade7',
    );
    expect(
      getSelectedFilterOptions(
        ['7', 'unknown'],
        [{ id: '7', labelKey: 'searchFilters.grade7' }],
        t,
      ),
    ).toEqual([
      { id: '7', label: 'translated:searchFilters.grade7' },
      { id: 'unknown', label: 'unknown' },
    ]);
  });

  it('accepts only supported filter deep-link ids', () => {
    expect(['grade', 'book', 'section'].every(isFilterSelectId)).toBe(true);
    expect(isFilterSelectId('topic')).toBe(false);
    expect(isFilterSelectId(null)).toBe(false);
  });
});
