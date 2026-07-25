import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  HelpCircleIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import {
  MOBILE_SEARCH_PAGE_SIZE,
  useTermSearchController,
} from '../hooks/useTermSearchController';
import {
  type SearchFilterSelectionLabels,
  type SearchFilterSelections,
  getSearchResultFilterChips,
} from '../model';
import { useFavoritesStore } from '../../favorites/model';
import { MobileSearchTermCard } from '../../terms/components/MobileSearchTermCard';
export { MobileSearchTermCard } from '../../terms/components/MobileSearchTermCard';
import { TermCard } from '../../../components/TermCard';
import { SkeletonCard } from '../../../components/SkeletonCard';
import { MobilePageFrame, SegmentedControl } from '../../../ui';
import type { Term } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { SearchFilters } from './SearchFiltersPage';

const DRAG_CLOSE_THRESHOLD = 72;
const DRAG_CLOSE_ANIMATION_MS = 180;
const DRAG_CLOSE_TRANSLATE_FALLBACK = 720;
const TOUCH_DRAG_INTENT_THRESHOLD = 6;

function getRelatedTerms(term: Term, terms: Term[]): Pick<Term, 'public_id' | 'name'>[] {
  return terms
    .filter((candidate) => candidate.public_id !== term.public_id)
    .slice(0, 2)
    .map(({ public_id, name }) => ({ public_id, name }));
}

export function MobileSearchModePills() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'random' | 'forYou' | 'popular'>('random');
  const modes = [
    { value: 'random' as const, label: t('search.modeRandom') },
    { value: 'forYou' as const, label: t('search.modeForYou') },
    { value: 'popular' as const, label: t('search.modePopular') },
  ];

  return (
    <SegmentedControl
      name="mobile-search-mode"
      label={t('search.title')}
      labelHidden
      options={modes}
      value={mode}
      onValueChange={setMode}
      className="mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>div]:h-[30px] [&>div]:gap-2 [&>div]:rounded-[16px] [&>div]:bg-transparent [&>div]:p-0 [&_label]:flex [&_label]:h-[30px] [&_label]:shrink-0 [&_label]:items-center [&_label]:justify-center [&_label]:rounded-[16px] [&_label]:px-4 [&_label]:py-0 [&_label]:leading-none [&_label]:!bg-[#ded2f1] [&_label]:!text-[#a585db] [&_label:has(:checked)]:!bg-[#44237d] [&_label:has(:checked)]:!text-[#f8f5fc]"
    />
  );
}

export function MobileSearchBrowseHeader({
  query,
  onQueryChange,
  onSearchInputFocus,
  onOpenFilters,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onSearchInputFocus: () => void;
  onOpenFilters?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-8 grid grid-cols-[minmax(0,1fr)_40px_40px] gap-2">
        <label className="relative block">
          <span className="sr-only">{t('search.title')}</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7650b4]">
            <HugeiconsIcon icon={Search01Icon} size={24} strokeWidth={1.6} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onClick={onSearchInputFocus}
            onFocus={onSearchInputFocus}
            placeholder={t('search.placeholderShort')}
            readOnly
            className="h-10 rounded-[8px] bg-white w-full py-2 pl-[52px] pr-3 text-[16px] leading-none text-[#44237d] outline-none placeholder:text-[#7650b4]"
          />
        </label>

        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={t('search.filterAria')}
          className="flex size-10 items-center justify-center rounded-[8px] bg-[#572d9f] text-[#f8f5fc]"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={1.7} />
        </button>

        <Link
          to="/favorites"
          aria-label={t('search.favoritesAria')}
          className="flex size-10 items-center justify-center rounded-[8px] bg-[#572d9f] text-[#f8f5fc]"
        >
          <HugeiconsIcon icon={Bookmark02Icon} size={18} strokeWidth={1.7} />
        </Link>
      </div>

      <MobileSearchModePills />
    </>
  );
}

