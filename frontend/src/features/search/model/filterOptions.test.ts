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
  it('keeps static grade and book fallbacks while chapters remain backend-only', () => {
    expect(SEARCH_FILTER_GRADES.map(({ id }) => id)).toEqual(['7', '8', '9', '10', '11']);
    expect(SEARCH_FILTER_BOOKS.map(({ id }) => id)).toEqual([
      'atamura',
      'almatykitap',
      'armanPv',
    ]);
    expect(SEARCH_FILTER_CHAPTERS).toEqual([]);
  });

  it('maps live publishers to canonical options, deduplicates across grades, and keeps canonical order', () => {
    expect(
      mapBookOptions(
        [
          { public_id: 'book-arman-11', publisher: 'Арман-ПВ', grade: 11 },
          { public_id: 'book-atamura-9', publisher: 'Атамұра', grade: 9 },
          { public_id: 'book-arman-9', publisher: 'Арман ПВ', grade: 9 },
          { public_id: 'book-almaty', publisher: 'Алматыкітап', grade: 10 },
          { public_id: 'book-mektep', publisher: 'Мектеп', grade: 9 },
          { public_id: 'book-unknown', publisher: 'Unknown', grade: 9 },
        ],
        t,
      ),
    ).toEqual(SEARCH_FILTER_BOOKS);
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

  it('prefers localized title and falls back to stable name', () => {
    expect(
      mapChapterOptions([
        { public_id: 'CHAPTER_1', name: 'Stable name', title: 'Русское название' },
        { public_id: 'CHAPTER_2', name: 'Fallback name' },
      ]),
    ).toEqual([
      { id: 'CHAPTER_1', label: 'Русское название' },
      { id: 'CHAPTER_2', label: 'Fallback name' },
    ]);
  });

  it('uses live catalogs only when they contain valid options', () => {
    expect(createFilterOptionCatalog([], []).book).toBe(SEARCH_FILTER_BOOKS);
    expect(createFilterOptionCatalog([], []).section).toEqual(SEARCH_FILTER_CHAPTERS);

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
