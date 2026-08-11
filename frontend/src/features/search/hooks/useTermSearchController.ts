import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFeaturedTerms } from '../../../api/terms';
import { useDebounce } from '../../../hooks/useDebounce';
import type { FeaturedTerm, Term } from '../../../types';
import { searchTerms } from '../api/termSearch';
import type { SearchRequestClient } from '../api/searchRequestClient';
import type { BookCatalogSnapshot } from '../model/publisherBookResolver';
import { appendSearchPage, replaceSearchPage } from '../model/searchPageState';
import { chooseSearchLoadMoreAction, shouldReplaceSearchRequest } from '../model/searchRequestPolicy';
import { buildSearchRequestDescriptor } from '../model/searchRequestKey';
import { useSearchStore } from '../model/searchStore';

export const SEARCH_RESULT_LIMIT = 11;
export const RANDOM_TERM_LIMIT = 10;
export const MOBILE_SEARCH_PAGE_SIZE = 4;

export type SearchResourceStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready';
export type SearchDisplayStatus = SearchResourceStatus | 'filter-no-match';

function toFeaturedTerm({ term, featured_definition }: FeaturedTerm): Term {
  return { ...term, definitions: [featured_definition] };
}

export function useTermSearchController(
  initialQuery: string,
  bookCatalogSnapshot: BookCatalogSnapshot | null,
  client: SearchRequestClient,
) {
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
    applySearchFilters,
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
  const [serverTotal, setServerTotal] = useState(0);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [hasExpandedRandomResults, setHasExpandedRandomResults] = useState(false);
  const [mobileSearchSheetOpen, setMobileSearchSheetOpen] = useState(false);
  const debounced = useDebounce(query, 400);
  const featuredAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const featuredGenerationRef = useRef(0);
  const searchGenerationRef = useRef(0);
  const lastSearchKeyRef = useRef<string | null>(null);
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
    if (submittedQuery !== null && submittedQuery !== query.trim()) setSubmittedQuery(null);
  }, [query, submittedQuery]);

  const effectiveQuery = submittedQuery ?? debounced;
  const requestBookCatalog = searchFilterSelections.book.length > 0 ? bookCatalogSnapshot : null;
  const requestDescriptor = useMemo(
    () =>
      buildSearchRequestDescriptor({
        query: effectiveQuery,
        selections: searchFilterSelections,
        entOnly: entOnlyFilterActive,
        bookCatalog: requestBookCatalog,
      }),
    [effectiveQuery, entOnlyFilterActive, requestBookCatalog, searchFilterSelections],
  );
  const requestDescriptorKey = requestDescriptor.ok ? requestDescriptor.key : requestDescriptor.code;

  useEffect(() => {
    setVisibleCount(MOBILE_SEARCH_PAGE_SIZE);
    setHasExpandedRandomResults(false);
    setSelectedTermId(null);
  }, [requestDescriptorKey]);

  useEffect(() => {
    if (!requestDescriptor.ok || !requestDescriptor.useFeaturedTerms) {
      featuredAbortRef.current?.abort();
      setFeaturedStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    featuredAbortRef.current?.abort();
    featuredAbortRef.current = controller;
    const generation = ++featuredGenerationRef.current;
    setFeaturedStatus('loading');
    setFeaturedError(null);

    getFeaturedTerms(RANDOM_TERM_LIMIT, client)
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
  }, [client, featuredRetry, requestDescriptorKey]);

  useEffect(() => {
    const retryRequest = searchRetry !== handledRetryRef.current;
    const immediateRequest = submitRequestNonce !== consumedSubmitNonceRef.current;
    if (immediateRequest) consumedSubmitNonceRef.current = submitRequestNonce;

    if (!requestDescriptor.ok) {
      searchAbortRef.current?.abort();
      setResults([]);
      setServerTotal(0);
      setServerHasMore(false);
      setHasSearched(true);
      setLoading(false);
      setSearchError(new Error(requestDescriptor.code));
      setSearchStatus('error');
      lastSearchKeyRef.current = null;
      return undefined;
    }
    if (requestDescriptor.useFeaturedTerms) {
      searchAbortRef.current?.abort();
      setResults([]);
      setServerTotal(0);
      setServerHasMore(false);
      setHasSearched(false);
      setLoading(false);
      setSearchError(null);
      setSearchStatus('idle');
      lastSearchKeyRef.current = null;
      return undefined;
    }
    if (
      !shouldReplaceSearchRequest(
        lastSearchKeyRef.current,
        requestDescriptor.key,
        retryRequest || immediateRequest,
      )
    ) {
      return undefined;
    }
    if (retryRequest) handledRetryRef.current = searchRetry;

    // Only replace an active request after the canonical-key dedupe check.
    // Catalog refreshes may recreate descriptor inputs without changing the
    // request key; aborting before this check strands that request.
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const generation = ++searchGenerationRef.current;
    lastSearchKeyRef.current = requestDescriptor.key;
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setSearchStatus('loading');

    searchTerms(
      { ...requestDescriptor.request, skip: 0, limit: SEARCH_RESULT_LIMIT },
      controller.signal,
      client,
    )
      .then((page) => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        const next = replaceSearchPage(page);
        setResults(next.terms);
        setServerTotal(next.total);
        setServerHasMore(next.hasMore);
        setSearchStatus(next.terms.length > 0 ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        setResults([]);
        setServerTotal(0);
        setServerHasMore(false);
        setSearchError(error);
        setSearchStatus('error');
      })
      .finally(() => {
        if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [
    requestDescriptorKey,
    searchRetry,
    setLoading,
    setResults,
    submitRequestNonce,
    client,
  ]);

  const showingSearchResults = !requestDescriptor.ok || !requestDescriptor.useFeaturedTerms;
  const displayResults = showingSearchResults ? results : featuredTerms;
  const visibleResults = useMemo(
    () => displayResults.slice(0, visibleCount),
    [displayResults, visibleCount],
  );
  const resultTotal = showingSearchResults ? serverTotal : displayResults.length;
  const hiddenResultsCount = Math.max(resultTotal - visibleResults.length, 0);
  const resourceStatus = showingSearchResults ? searchStatus : featuredStatus;
  const resourceError = showingSearchResults ? searchError : featuredError;
  const queryAwaitingDebounce = query.trim() !== effectiveQuery.trim();
  const pageIsLoading = isLoading || queryAwaitingDebounce || resourceStatus === 'loading';
  const pageHasError = !pageIsLoading && resourceStatus === 'error';
  const displayStatus: SearchDisplayStatus = resourceStatus;
  const searchResultViewActive = showingSearchResults || hasExpandedRandomResults;

  const handleSelectedTermId = useCallback(
    (nextId: string | null) => {
      if (nextId === null || displayResults.some((term) => term.public_id === nextId)) {
        setSelectedTermId(nextId);
      }
    },
    [displayResults],
  );
  const currentSelectedTermId =
    selectedTermId && displayResults.some((term) => term.public_id === selectedTermId)
      ? selectedTermId
      : null;

  const loadMore = useCallback(async () => {
    if (!showingSearchResults) setHasExpandedRandomResults(true);
    const action = chooseSearchLoadMoreAction({
      visible: visibleCount,
      loaded: displayResults.length,
      hasMore: showingSearchResults && serverHasMore,
    });
    if (action.type === 'reveal') {
      setVisibleCount(action.nextVisible);
      return;
    }
    if (action.type !== 'append' || !requestDescriptor.ok || requestDescriptor.useFeaturedTerms) {
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    const generation = ++searchGenerationRef.current;
    setLoading(true);
    try {
      const page = await searchTerms(
        { ...requestDescriptor.request, skip: action.skip, limit: SEARCH_RESULT_LIMIT },
        controller.signal,
        client,
      );
      if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
      const next = appendSearchPage(
        { terms: results, total: serverTotal, hasMore: serverHasMore },
        page,
      );
      setResults(next.terms);
      setServerTotal(next.total);
      setServerHasMore(next.hasMore);
      setVisibleCount((count) => Math.min(count + MOBILE_SEARCH_PAGE_SIZE, next.terms.length));
      setSearchStatus(next.terms.length > 0 ? 'ready' : 'empty');
    } catch (error: unknown) {
      if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
      setSearchError(error);
      setSearchStatus('error');
    } finally {
      if (!controller.signal.aborted && generation === searchGenerationRef.current) setLoading(false);
    }
  }, [
    displayResults.length,
    requestDescriptor,
    results,
    serverHasMore,
    serverTotal,
    setLoading,
    setResults,
    showingSearchResults,
    visibleCount,
    client,
  ]);

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
    applySearchFilters,
    hasSearched,
    visibleCount,
    setVisibleCount,
    loadMore,
    hasExpandedRandomResults,
    setHasExpandedRandomResults,
    mobileSearchSheetOpen,
    setMobileSearchSheetOpen,
    debounced,
    showingSearchResults,
    displayResults,
    visibleResults,
    resultTotal,
    hiddenResultsCount,
    pageIsLoading,
    pageHasError,
    resourceError,
    featuredStatus,
    searchStatus,
    displayStatus,
    filterNoMatch: false,
    retryFeatured,
    retrySearch,
    selectedTermId: currentSelectedTermId,
    setSelectedTermId: handleSelectedTermId,
    searchResultViewActive,
    requestBlocked: !requestDescriptor.ok,
    handleMobileResultsBack,
  };
}