export function MobileSearchResultHeader({
  query,
  resultCount,
  entOnlyFilterActive,
  searchFilterSelections,
  searchFilterSelectionLabels,
  onQueryChange,
  onSearchInputFocus,
  onEntOnlyFilterToggle,
  onOpenFilters,
}: {
  query: string;
  resultCount: number;
  entOnlyFilterActive: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  /** @deprecated Result navigation is owned by MobilePageFrame's app bar. */
  onBack?: () => void;
  onQueryChange: (query: string) => void;
  onSearchInputFocus: () => void;
  onEntOnlyFilterToggle: () => void;
  onOpenFilters?: () => void;
}) {
  const { t } = useTranslation();
  const filters = useMemo(
    () =>
      getSearchResultFilterChips({
        entOnlyFilterActive,
        searchFilterSelections,
        searchFilterSelectionLabels,
        onEntOnlyFilterToggle,
        t,
      }),
    [
      entOnlyFilterActive,
      onEntOnlyFilterToggle,
      searchFilterSelectionLabels,
      searchFilterSelections,
      t,
    ],
  );
  const activeFilterCount = filters.find((filter) => filter.id === 'filter')?.selectedCount ?? 0;
  const resultsCountLabel = t('search.resultsCount', { count: resultCount });

  return (
    <>
      <div className="mt-0 mb-4 -mx-[2px] grid w-[calc(100%+4px)] grid-cols-[minmax(0,1fr)]">
        <label className="relative block">
          <span className="sr-only">{t('search.title')}</span>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b1acb9]">
            <HugeiconsIcon icon={Search01Icon} size={24} strokeWidth={1.6} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onClick={onSearchInputFocus}
            onFocus={onSearchInputFocus}
            placeholder={t('search.placeholderShort')}
            readOnly
            className="h-10 w-full rounded-[8px] bg-white py-2 pl-14 pr-4 text-[16px] leading-none text-[#161519] outline-none placeholder:text-[#7650b4]"
          />
        </label>
      </div>

      <div className="-mx-[24px] mb-5 flex w-[calc(100%+48px)] gap-2 overflow-x-auto px-[22px] pb-1 scroll-px-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => {
          const filterIsIconOnly = filter.id === 'filter';
          const chipClassName = `flex h-[30px] shrink-0 items-center justify-center gap-1 rounded-[16px] px-4 text-[14px] font-medium leading-none ${
            filter.active ? 'bg-[#44237d] text-[#f8f5fc]' : 'bg-[#ded2f1] text-[#a585db]'
          }`;

          const chipContent = (
            <>
              {filter.id === 'filter' ? (
                <HugeiconsIcon icon={filter.icon} size={14} strokeWidth={2.3} />
              ) : (
                !filter.active && (
                  <HugeiconsIcon icon={filter.icon} size={14} strokeWidth={1.8} />
                )
              )}
              {filter.id === 'filter' && activeFilterCount > 0 && (
                <span className="text-[#ded2f1]">{activeFilterCount}</span>
              )}
              {filter.selectedCount && !filterIsIconOnly ? (
                <span
                  data-search-result-filter-count={filter.selectedCount}
                  className="inline-flex items-center gap-1"
                >
                  <span className="text-[#f8f5fc]">{filter.label}</span>
                  <span className="text-[#ded2f1]">{filter.selectedCount}</span>
                </span>
              ) : (
                !filterIsIconOnly && <span>{filter.label}</span>
              )}
            </>
          );

          return filter.to && !filterIsIconOnly ? (
            <Link
              key={filter.id}
              to={filter.to}
              data-search-result-filter={filter.id}
              className={chipClassName}
              aria-label={filterIsIconOnly ? filter.label : undefined}
            >
              {chipContent}
            </Link>
          ) : (
            <button
              key={filter.id}
              type="button"
              data-search-result-filter={filter.id}
              className={chipClassName}
              aria-pressed={filter.active}
              onClick={filterIsIconOnly ? onOpenFilters : filter.onToggle}
            >
              {chipContent}
            </button>
          );
        })}
      </div>

      {resultCount > 0 && (
        <p className="-mx-[2px] mb-4 text-[16px] font-normal leading-none text-[#514b5c]">
          {resultsCountLabel}
        </p>
      )}
    </>
  );
}

export function MobileSearchEmptyState({ query }: { query: string }) {
  const { t } = useTranslation();

  return (
    <div
      data-mobile-search-empty
      className="hidden flex-col items-center text-center max-md:mt-[140px] max-md:flex max-md:w-[calc(100%+4px)]"
    >
      <div
        data-mobile-search-empty-icon
        className="flex size-16 items-center justify-center rounded-[64px] bg-[#ded2f1] text-[#5a3688]"
      >
        <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.6} />
      </div>
      <h2 className="mt-4 text-[20px] font-medium leading-none text-[#161519]">
        {t('search.emptyTitle')}
      </h2>
      <p className="mt-4 max-w-[284px] text-center text-[14px] leading-none text-[#514b5c]">
        {t('search.emptyDescription', { query })}
      </p>
      <Link
        to="/search/filters"
        data-mobile-search-empty-action
        className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-none text-white"
      >
        {t('search.emptyChangeParameters')}
      </Link>
    </div>
  );
}

