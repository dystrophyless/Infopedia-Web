import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFeaturedTerms } from '../../../api/terms';
import { useDebounce } from '../../../hooks/useDebounce';
import type { FeaturedTerm, Term } from '../../../types';
import { searchTerms } from '../api/termSearch';
import { filterTermsBySearchFilters } from '../model/filterTerms';
import { useSearchStore } from '../model/searchStore';

export const SEARCH_RESULT_LIMIT = 11;
export const RANDOM_TERM_LIMIT = 10;
export const MOBILE_SEARCH_PAGE_SIZE = 4;

export type SearchResourceStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready';
export type SearchDisplayStatus = SearchResourceStatus | 'filter-no-match';

function toFeaturedTerm({ term, featured_definition }: FeaturedTerm): Term {
  return { ...term, definitions: [featured_definition] };
}

export function useTermSearchController(initialQuery: string) {
  const {
    query,
    results,
    isLoading,
    searchFilterSelections,
    searchFilterSelectionLabels,
    entOnlyFilterActive,
    setQuery,
    setResults,
    setLoading,
    setEntOnlyFilterActive,
  } = useSearchStore();
  const [hasSearched, setHasSearched] = useState(false);
  const [featuredTerms, setFeaturedTerms] = useState<Term[]>([]);
  const [featuredStatus, setFeaturedStatus] = useState<SearchResourceStatus>('idle');
  const [featuredError, setFeaturedError] = useState<unknown>(null);
  const [searchStatus, setSearchStatus] = useState<SearchResourceStatus>('idle');
  const [searchError, setSearchError] = useState<unknown>(null);
  const [featuredRetry, setFeaturedRetry] = useState(0);
  const [searchRetry, setSearchRetry] = useState(0);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [submitRequestNonce, setSubmitRequestNonce] = useState(0);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(MOBILE_SEARCH_PAGE_SIZE);
  const [hasExpandedRandomResults, setHasExpandedRandomResults] = useState(false);
  const [mobileSearchSheetOpen, setMobileSearchSheetOpen] = useState(false);
  const debounced = useDebounce(query, 400);
  const featuredAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const featuredGenerationRef = useRef(0);
  const searchGenerationRef = useRef(0);
  const lastSearchQueryRef = useRef('');
  const consumedSubmitNonceRef = useRef(0);
  const handledRetryRef = useRef(0);

  useEffect(() => {
    if (initialQuery.trim()) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  const retryFeatured = useCallback(() => setFeaturedRetry((value) => value + 1), []);
  const retrySearch = useCallback(() => setSearchRetry((value) => value + 1), []);
  const submitSearch = useCallback(
    (nextQuery = query) => {
      const normalized = nextQuery.trim();
      setQuery(normalized);
      setSubmittedQuery(normalized);
      setSubmitRequestNonce((nonce) => nonce + 1);
    },
    [query, setQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    featuredAbortRef.current?.abort();
    featuredAbortRef.current = controller;
    const generation = ++featuredGenerationRef.current;
    setFeaturedStatus('loading');
    setFeaturedError(null);

    getFeaturedTerms(RANDOM_TERM_LIMIT)
      .then((data) => {
        if (controller.signal.aborted || generation !== featuredGenerationRef.current) return;
        const next = data.map(toFeaturedTerm);
        setFeaturedTerms(next);
        setFeaturedStatus(next.length > 0 ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation !== featuredGenerationRef.current) return;
        setFeaturedTerms([]);
        setFeaturedError(error);
        setFeaturedStatus('error');
      });

    return () => controller.abort();
  }, [featuredRetry]);

  useEffect(() => {
    setVisibleCount(MOBILE_SEARCH_PAGE_SIZE);
    setHasExpandedRandomResults(false);
  }, [debounced, searchFilterSelections]);

  useEffect(() => {
    setSelectedTermId(null);
  }, [query, searchFilterSelections]);

  useEffect(() => {
    if (submittedQuery !== null && submittedQuery !== query) {
      setSubmittedQuery(null);
    }
  }, [query, submittedQuery]);

  useEffect(() => {
    if (query.trim() === debounced.trim()) return;
    searchAbortRef.current?.abort();
    searchGenerationRef.current += 1;
  }, [debounced, query]);

  useEffect(() => {
    searchAbortRef.current?.abort();
    const immediateRequest = submitRequestNonce !== consumedSubmitNonceRef.current;
    const retryRequest = searchRetry !== handledRetryRef.current;
    const normalizedQuery = (submittedQuery ?? debounced).trim();
    if (!normalizedQuery) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      setSearchError(null);
      setSearchStatus('idle');
      lastSearchQueryRef.current = '';
      consumedSubmitNonceRef.current = submitRequestNonce;
      handledRetryRef.current = searchRetry;
      return undefined;
    }

    if (!immediateRequest && !retryRequest && normalizedQuery === lastSearchQueryRef.current) return undefined;

    if (immediateRequest) consumedSubmitNonceRef.current = submitRequestNonce;
    if (retryRequest) handledRetryRef.current = searchRetry;

    const controller = new AbortController();
    searchAbortRef.current = controller;
    const generation = ++searchGenerationRef.current;
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setSearchStatus('loading');

    lastSearchQueryRef.current = normalizedQuery;
    searchTerms(normalizedQuery, SEARCH_RESULT_LIMIT)
      .then((data) => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        setResults(data);
        setSearchStatus(data.length > 0 ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        setResults([]);
        setSearchError(error);
        setSearchStatus('error');
      })
      .finally(() => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, searchRetry, submitRequestNonce, submittedQuery, setLoading, setResults]);

  const queryHasText = Boolean(query.trim());
  const activeQuery = (submittedQuery ?? debounced).trim();
  const showingSearchResults = Boolean(activeQuery);
  const unfilteredDisplayResults = showingSearchResults ? results : featuredTerms;
  const displayResults = useMemo(
    () => filterTermsBySearchFilters(unfilteredDisplayResults, searchFilterSelections),
    [unfilteredDisplayResults, searchFilterSelections],
  );
  const visibleResults = useMemo(
    () => displayResults.slice(0, visibleCount),
    [displayResults, visibleCount],
  );
  const hiddenResultsCount = Math.max(displayResults.length - visibleResults.length, 0);
  const resourceStatus = showingSearchResults ? searchStatus : featuredStatus;
  const resourceError = showingSearchResults ? searchError : featuredError;
  const pageIsLoading =
    isLoading || (queryHasText && !showingSearchResults) || resourceStatus === 'loading';
  const pageHasError = !pageIsLoading && resourceStatus === 'error';
  const filterNoMatch =
    !pageIsLoading && !pageHasError && unfilteredDisplayResults.length > 0 && displayResults.length === 0;
  const displayStatus: SearchDisplayStatus = filterNoMatch ? 'filter-no-match' : resourceStatus;
  const searchResultViewActive = queryHasText || hasExpandedRandomResults;

  const handleSelectedTermId = useCallback(
    (nextId: string | null) => {
      if (nextId === null || displayResults.some((term) => term.public_id === nextId)) {
        setSelectedTermId(nextId);
      }
    },
    [displayResults],
  );
  const currentSelectedTermId = selectedTermId && displayResults.some((term) => term.public_id === selectedTermId)
    ? selectedTermId
    : null;

  useEffect(() => {
    if (selectedTermId !== null && !displayResults.some((term) => term.public_id === selectedTermId)) {
      setSelectedTermId(null);
    }
  }, [displayResults, selectedTermId]);

  function handleMobileResultsBack() {
    setQuery('');
    setSubmittedQuery(null);
    setHasExpandedRandomResults(false);
    setVisibleCount(MOBILE_SEARCH_PAGE_SIZE);
    setSelectedTermId(null);
  }

  return {
    query,
    searchFilterSelections,
    searchFilterSelectionLabels,
    entOnlyFilterActive,
    setQuery,
    submitSearch,
    setEntOnlyFilterActive,
    hasSearched,
    visibleCount,
    setVisibleCount,
    hasExpandedRandomResults,
    setHasExpandedRandomResults,
    mobileSearchSheetOpen,
    setMobileSearchSheetOpen,
    debounced,
    showingSearchResults,
    displayResults,
    visibleResults,
    hiddenResultsCount,
    pageIsLoading,
    pageHasError,
    resourceError,
    featuredStatus,
    searchStatus,
    displayStatus,
    filterNoMatch,
    retryFeatured,
    retrySearch,
    selectedTermId: currentSelectedTermId,
    setSelectedTermId: handleSelectedTermId,
    searchResultViewActive,
    handleMobileResultsBack,
  };
}
