import { create } from 'zustand';
import type { Term } from '../../../types';
import {
  addFavorite,
  getFavoriteStatuses,
  getFavorites,
  removeFavorite as removeFavoriteRequest,
} from '../api/favorites';

type BooleanMap = Record<string, boolean>;
type ErrorMap = Record<string, string | null>;

export interface FavoritesLoadOptions {
  skip?: number;
  limit?: number;
  append?: boolean;
}

export interface FavoritesState {
  ownerUserId: number | null;
  list: Term[];
  terms: Term[];
  total: number;
  skip: number;
  limit: number;
  serverConsumed: number;
  hasMore: boolean;
  has_more: boolean;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  statusByTermRef: BooleanMap;
  pendingByTermRef: BooleanMap;
  errorByTermRef: ErrorMap;
  setOwnerUserId: (ownerUserId: number | null | undefined) => void;
  reset: () => void;
  loadFavorites: (options?: FavoritesLoadOptions) => Promise<void>;
  fetchFavorites: (options?: FavoritesLoadOptions) => Promise<void>;
  ensureStatuses: (termRefs: string[]) => Promise<void>;
  fetchStatuses: (termRefs: string[]) => Promise<void>;
  isFavorite: (termRef: string) => boolean;
  toggleFavorite: (termRef: string) => Promise<boolean>;
  removeFavorite: (termRef: string) => Promise<boolean>;
  restoreFavorite: (termRef: string) => Promise<boolean>;
}

const EMPTY_STATE = {
  list: [] as Term[],
  terms: [] as Term[],
  total: 0,
  skip: 0,
  limit: 20,
  serverConsumed: 0,
  hasMore: false,
  has_more: false,
  isLoading: false,
  loading: false,
  error: null as string | null,
  statusByTermRef: {} as BooleanMap,
  pendingByTermRef: {} as BooleanMap,
  errorByTermRef: {} as ErrorMap,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Unable to update favorites.';
}

function uniqueRefs(termRefs: string[]): string[] {
  return [...new Set(termRefs.filter(Boolean))];
}

let generation = 0;
let listRequestCounter = 0;
const statusInflight = new Map<string, Promise<void>>();
const toggleInflight = new Map<string, Promise<boolean>>();
const removedTerms = new Map<string, { term: Term; index: number; total: number }>();
const mutationVersionByRef = new Map<string, number>();

type SetFavoritesState = (
  partial: Partial<FavoritesState> | ((state: FavoritesState) => Partial<FavoritesState>),
) => void;

