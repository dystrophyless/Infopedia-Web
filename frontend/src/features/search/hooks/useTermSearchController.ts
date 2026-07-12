import { useEffect, useMemo, useState } from 'react';
import { getFeaturedTerms } from '../../../api/terms';
import { useDebounce } from '../../../hooks/useDebounce';
import type { FeaturedTerm, Term } from '../../../types';
import { searchTerms } from '../api/termSearch';
import { filterTermsBySearchFilters } from '../model/filterTerms';
import { useSearchStore } from '../model/searchStore';

export const SEARCH_RESULT_LIMIT = 11;
export const MOBILE_SEARCH_PAGE_SIZE = 4;

function toFeaturedTerm({ term, featured_definition }: FeaturedTerm): Term {
  return {
    ...term,
    definitions: [featured_definition],
  };
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
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MOBILE_SEARCH_PAGE_SIZE);
  const [hasExpandedRandomResults, setHasExpandedRandomResults] = useState(false);
  const [mobileSearchSheetOpen, setMobileSearchSheetOpen] = useState(false);
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    if (initialQuery.trim()) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    let cancelled = false;
    setFeaturedLoading(true);
    getFeaturedTerms(SEARCH_RESULT_LIMIT)
      .then((data) => {
        if (!cancelled) setFeaturedTerms(data.map(toFeaturedTerm));
      })
      .catch(() => {
        if (!cancelled) setFeaturedTerms([]);
      })
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(MOBILE_SEARCH_PAGE_SIZE);
    setHasExpandedRandomResults(false);
  }, [debounced, searchFilterSelections]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setHasSearched(true);
    searchTerms(debounced, SEARCH_RESULT_LIMIT)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, setLoading, setResults]);

  const queryHasText = Boolean(query.trim());
  const showingSearchResults = Boolean(debounced.trim());
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
  const pageIsLoading =
    isLoading || (queryHasText && !showingSearchResults) || (!queryHasText && featuredLoading);
  const searchResultViewActive = queryHasText || hasExpandedRandomResults;

  function handleMobileResultsBack() {
    setQuery('');
    setHasExpandedRandomResults(false);
    setVisibleCount(MOBILE_SEARCH_PAGE_SIZE);
  }

  return {
    query,
    searchFilterSelections,
    searchFilterSelectionLabels,
    entOnlyFilterActive,
    setQuery,
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
    searchResultViewActive,
    handleMobileResultsBack,
  };
}
