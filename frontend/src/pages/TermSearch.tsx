import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { useDebounce } from '../hooks/useDebounce';
import { searchTerms } from '../api/terms';
import { useSearchStore } from '../stores/searchStore';
import { TermCard } from '../components/TermCard';
import { SkeletonCard } from '../components/SkeletonCard';

export function TermSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { query, results, isLoading, setQuery, setResults, setLoading } =
    useSearchStore();
  const [hasSearched, setHasSearched] = useState(false);
  const debounced = useDebounce(query, 400);
  const initialQuery = searchParams.get('query') ?? '';

  useEffect(() => {
    if (initialQuery.trim()) setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setHasSearched(true);
    searchTerms(debounced)
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

  return (
    <div className="mx-auto max-w-[900px] px-6 py-14 max-md:px-4">
      <header className="mb-8 text-left">
        <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
          {t('search.eyebrow')}
        </p>
        <h1 className="mt-2 text-[36px] font-medium leading-tight text-text max-md:text-[26px]">
          {t('search.title')}
        </h1>
        <p className="mt-3 max-w-[680px] text-[16px] leading-6 text-text-body">
          {t('search.description')}
        </p>
      </header>

      <div className="relative mb-8">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted">
          <HugeiconsIcon icon={Search01Icon} size={22} strokeWidth={1.7} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full bg-surface border border-border rounded-[15px] pl-14 pr-5 py-4 text-[18px] text-text outline-none focus:border-accent shadow-feature transition-colors max-md:shadow-none"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-16 text-muted flex flex-col items-center gap-3">
          <HugeiconsIcon icon={HelpCircleIcon} size={48} strokeWidth={1.4} />
          <p className="text-[16px]">{t('search.empty')}</p>
        </div>
      )}

      {!isLoading && !hasSearched && (
        <p className="text-center text-muted py-12">{t('search.startTyping')}</p>
      )}

      {!isLoading && results.length > 0 && (
        <div className="flex flex-col gap-4">
          {results.map((term) => (
            <TermCard key={term.public_id} term={term} />
          ))}
        </div>
      )}
    </div>
  );
}
