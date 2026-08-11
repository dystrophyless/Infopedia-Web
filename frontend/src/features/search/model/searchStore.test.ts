import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchStore } from './searchStore';

describe('search store characterization', () => {
  beforeEach(() => {
    useSearchStore.setState(useSearchStore.getInitialState(), true);
  });

  it('persists query, results, loading, ENT, selections, and readable labels in one route-shared store', () => {
    const result = { public_id: 'term-1', name: 'Term one' };
    const state = useSearchStore.getState();
    state.setQuery('python');
    state.setResults([result]);
    state.setLoading(true);
    state.setEntOnlyFilterActive(true);
    state.toggleSearchFilterOption('book', 'book-1', 'Арман · 10');

    expect(useSearchStore.getState()).toMatchObject({
      query: 'python',
      results: [result],
      isLoading: true,
      entOnlyFilterActive: true,
      searchFilterSelections: { grade: [], book: ['book-1'], section: [] },
      searchFilterSelectionLabels: {
        grade: {},
        book: { 'book-1': 'Арман · 10' },
        section: {},
      },
    });
  });

  it('toggling, removing, and category reset keep ids and readable labels synchronized', () => {
    useSearchStore.getState().toggleSearchFilterOption('grade', '10', 'Grade 10');
    useSearchStore.getState().toggleSearchFilterOption('grade', '11', 'Grade 11');
    useSearchStore.getState().removeSearchFilterOption('grade', '10');

    expect(useSearchStore.getState().searchFilterSelections.grade).toEqual(['11']);
    expect(useSearchStore.getState().searchFilterSelectionLabels.grade).toEqual({
      '11': 'Grade 11',
    });

    useSearchStore.getState().resetSearchFilterOptions('grade');
    expect(useSearchStore.getState().searchFilterSelections.grade).toEqual([]);
    expect(useSearchStore.getState().searchFilterSelectionLabels.grade).toEqual({});
  });

  it('resetSearchFilters clears filter state and ENT but preserves the current query/results', () => {
    const result = { public_id: 'term-1', name: 'Term one' };
    useSearchStore.getState().setQuery('python');
    useSearchStore.getState().setResults([result]);
    useSearchStore.getState().setEntOnlyFilterActive(true);
    useSearchStore.getState().toggleSearchFilterOption('section', 'PYTHON', 'Python');

    useSearchStore.getState().resetSearchFilters();
    expect(useSearchStore.getState()).toMatchObject({
      query: 'python',
      results: [result],
      entOnlyFilterActive: false,
      searchFilterSelections: { grade: [], book: [], section: [] },
      searchFilterSelectionLabels: { grade: {}, book: {}, section: {} },
    });
  });

  it('reset clears transient query/results/loading without clearing selected filters', () => {
    useSearchStore.getState().setQuery('python');
    useSearchStore.getState().setLoading(true);
    useSearchStore.getState().toggleSearchFilterOption('book', 'book-1', 'Book one');

    useSearchStore.getState().reset();
    expect(useSearchStore.getState()).toMatchObject({
      query: '',
      results: [],
      isLoading: false,
      searchFilterSelections: { grade: [], book: ['book-1'], section: [] },
    });
  });

  it('applies a complete filter snapshot atomically and ignores an identical apply', () => {
    const listener = vi.fn();
    const unsubscribe = useSearchStore.subscribe(listener);
    const snapshot = {
      entOnly: true,
      selections: { grade: ['10'], book: ['atamura'], section: [] },
      labels: { grade: { '10': '10 класс' }, book: { atamura: 'Атамұра' }, section: {} },
    };

    useSearchStore.getState().applySearchFilters(snapshot);
    expect(listener).toHaveBeenCalledOnce();
    expect(useSearchStore.getState()).toMatchObject({
      entOnlyFilterActive: true,
      searchFilterSelections: snapshot.selections,
      searchFilterSelectionLabels: snapshot.labels,
    });

    listener.mockClear();
    useSearchStore.getState().applySearchFilters(snapshot);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
