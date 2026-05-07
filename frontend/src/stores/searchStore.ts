import { create } from 'zustand';
import type { Term } from '../types';

interface SearchState {
  query: string;
  results: Term[];
  isLoading: boolean;
  setQuery: (query: string) => void;
  setResults: (results: Term[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: '',
  results: [],
  isLoading: false,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ query: '', results: [], isLoading: false }),
}));
