import { create } from 'zustand';
import type { Term } from '../types';

export type SearchFilterSelectId = 'grade' | 'book' | 'section';

export type SearchFilterSelections = Record<SearchFilterSelectId, string[]>;
export type SearchFilterSelectionLabels = Record<SearchFilterSelectId, Record<string, string>>;

const INITIAL_SEARCH_FILTER_SELECTIONS: SearchFilterSelections = {
  grade: [],
  book: [],
  section: [],
};

const INITIAL_SEARCH_FILTER_SELECTION_LABELS: SearchFilterSelectionLabels = {
  grade: {},
  book: {},
  section: {},
};

function createInitialSearchFilterSelections(): SearchFilterSelections {
  return {
    grade: [...INITIAL_SEARCH_FILTER_SELECTIONS.grade],
    book: [...INITIAL_SEARCH_FILTER_SELECTIONS.book],
    section: [...INITIAL_SEARCH_FILTER_SELECTIONS.section],
  };
}

function createInitialSearchFilterSelectionLabels(): SearchFilterSelectionLabels {
  return {
    grade: { ...INITIAL_SEARCH_FILTER_SELECTION_LABELS.grade },
    book: { ...INITIAL_SEARCH_FILTER_SELECTION_LABELS.book },
    section: { ...INITIAL_SEARCH_FILTER_SELECTION_LABELS.section },
  };
}

interface SearchState {
  query: string;
  results: Term[];
  isLoading: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  entOnlyFilterActive: boolean;
  setQuery: (query: string) => void;
  setResults: (results: Term[]) => void;
  setLoading: (loading: boolean) => void;
  setEntOnlyFilterActive: (active: boolean) => void;
  toggleSearchFilterOption: (
    filterId: SearchFilterSelectId,
    optionId: string,
    optionLabel?: string,
  ) => void;
  removeSearchFilterOption: (filterId: SearchFilterSelectId, optionId: string) => void;
  resetSearchFilterOptions: (filterId: SearchFilterSelectId) => void;
  resetSearchFilters: () => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: '',
  results: [],
  isLoading: false,
  searchFilterSelections: createInitialSearchFilterSelections(),
  searchFilterSelectionLabels: createInitialSearchFilterSelectionLabels(),
  entOnlyFilterActive: false,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setEntOnlyFilterActive: (entOnlyFilterActive) => set({ entOnlyFilterActive }),
  toggleSearchFilterOption: (filterId, optionId, optionLabel) =>
    set((state) => {
      const selectedIds = state.searchFilterSelections[filterId];
      const optionIsSelected = selectedIds.includes(optionId);
      const nextIds = optionIsSelected
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId];
      const nextLabels = { ...state.searchFilterSelectionLabels[filterId] };

      if (optionIsSelected) {
        delete nextLabels[optionId];
      } else if (optionLabel) {
        nextLabels[optionId] = optionLabel;
      }

      return {
        searchFilterSelections: {
          ...state.searchFilterSelections,
          [filterId]: nextIds,
        },
        searchFilterSelectionLabels: {
          ...state.searchFilterSelectionLabels,
          [filterId]: nextLabels,
        },
      };
    }),
  removeSearchFilterOption: (filterId, optionId) =>
    set((state) => {
      const nextLabels = { ...state.searchFilterSelectionLabels[filterId] };
      delete nextLabels[optionId];

      return {
        searchFilterSelections: {
          ...state.searchFilterSelections,
          [filterId]: state.searchFilterSelections[filterId].filter((id) => id !== optionId),
        },
        searchFilterSelectionLabels: {
          ...state.searchFilterSelectionLabels,
          [filterId]: nextLabels,
        },
      };
    }),
  resetSearchFilterOptions: (filterId) =>
    set((state) => ({
      searchFilterSelections: {
        ...state.searchFilterSelections,
        [filterId]: [],
      },
      searchFilterSelectionLabels: {
        ...state.searchFilterSelectionLabels,
        [filterId]: {},
      },
    })),
  resetSearchFilters: () =>
    set({
      searchFilterSelections: createInitialSearchFilterSelections(),
      searchFilterSelectionLabels: createInitialSearchFilterSelectionLabels(),
      entOnlyFilterActive: false,
    }),
  reset: () => set({ query: '', results: [], isLoading: false }),
}));