function setList(set: SetFavoritesState, list: Term[]) {
  return set({ list, terms: list });
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => {
  const clearState = () => {
    generation += 1;
    listRequestCounter += 1;
    statusInflight.clear();
    toggleInflight.clear();
    removedTerms.clear();
    mutationVersionByRef.clear();
    set({ ownerUserId: null, ...EMPTY_STATE });
  };

  const bumpMutation = (termRef: string) => {
    const next = (mutationVersionByRef.get(termRef) ?? 0) + 1;
    mutationVersionByRef.set(termRef, next);
    return next;
  };

  const setDesiredFavorite = (termRef: string, desired: boolean): Promise<boolean> => {
    const running = toggleInflight.get(termRef);
    if (running) return running;

    const state = get();
    const previous = Boolean(state.statusByTermRef[termRef]);
    if (previous === desired && !state.pendingByTermRef[termRef]) {
      return Promise.resolve(previous);
    }

    const operationGeneration = generation;
    const mutationVersion = bumpMutation(termRef);
    const existingIndex = state.list.findIndex((term) => term.public_id === termRef);
    const existingTerm = existingIndex >= 0 ? state.list[existingIndex] : undefined;
    if (!desired && existingTerm) {
      removedTerms.set(termRef, { term: existingTerm, index: existingIndex, total: state.total });
      set({
        list: state.list.filter((term) => term.public_id !== termRef),
        terms: state.list.filter((term) => term.public_id !== termRef),
        total: Math.max(0, state.total - 1),
      });
    }

    set((current) => ({
      statusByTermRef: { ...current.statusByTermRef, [termRef]: desired },
      pendingByTermRef: { ...current.pendingByTermRef, [termRef]: true },
      errorByTermRef: { ...current.errorByTermRef, [termRef]: null },
    }));

    const request = desired ? addFavorite(termRef) : removeFavoriteRequest(termRef);
    const promise = request
      .then(() => {
        if (generation !== operationGeneration) return desired;
        set((current) => ({
          statusByTermRef: { ...current.statusByTermRef, [termRef]: desired },
          pendingByTermRef: { ...current.pendingByTermRef, [termRef]: false },
          errorByTermRef: { ...current.errorByTermRef, [termRef]: null },
        }));
        if (desired) {
          const removed = removedTerms.get(termRef);
          if (removed && mutationVersionByRef.get(termRef) === mutationVersion) {
            const currentList = get().list;
            if (!currentList.some((term) => term.public_id === termRef)) {
              const nextList = [...currentList];
              nextList.splice(Math.min(removed.index, nextList.length), 0, removed.term);
              setList(set, nextList);
            }
            removedTerms.delete(termRef);
          }
        } else {
          if (existingTerm) {
            set((current) => ({
              serverConsumed: Math.max(0, current.serverConsumed - 1),
            }));
          }
          removedTerms.delete(termRef);
        }
        return desired;
      })
      .catch((error: unknown) => {
        if (generation !== operationGeneration) return previous;
        set((current) => ({
          statusByTermRef: { ...current.statusByTermRef, [termRef]: previous },
          pendingByTermRef: { ...current.pendingByTermRef, [termRef]: false },
          errorByTermRef: { ...current.errorByTermRef, [termRef]: errorMessage(error) },
        }));
        if (!desired && existingTerm && mutationVersionByRef.get(termRef) === mutationVersion) {
          const currentList = get().list;
          if (!currentList.some((term) => term.public_id === termRef)) {
            const nextList = [...currentList];
            nextList.splice(Math.min(existingIndex, nextList.length), 0, existingTerm);
            setList(set, nextList);
            set({ total: removedTerms.get(termRef)?.total ?? get().total + 1 });
          }
          removedTerms.delete(termRef);
        }
        throw error;
      })
      .finally(() => {
        if (toggleInflight.get(termRef) === promise) toggleInflight.delete(termRef);
      });

    toggleInflight.set(termRef, promise);
    return promise;
  };

  const loadFavorites = async (options: FavoritesLoadOptions = {}) => {
    const startGeneration = generation;
    const requestId = ++listRequestCounter;
    const mutationSnapshot = new Map(mutationVersionByRef);
    const current = get();
    const skip = options.skip ?? current.skip;
    const limit = options.limit ?? current.limit;
    const append = options.append ?? false;
    set({ isLoading: true, loading: true, error: null, skip, limit });

    try {
      const page = await getFavorites(skip, limit);
      if (generation !== startGeneration || requestId !== listRequestCounter) return;
      const visibleTerms = page.terms.filter((term) => {
        const currentState = get();
        const changedDuringLoad =
          (mutationVersionByRef.get(term.public_id) ?? 0) !==
          (mutationSnapshot.get(term.public_id) ?? 0);
        return !changedDuringLoad || currentState.statusByTermRef[term.public_id] !== false;
      });
      const nextList = append
        ? [...get().list, ...visibleTerms.filter((term) => !get().list.some((item) => item.public_id === term.public_id))]
        : visibleTerms;
      const statuses = { ...get().statusByTermRef };
      for (const term of page.terms) {
        const changedDuringLoad =
          (mutationVersionByRef.get(term.public_id) ?? 0) !==
          (mutationSnapshot.get(term.public_id) ?? 0);
        if (!changedDuringLoad) {
          statuses[term.public_id] = true;
        }
      }
      set({
        list: nextList,
        terms: nextList,
        total: page.total,
        skip: page.skip,
        limit: page.limit,
        serverConsumed: append
          ? Math.max(current.serverConsumed, page.skip + page.terms.length)
          : page.skip + page.terms.length,
        hasMore: page.has_more,
        has_more: page.has_more,
        statusByTermRef: statuses,
        isLoading: false,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (generation !== startGeneration || requestId !== listRequestCounter) return;
      set({ isLoading: false, loading: false, error: errorMessage(error) });
      throw error;
    }
  };

  const ensureStatuses = async (termRefs: string[]) => {
    const requestedRefs = uniqueRefs(termRefs);
    const inFlight = requestedRefs
      .map((ref) => statusInflight.get(ref))
      .filter((promise): promise is Promise<void> => Boolean(promise));
    const refs = requestedRefs.filter((ref) => {
      const state = get();
      return !Object.prototype.hasOwnProperty.call(state.statusByTermRef, ref) && !state.pendingByTermRef[ref];
    });
    if (!refs.length) {
      await Promise.all(inFlight);
      return;
    }
    const startGeneration = generation;
    set((current) => {
      const pending = { ...current.pendingByTermRef };
      const errors = { ...current.errorByTermRef };
      for (const ref of refs) {
        pending[ref] = true;
        errors[ref] = null;
      }
      return { pendingByTermRef: pending, errorByTermRef: errors };
    });
    const promise = getFavoriteStatuses(refs)
      .then((response) => {
        if (generation !== startGeneration) return;
        const favoriteIds = new Set(response.favorite_term_public_ids);
        set((current) => {
          const statuses = { ...current.statusByTermRef };
          const pending = { ...current.pendingByTermRef };
          for (const ref of refs) {
            statuses[ref] = favoriteIds.has(ref);
            pending[ref] = false;
          }
          return { statusByTermRef: statuses, pendingByTermRef: pending };
        });
      })
      .catch((error: unknown) => {
        if (generation !== startGeneration) return;
        const message = errorMessage(error);
        set((current) => {
          const pending = { ...current.pendingByTermRef };
          const errors = { ...current.errorByTermRef };
          for (const ref of refs) {
            pending[ref] = false;
            errors[ref] = message;
          }
          return { pendingByTermRef: pending, errorByTermRef: errors };
        });
        throw error;
      })
      .finally(() => {
        for (const ref of refs) {
          if (statusInflight.get(ref) === promise) statusInflight.delete(ref);
        }
      });
    for (const ref of refs) statusInflight.set(ref, promise);
    await promise;
  };

  return {
    ownerUserId: null,
    ...EMPTY_STATE,
    setOwnerUserId: (ownerUserId) => {
      const nextOwner = ownerUserId ?? null;
      if (get().ownerUserId === nextOwner) return;
      clearState();
      set({ ownerUserId: nextOwner });
    },
    reset: clearState,
    loadFavorites,
    fetchFavorites: loadFavorites,
    ensureStatuses,
    fetchStatuses: ensureStatuses,
    isFavorite: (termRef) => Boolean(get().statusByTermRef[termRef]),
    toggleFavorite: (termRef) => setDesiredFavorite(termRef, !get().isFavorite(termRef)),
    removeFavorite: (termRef) => setDesiredFavorite(termRef, false),
    restoreFavorite: (termRef) => setDesiredFavorite(termRef, true),
  };
});

export const favoritesStore = useFavoritesStore;