export function MobileSearchInputSheet({
  query,
  onQueryChange,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchSheetDragOffset, setSearchSheetDragOffsetState] = useState(0);
  const [isSearchSheetDragging, setIsSearchSheetDragging] = useState(false);
  const searchSheetDragStartYRef = useRef<number | null>(null);
  const searchSheetDragOffsetRef = useRef(0);
  const activeSearchSheetTouchIdRef = useRef<number | null>(null);
  const searchSheetTouchIntentRef = useRef<'sheet' | 'ignore' | null>(null);
  const searchSheetCloseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (searchSheetCloseTimeoutRef.current !== null) {
        window.clearTimeout(searchSheetCloseTimeoutRef.current);
      }
    },
    [],
  );

  function getSearchSheetDismissDragOffset() {
    const viewportHeight =
      typeof window === 'undefined' ? DRAG_CLOSE_TRANSLATE_FALLBACK : window.innerHeight;
    return Math.max(
      viewportHeight,
      DRAG_CLOSE_TRANSLATE_FALLBACK,
      searchSheetDragOffsetRef.current,
    );
  }

  function setSearchSheetDragOffset(offset: number) {
    const nextOffset = Math.max(offset, 0);
    searchSheetDragOffsetRef.current = nextOffset;
    setSearchSheetDragOffsetState(nextOffset);
  }

  function finishSearchSheetDrag(shouldClose: boolean) {
    searchSheetDragStartYRef.current = null;
    setIsSearchSheetDragging(false);

    if (shouldClose) {
      setSearchSheetDragOffset(getSearchSheetDismissDragOffset());
      searchSheetCloseTimeoutRef.current = window.setTimeout(onClose, DRAG_CLOSE_ANIMATION_MS);
      return;
    }

    setSearchSheetDragOffset(0);
  }

  function getTrackedSearchSheetTouch(touches: ReactTouchEvent<HTMLElement>['touches']) {
    const activeTouchId = activeSearchSheetTouchIdRef.current;
    if (activeTouchId === null) return null;

    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === activeTouchId) return touch;
    }

    return null;
  }

  function handleSearchSheetDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (searchSheetCloseTimeoutRef.current !== null) return;

    searchSheetDragStartYRef.current = event.clientY;
    searchSheetDragOffsetRef.current = 0;
    setIsSearchSheetDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSearchSheetDragMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (searchSheetDragStartYRef.current === null) return;

    setSearchSheetDragOffset(event.clientY - searchSheetDragStartYRef.current);
  }

  function handleSearchSheetDragEnd(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (searchSheetDragStartYRef.current === null) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishSearchSheetDrag(searchSheetDragOffsetRef.current >= DRAG_CLOSE_THRESHOLD);
  }

  function handleSearchSheetTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (searchSheetCloseTimeoutRef.current !== null) return;

    const touch = event.changedTouches.item(0);
    if (!touch) return;

    activeSearchSheetTouchIdRef.current = touch.identifier;
    searchSheetDragStartYRef.current = touch.clientY;
    searchSheetDragOffsetRef.current = 0;
    searchSheetTouchIntentRef.current = null;
  }

  function handleSearchSheetTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const touch = getTrackedSearchSheetTouch(event.touches);
    if (!touch || searchSheetDragStartYRef.current === null) return;

    const nextOffset = touch.clientY - searchSheetDragStartYRef.current;

    if (searchSheetTouchIntentRef.current === null) {
      if (Math.abs(nextOffset) < TOUCH_DRAG_INTENT_THRESHOLD) return;
      searchSheetTouchIntentRef.current = nextOffset > 0 ? 'sheet' : 'ignore';
    }

    if (searchSheetTouchIntentRef.current !== 'sheet') return;

    event.preventDefault();
    setIsSearchSheetDragging(true);
    setSearchSheetDragOffset(nextOffset);
  }

  function handleSearchSheetTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const trackedTouch = getTrackedSearchSheetTouch(event.changedTouches);
    const wasSheetDrag = searchSheetTouchIntentRef.current === 'sheet';

    activeSearchSheetTouchIdRef.current = null;
    searchSheetTouchIntentRef.current = null;

    if (!trackedTouch && !wasSheetDrag) return;

    if (wasSheetDrag) {
      if (searchSheetDragOffsetRef.current > 0) event.preventDefault();
      finishSearchSheetDrag(searchSheetDragOffsetRef.current >= DRAG_CLOSE_THRESHOLD);
      return;
    }

    searchSheetDragStartYRef.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 hidden max-md:block">
      <button
        type="button"
        aria-label={t('search.sheetClose')}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        data-mobile-search-sheet
        aria-labelledby="mobile-search-sheet-title"
        onPointerDown={handleSearchSheetDragStart}
        onPointerMove={handleSearchSheetDragMove}
        onPointerUp={handleSearchSheetDragEnd}
        onPointerCancel={handleSearchSheetDragEnd}
        onTouchStart={handleSearchSheetTouchStart}
        onTouchMove={handleSearchSheetTouchMove}
        onTouchEnd={handleSearchSheetTouchEnd}
        onTouchCancel={handleSearchSheetTouchEnd}
        className="mobile-search-sheet absolute inset-x-0 bottom-0 top-[62px] overflow-hidden rounded-t-[32px] bg-white px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 animate-[mobile-search-sheet-in_180ms_ease-out] motion-reduce:animate-none"
        style={{
          transform:
            searchSheetDragOffset > 0 ? `translateY(${searchSheetDragOffset}px)` : undefined,
          transition: isSearchSheetDragging ? 'none' : undefined,
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
          }}
        >
        <button
          type="button"
          aria-label={t('search.sheetClose')}
          className="mx-auto mb-[21px] block h-1 w-8 rounded-[4px] bg-[#ded2f1]"
          onClick={onClose}
        />

        <h2
          id="mobile-search-sheet-title"
          className="mb-[17px] text-[20px] font-normal leading-none text-[#6a37c3] [text-align:center]"
        >
          {t('search.sheetTitle')}
        </h2>

        <div className="relative">
          <label htmlFor="mobile-search-sheet-input" className="sr-only">
            {t('search.title')}
          </label>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7650b4]">
            <HugeiconsIcon icon={Search01Icon} size={24} strokeWidth={1.6} />
          </span>
          <input
            id="mobile-search-sheet-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onBlur={(event) => {
              if (isSearchSheetDragging || searchSheetDragStartYRef.current !== null) return;
              if (!event.currentTarget.form?.contains(event.relatedTarget)) onClose();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
            }}
            enterKeyHint="search"
            inputMode="search"
            placeholder={t('search.placeholderShort')}
            className="mobile-search-sheet-field h-12 w-full rounded-[12px] border border-[#a585db] bg-white py-3 pl-[52px] pr-[52px] text-[16px] leading-none text-[#44237d] outline-none placeholder:text-[#7650b4]"
          />
          {query && (
            <button
              type="button"
              data-mobile-search-clear
              aria-label={t('search.clearInput')}
              className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[#7650b4] transition-colors hover:text-[#572d9f]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onQueryChange('');
                inputRef.current?.focus();
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </button>
          )}
        </div>
        </form>
      </section>
    </div>
  );
}

