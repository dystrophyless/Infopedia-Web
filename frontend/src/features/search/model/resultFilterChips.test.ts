import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import type {
  SearchFilterSelectionLabels,
  SearchFilterSelections,
} from './searchStore';
import { getSearchResultFilterChips } from './resultFilterChips';

const t = ((key: string) => `translated:${key}`) as unknown as TFunction;

const selections = (
  overrides: Partial<SearchFilterSelections> = {},
): SearchFilterSelections => ({
  grade: [],
  book: [],
  section: [],
  ...overrides,
});

const labels = (
  overrides: Partial<SearchFilterSelectionLabels> = {},
): SearchFilterSelectionLabels => ({
  grade: {},
  book: {},
  section: {},
  ...overrides,
});

describe('result filter chip view model characterization', () => {
  it('keeps the filter counter first and otherwise preserves the static chip order', () => {
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: false,
      searchFilterSelections: selections(),
      searchFilterSelectionLabels: labels(),
      onEntOnlyFilterToggle: vi.fn(),
      t,
    });

    expect(chips.map(({ id }) => id)).toEqual([
      'filter',
      'specification',
      'book',
      'grade',
      'topic',
    ]);
    expect(chips[0]).toMatchObject({ active: false });
    expect(chips[0]).not.toHaveProperty('selectId');
    expect(chips.find(({ id }) => id === 'book')).toMatchObject({ selectId: 'book' });
    expect(chips.find(({ id }) => id === 'grade')).toMatchObject({ selectId: 'grade' });
    expect(chips.find(({ id }) => id === 'topic')).toMatchObject({ selectId: 'section' });
  });

  it('sorts active categories before inactive categories and counts categories, not values', () => {
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: true,
      searchFilterSelections: selections({ grade: ['10', '11'] }),
      searchFilterSelectionLabels: labels(),
      searchFilterActivationOrder: ['grade', 'ent'],
      onEntOnlyFilterToggle: vi.fn(),
      t,
    });

    expect(chips.map(({ id }) => id)).toEqual([
      'filter',
      'grade',
      'specification',
      'book',
      'topic',
    ]);
    expect(chips[0].selectedCount).toBe(2);
    expect(chips.find(({ id }) => id === 'grade')).toMatchObject({
      label: 'translated:search.resultFilterGrade',
      selectedCount: 2,
      active: true,
    });
  });

  it('orders active chips by first activation and leaves inactive chips canonical', () => {
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: false,
      searchFilterSelections: selections({ grade: ['10'], book: ['atamura'] }),
      searchFilterSelectionLabels: labels(),
      searchFilterActivationOrder: ['grade', 'book'],
      onEntOnlyFilterToggle: vi.fn(),
      t,
    });

    expect(chips.map(({ id }) => id)).toEqual([
      'filter',
      'grade',
      'book',
      'specification',
      'topic',
    ]);
  });

  it('prefers persisted readable labels for a single canonical selection', () => {
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: false,
      searchFilterSelections: selections({ book: ['catalog-book-id'] }),
      searchFilterSelectionLabels: labels({
        book: { 'catalog-book-id': 'Арман · 10' },
      }),
      onEntOnlyFilterToggle: vi.fn(),
      t,
    });

    expect(chips.find(({ id }) => id === 'book')).toMatchObject({
      label: 'Арман · 10',
      active: true,
      selectId: 'book',
    });
  });

  it('uses stable fallback labels and routes for deep-linked filters', () => {
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: false,
      searchFilterSelections: selections({
        grade: ['10'],
        book: ['atamura'],
        section: ['PYTHON_PROGRAMMING'],
      }),
      searchFilterSelectionLabels: labels(),
      onEntOnlyFilterToggle: vi.fn(),
      t,
    });

    expect(chips.find(({ id }) => id === 'grade')?.label).toBe(
      'translated:searchFilters.grade10',
    );
    expect(chips.find(({ id }) => id === 'book')?.label).toBe(
      'translated:searchFilters.books.atamura',
    );
    expect(chips.find(({ id }) => id === 'topic')?.label).toBe(
      'PYTHON_PROGRAMMING',
    );
    expect(chips.find(({ id }) => id === 'book')?.selectId).toBe('book');
    expect(chips.find(({ id }) => id === 'grade')?.selectId).toBe('grade');
    expect(chips.find(({ id }) => id === 'topic')?.selectId).toBe('section');
  });

  it('keeps the ENT chip as a toggle view model without applying result filtering', () => {
    const onToggle = vi.fn();
    const chips = getSearchResultFilterChips({
      entOnlyFilterActive: true,
      searchFilterSelections: selections(),
      searchFilterSelectionLabels: labels(),
      onEntOnlyFilterToggle: onToggle,
      t,
    });
    const entChip = chips.find(({ id }) => id === 'specification');

    expect(entChip).toMatchObject({ active: true, toggle: true });
    entChip?.onToggle?.();
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
