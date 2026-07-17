import { describe, expect, it } from 'vitest';
import type { Term } from '../../../types';
import type { SearchFilterSelections } from './searchStore';
import {
  filterTermsBySearchFilters,
  normalizeSearchFilterValue,
} from './filterTerms';

const emptySelections = (): SearchFilterSelections => ({
  grade: [],
  book: [],
  section: [],
});

function term(
  publicId: string,
  definitions: NonNullable<Term['definitions']>,
): Term {
  return { public_id: publicId, name: publicId, definitions };
}

describe('filterTermsBySearchFilters characterization', () => {
  const catalog = [
    term('python', [
      {
        text: 'Python',
        page: 10,
        topic: {
          book: { public_id: 'book-1', publisher: 'Арман-ПВ', grade: 10 },
          chapter: { public_id: 'chapter-python', code: 'python-programming', title: 'Python programming' },
        },
      },
    ]),
    term('networks', [
      {
        text: 'Networks',
        page: 20,
        topic: {
          book: { public_id: 'book-2', publisher: 'Мектеп', grade: 9 },
          chapter: { public_id: 'chapter-networks', code: 'computer-networks', title: 'Computer networks' },
        },
      },
    ]),
    term('missing-metadata', [{ text: 'Unknown', page: 1 }]),
  ];

  it('normalizes case and spacing punctuation used by publisher aliases', () => {
    expect(normalizeSearchFilterValue('  Arman-PV_test. ')).toBe('armanpvtest');
  });

  it('returns the original fetched result array when no filters are selected', () => {
    expect(filterTermsBySearchFilters(catalog, emptySelections())).toBe(catalog);
  });

  it('matches books by canonical public id or known publisher aliases', () => {
    expect(
      filterTermsBySearchFilters(catalog, {
        ...emptySelections(),
        book: ['book-1'],
      }).map(({ public_id }) => public_id),
    ).toEqual(['python']);

    expect(
      filterTermsBySearchFilters(catalog, {
        ...emptySelections(),
        book: ['armanPv'],
      }).map(({ public_id }) => public_id),
    ).toEqual(['python']);
  });

  it('matches numeric grades and chapters by either id or readable name', () => {
    expect(
      filterTermsBySearchFilters(catalog, {
        grade: ['10'],
        book: [],
        section: ['Python programming'],
      }).map(({ public_id }) => public_id),
    ).toEqual(['python']);
  });

  it('requires one definition to satisfy every active category', () => {
    const splitMetadataTerm = term('split', [
      {
        text: 'Book match',
        page: 1,
        topic: {
          book: { public_id: 'book-1', publisher: 'Арман-ПВ', grade: 10 },
          chapter: { public_id: 'chapter-other', code: 'other', title: 'Other' },
        },
      },
      {
        text: 'Chapter match',
        page: 2,
        topic: {
          book: { public_id: 'book-2', publisher: 'Мектеп', grade: 9 },
          chapter: { public_id: 'chapter-python', code: 'python-programming', title: 'Python programming' },
        },
      },
    ]);

    expect(
      filterTermsBySearchFilters([splitMetadataTerm], {
        grade: ['10'],
        book: ['book-1'],
        section: ['PYTHON_PROGRAMMING'],
      }),
    ).toEqual([]);
  });

  it('only filters the supplied fetched terms and excludes missing metadata when active', () => {
    expect(
      filterTermsBySearchFilters(catalog, {
        ...emptySelections(),
        grade: ['9'],
      }).map(({ public_id }) => public_id),
    ).toEqual(['networks']);
    expect(catalog).toHaveLength(3);
  });
});