export function TermSearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [filtersOverlayOpen, setFiltersOverlayOpen] = useState(false);
  const initialQuery = searchParams.get('query') ?? '';
  const {
    query,
    searchFilterSelections,
    searchFilterSelectionLabels,
    entOnlyFilterActive,
    setQuery,
    setEntOnlyFilterActive,
    hasSearched,
    setVisibleCount,
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
  } = useTermSearchController(initialQuery);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const ensureStatuses = useFavoritesStore((state) => state.ensureStatuses);
  const favoriteRefs = useMemo(
    () => displayResults.map((term) => term.public_id),
    [displayResults],
  );

  useEffect(() => {
    if (!isAuthenticated || favoriteRefs.length === 0) return;
    void ensureStatuses(favoriteRefs).catch(() => undefined);
  }, [ensureStatuses, favoriteRefs, isAuthenticated]);

  const mobileSearchResultAppBar = searchResultViewActive
    ? {
        title: t('search.resultsTitle'),
        tone: 'canvas' as const,
        titleAlign: 'start' as const,
        compactLayout: 'leading-only' as const,
        leading: (
          <button
            type="button"
            className="text-[#252329]"
            aria-label={t('common.previous')}
            onClick={handleMobileResultsBack}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
          </button>
        ),
      }
    : undefined;

  return (
    <MobilePageFrame
      tone="canvas"
      appBar={mobileSearchResultAppBar}
      contentId="term-search-content"
      contentLabel={t('search.title')}
    >
      <div
        className={`mx-auto max-w-[900px] px-6 pb-14 md:pt-14 max-md:max-w-none max-md:bg-[#efebf6] max-md:px-[24px] max-md:pb-8 ${searchResultViewActive ? '' : 'max-md:pt-[80px]'}`}
      >
      <div className="max-md:hidden">
        <header className="mb-8 text-left">
          <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
            {t('search.eyebrow')}
          </p>
          <h1 className="mt-2 text-[36px] font-medium leading-none text-text max-md:text-[26px]">
            {t('search.title')}
          </h1>
          <p className="mt-3 max-w-[680px] text-[16px] leading-none text-text-body">
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
            className="w-full rounded-[15px] border border-border bg-surface py-4 pl-14 pr-5 text-[18px] leading-none text-text shadow-feature outline-none transition-colors focus:border-accent max-md:shadow-none"
          />
        </div>
      </div>

      <div className="hidden max-md:block">
        {searchResultViewActive ? <MobileSearchResultHeader
          query={query}
          resultCount={displayResults.length}
           entOnlyFilterActive={entOnlyFilterActive}
           searchFilterSelections={searchFilterSelections}
           searchFilterSelectionLabels={searchFilterSelectionLabels}
           onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
          onEntOnlyFilterToggle={() => setEntOnlyFilterActive(!entOnlyFilterActive)}
          onOpenFilters={() => setFiltersOverlayOpen(true)}
        /> : <MobileSearchBrowseHeader
          query={query}
          onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
          onOpenFilters={() => setFiltersOverlayOpen(true)}
        />}
      </div>

      {pageIsLoading && (
        <div className="flex flex-col gap-4 max-md:gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!pageIsLoading && hasSearched && showingSearchResults && displayResults.length === 0 && (
        <>
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted max-md:hidden">
            <HugeiconsIcon icon={HelpCircleIcon} size={48} strokeWidth={1.4} />
            <p className="text-[16px] leading-none" children={t('search.empty')} />
          </div>
          <MobileSearchEmptyState query={debounced.trim()} />
        </>
      )}

      {!pageIsLoading && !showingSearchResults && displayResults.length === 0 && (
        <p className="py-12 text-center leading-none text-muted">{t('search.startTyping')}</p>
      )}

      {!pageIsLoading && displayResults.length > 0 && (
        <>
          <div className="flex flex-col gap-4 max-md:hidden">
            {visibleResults.map((term) => (
              <TermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, displayResults)}
              />
            ))}
          </div>

          <div className="hidden flex-col gap-4 max-md:-mx-[2px] max-md:flex max-md:w-[calc(100%+4px)]">
            {visibleResults.map((term) => (
              <MobileSearchTermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, displayResults)}
              />
            ))}
          </div>

          {hiddenResultsCount > 0 && (
            <button
              type="button"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[8px] bg-[#44237d] px-4 text-center text-[16px] font-medium leading-none text-[#f8f5fc] max-md:-mx-[2px] max-md:w-[calc(100%+4px)] transition-opacity hover:opacity-90 max-md:mt-6"
              onClick={() => {
                if (!showingSearchResults) setHasExpandedRandomResults(true);
                setVisibleCount((count) => count + MOBILE_SEARCH_PAGE_SIZE);
              }}
            >
              {t('search.loadMore', { count: hiddenResultsCount })}
            </button>
          )}
        </>
      )}

      {mobileSearchSheetOpen && (
        <MobileSearchInputSheet
          query={query}
          onQueryChange={setQuery}
          onClose={() => setMobileSearchSheetOpen(false)}
        />
      )}
      {filtersOverlayOpen && <SearchFilters overlay onDismiss={() => setFiltersOverlayOpen(false)} />}
      </div>
    </MobilePageFrame>
  );
}
