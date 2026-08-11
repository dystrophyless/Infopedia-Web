import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getSearchFilterBooks, getSearchFilterChapters } from '../api/filterCatalog';
import { useSearchRequestClient, useSearchRequestContext, type SearchRequestClient } from '../api/searchRequestClient';
import {
  createFilterOptionCatalog,
  mapBookOptions,
  mapChapterOptions,
  type FilterOption,
} from '../model/filterOptions';
import {
  updateBookCatalogSnapshot,
  type BookCatalogSnapshot,
} from '../model/publisherBookResolver';

export function useSearchFilterCatalog(t: TFunction, client?: SearchRequestClient) {
  const contextClient = useSearchRequestClient();
  const { refreshKey, locale: localeOverride } = useSearchRequestContext();
  const requestClient = client ?? contextClient;
  const { i18n } = useTranslation();
  const [bookOptions, setBookOptions] = useState<FilterOption[]>([]);
  const [chapterOptions, setChapterOptions] = useState<FilterOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [bookCatalogSnapshot, setBookCatalogSnapshot] = useState<BookCatalogSnapshot | null>(null);
  const [bookCatalogStale, setBookCatalogStale] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const retryCatalog = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    setBookCatalogStale(true);

    void Promise.allSettled([
      getSearchFilterBooks(requestClient).then((books) => ({ type: 'books' as const, books })),
      getSearchFilterChapters(localeOverride ?? i18n.language, requestClient).then((chapters) => ({
        type: 'chapters' as const,
        options: mapChapterOptions(chapters),
      })),
    ])
      .then((results) => {
        if (cancelled) return;

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            setCatalogError(t('searchFilters.loadOptionsFailed'));
            if (index === 0) {
              setBookCatalogStale(true);
            }
            return;
          }

          if (result.value.type === 'books') {
            const books = result.value.books;
            setBookCatalogSnapshot((previous) => {
              const update = updateBookCatalogSnapshot(previous, books);
              setBookCatalogStale(update.stale);
              if (update.error) {
                setCatalogError(t('searchFilters.loadOptionsFailed'));
                return update.snapshot;
              }
              setBookOptions(mapBookOptions(update.snapshot?.books ?? [], t));
              return update.snapshot;
            });
          }

          if (result.value.type === 'chapters' && result.value.options.length > 0) {
            setChapterOptions(result.value.options);
          }
        });
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, localeOverride, refreshKey, reloadVersion, requestClient, t]);

  const selectOptions = useMemo(
    () => createFilterOptionCatalog(bookOptions, chapterOptions),
    [bookOptions, chapterOptions],
  );

  return {
    selectOptions,
    catalogLoading,
    catalogError,
    bookCatalogSnapshot,
    bookCatalogStale,
    retryCatalog,
  };
}
