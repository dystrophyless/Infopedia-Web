import { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getSearchFilterBooks, getSearchFilterChapters } from '../api/filterCatalog';
import {
  createFilterOptionCatalog,
  mapBookOptions,
  mapChapterOptions,
  type FilterOption,
} from '../model/filterOptions';

export function useSearchFilterCatalog(t: TFunction) {
  const { i18n } = useTranslation();
  const [bookOptions, setBookOptions] = useState<FilterOption[]>([]);
  const [chapterOptions, setChapterOptions] = useState<FilterOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);

    void Promise.allSettled([
      getSearchFilterBooks().then((books) => ({
        type: 'books' as const,
        options: mapBookOptions(books, t),
      })),
      getSearchFilterChapters(i18n.language).then((chapters) => ({
        type: 'chapters' as const,
        options: mapChapterOptions(chapters),
      })),
    ])
      .then((results) => {
        if (cancelled) return;

        results.forEach((result) => {
          if (result.status === 'rejected') {
            setCatalogError(t('searchFilters.loadOptionsFailed'));
            return;
          }

          if (result.value.type === 'books' && result.value.options.length > 0) {
            setBookOptions(result.value.options);
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
  }, [i18n.language, t]);

  const selectOptions = useMemo(
    () => createFilterOptionCatalog(bookOptions, chapterOptions),
    [bookOptions, chapterOptions],
  );

  return { selectOptions, catalogLoading, catalogError };
}
