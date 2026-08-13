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
import { useTermSearchController } from '../hooks/useTermSearchController';
import {
  type SearchResultFilterChip,
  type SearchFilterSelectionLabels,
  type SearchFilterSelections,
  type SearchFilterActivationOrder,
  type SearchFilterSelectId,
  getSearchResultFilterChips,
} from '../model';
import { useFavoritesStore } from '../../favorites/model';
import { MobileSearchTermCard } from '../../terms/components/MobileSearchTermCard';
import { TermCard } from '../../terms/components/TermCard';
import { SkeletonCard } from '../../../components/SkeletonCard';
import { BetweenBlocks, EmptyState, MobilePageFrame, SegmentedControl } from '../../../ui';
import type { Term } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { SearchFilters } from './SearchFiltersPage';
import { useSearchFilterCatalog } from '../hooks/useSearchFilterCatalog';
import { useSearchRequestClient } from '../api/searchRequestClient';
import { DesktopSearchFiltersDialog } from '../components/DesktopSearchFiltersDialog';

const DESKTOP_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return isDesktop;
}

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

function SearchResultFilterChips({
  filters,
  activeFilterCount,
  onOpenFilters,
  onOpenFilter,
  className,
  desktop = false,
  filtersOpen = false,
}: {
  filters: SearchResultFilterChip[];
  activeFilterCount: number;
  onOpenFilters?: () => void;
  onOpenFilter?: (filterId: SearchFilterSelectId) => void;
  className: string;
  desktop?: boolean;
  filtersOpen?: boolean;
}) {
  return (
    <div
      className={className}
      data-desktop-search-filters={desktop ? '' : undefined}
    >
      {filters.map((filter) => {
        const filterIsIconOnly = filter.id === 'filter';
        const chipClassName = `flex h-[30px] shrink-0 items-center justify-center gap-1 rounded-[16px] px-4 text-[14px] font-medium leading-none ${
          filter.active ? 'bg-[#44237d] text-[#f8f5fc]' : 'bg-[#ded2f1] text-[#a585db]'
        }`;
        const chipProps = {
          'data-search-result-filter': filter.id,
          'data-desktop-search-filter': desktop ? filter.id : undefined,
        };

        const chipContent = (
          <>
            {filter.id === 'filter' ? (
              <HugeiconsIcon icon={filter.icon} size={14} strokeWidth={2.3} />
            ) : (
              <HugeiconsIcon
                icon={filter.active ? Cancel01Icon : filter.icon}
                size={14}
                strokeWidth={filter.active ? 2 : 1.8}
              />
            )}
            {filter.id === 'filter' && activeFilterCount > 0 && (
              <span className="text-[#ded2f1]">{activeFilterCount}</span>
            )}
            {filter.selectedCount && !filterIsIconOnly ? (
              <span data-search-result-filter-count={filter.selectedCount} className="inline-flex items-center gap-1">
                <span className="text-[#f8f5fc]">{filter.label}</span>
                <span className="text-[#ded2f1]">{filter.selectedCount}</span>
              </span>
            ) : (
              !filterIsIconOnly && <span>{filter.label}</span>
            )}
          </>
        );

        return (
          <button
            key={filter.id}
            type="button"
            {...chipProps}
            className={chipClassName}
            aria-pressed={filter.active}
            aria-label={filterIsIconOnly ? filter.label : undefined}
            aria-controls={desktop && filterIsIconOnly ? 'search-filter-page-sheet' : undefined}
            aria-expanded={desktop && filterIsIconOnly ? filtersOpen : undefined}
            onClick={() => {
              if (filterIsIconOnly) onOpenFilters?.();
              else if (filter.selectId) onOpenFilter?.(filter.selectId);
              else filter.onToggle?.();
            }}
          >
            {chipContent}
          </button>
        );
      })}
    </div>
  );
}

export function DesktopSearchModePills() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'random' | 'forYou' | 'popular'>('random');
  const modes = [
    { value: 'random' as const, label: t('search.modeRandom') },
    { value: 'forYou' as const, label: t('search.modeForYou') },
    { value: 'popular' as const, label: t('search.modePopular') },
  ];

  return (
    <div className="flex w-full max-w-[684px] items-center gap-2" role="tablist" aria-label={t('search.title')}>
      {modes.map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-desktop-search-mode={item.value}
            data-search-mode={item.value}
            onClick={() => setMode(item.value)}
            className={`flex h-[30px] shrink-0 items-center justify-center rounded-[16px] px-4 text-[14px] font-medium leading-none ${
              active ? 'bg-[#44237d] text-[#f8f5fc]' : 'bg-[#ded2f1] text-[#a585db]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
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
  searchFilterActivationOrder,
  onQueryChange,
  onSearchInputFocus,
  onEntOnlyFilterToggle,
  onOpenFilters,
  onOpenFilter,
}: {
  query: string;
  resultCount: number;
  entOnlyFilterActive: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  searchFilterActivationOrder: SearchFilterActivationOrder;
  /** @deprecated Result navigation is owned by MobilePageFrame's app bar. */
  onBack?: () => void;
  onQueryChange: (query: string) => void;
  onSearchInputFocus: () => void;
  onEntOnlyFilterToggle: () => void;
  onOpenFilters?: () => void;
  onOpenFilter?: (filterId: SearchFilterSelectId) => void;
}) {
  const { t } = useTranslation();
  const filters = useMemo(
    () =>
      getSearchResultFilterChips({
        entOnlyFilterActive,
        searchFilterSelections,
        searchFilterSelectionLabels,
        searchFilterActivationOrder,
        onEntOnlyFilterToggle,
        t,
      }),
    [
      entOnlyFilterActive,
      onEntOnlyFilterToggle,
      searchFilterActivationOrder,
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

      <div data-between-blocks-boundary className="-mx-[24px] mb-5 flex w-[calc(100%+48px)] gap-2 overflow-x-auto px-[22px] pb-1 scroll-px-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          return (
            <button
              key={filter.id}
              type="button"
              data-search-result-filter={filter.id}
              className={chipClassName}
              aria-pressed={filter.active}
              onClick={() => {
                if (filterIsIconOnly) onOpenFilters?.();
                else if (filter.selectId) onOpenFilter?.(filter.selectId);
                else filter.onToggle?.();
              }}
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
    <EmptyState
      variant="outcome"
      data-mobile-search-empty
      data-mobile-outcome-paint
      className="hidden max-md:flex max-md:w-[calc(100%+4px)]"
      icon={<HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.6} />}
      title={t('search.emptyTitle')}
      description={t('search.emptyDescription', { query })}
      partProps={{
        icon: {
          'data-mobile-search-empty-icon': '',
          className: 'rounded-[64px] !bg-[#ded2f1] !text-[#6A37C3]',
        },
        title: { className: 'text-[#161519]' },
        description: { className: 'max-w-[284px] text-center !text-[#514b5c]' },
      }}
      action={(
        <Link
          to="/search/filters"
          data-mobile-search-empty-action
          data-mobile-outcome-action
          className="flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-none text-white"
        >
          {t('search.emptyChangeParameters')}
        </Link>
      )}
    />
  );
}

export function MobileSearchInputSheet({
  query,
  onQueryChange,
  onSubmitSearch,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmitSearch?: (query: string) => void;
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
            onSubmitSearch?.(query);
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
  // Canonical mobile result rail: className="hidden flex-col gap-4 max-md:-mx-[2px] max-md:flex max-md:w-[calc(100%+4px)]"
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [filtersOverlayRequest, setFiltersOverlayRequest] = useState<SearchFilterSelectId | null | undefined>(undefined);
  const isDesktop = useIsDesktop();
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFiltersOverlayOpenRef = useRef(false);
  const initialQuery = searchParams.get('query') ?? '';
  const searchClient = useSearchRequestClient();
  const filterCatalog = useSearchFilterCatalog(t, searchClient);
  const {
    query,
    searchFilterSelections,
    searchFilterSelectionLabels,
    searchFilterActivationOrder,
    entOnlyFilterActive,
    setQuery,
    submitSearch,
    setEntOnlyFilterActive,
    applySearchFilters,
    hasSearched,
    loadMore,
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
    filterNoMatch,
    retryFeatured,
    retrySearch,
    selectedTermId,
    setSelectedTermId,
    searchResultViewActive,
    handleMobileResultsBack,
  } = useTermSearchController(initialQuery, filterCatalog.bookCatalogSnapshot, searchClient);

  useEffect(() => {
    const filtersOverlayOpen = filtersOverlayRequest !== undefined;
    if (previousFiltersOverlayOpenRef.current && !filtersOverlayOpen) {
      filtersTriggerRef.current?.focus();
    }
    previousFiltersOverlayOpenRef.current = filtersOverlayOpen;
  }, [filtersOverlayRequest]);
  const filtersOverlayOpen = filtersOverlayRequest !== undefined;
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

  const mobileSearchEmptyActive =
    !pageIsLoading && !pageHasError && !filterNoMatch && hasSearched && showingSearchResults && displayResults.length === 0;
  const desktopFilterChips = useMemo(
    () =>
      getSearchResultFilterChips({
        entOnlyFilterActive,
        searchFilterSelections,
        searchFilterSelectionLabels,
        searchFilterActivationOrder,
        onEntOnlyFilterToggle: () => setEntOnlyFilterActive(!entOnlyFilterActive),
        t,
      }),
    [entOnlyFilterActive, searchFilterActivationOrder, searchFilterSelectionLabels, searchFilterSelections, setEntOnlyFilterActive, t],
  );
  const desktopQueryHasText = query.trim().length > 0;
  const committedFilters = useMemo(
    () => ({
      entOnly: entOnlyFilterActive,
      selections: searchFilterSelections,
      labels: searchFilterSelectionLabels,
      activationOrder: searchFilterActivationOrder,
    }),
    [entOnlyFilterActive, searchFilterActivationOrder, searchFilterSelectionLabels, searchFilterSelections],
  );

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
      contentEndInset={!mobileSearchEmptyActive}
      contentClassName={mobileSearchEmptyActive ? 'flex flex-col' : undefined}
    >
      <div
        data-desktop-search-content
        className={`mx-auto w-full min-w-0 max-w-[900px] px-6 md:max-w-none md:px-[10px] min-[1132px]:px-16 md:pb-14 md:pt-8 max-md:max-w-none max-md:bg-[#efebf6] max-md:px-[24px] ${searchResultViewActive ? '' : 'max-md:pt-[80px]'} ${mobileSearchEmptyActive ? 'max-md:flex max-md:flex-1 max-md:flex-col' : ''}`}
      >
      <div className="max-md:hidden">
        <form
          className="flex w-full max-w-[684px] min-w-0 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(query);
          }}
          data-desktop-search-controls
        >
          <label className="relative flex h-10 min-w-0 flex-1 items-center rounded-[8px] bg-white px-3 py-2 min-[1132px]:w-[400px] min-[1132px]:flex-none">
            <span className="sr-only">{t('search.title')}</span>
            <HugeiconsIcon icon={Search01Icon} size={24} strokeWidth={1.6} className="mr-4 shrink-0 text-[#c5b1e7]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholderShort')}
              className="min-w-0 flex-1 bg-transparent text-[16px] leading-6 text-[#39363f] outline-none placeholder:text-[#c5b1e7]"
            />
          </label>
          <button
            ref={filtersTriggerRef}
            type="button"
            onClick={() => setFiltersOverlayRequest(null)}
            aria-expanded={filtersOverlayOpen}
            aria-controls="search-filter-page-sheet"
            className="flex h-10 w-[125px] items-center justify-center gap-2 rounded-[8px] bg-[#ded2f1] px-4 text-[16px] font-medium leading-4 text-[#6a37c3]"
          >
            {t('searchFilters.title')}
            <HugeiconsIcon icon={FilterHorizontalIcon} size={16} strokeWidth={1.8} />
          </button>
          <button type="submit" className="flex h-10 w-[143px] items-center justify-center rounded-[8px] bg-[#572d9f] px-12 text-[16px] font-medium leading-4 text-[#ded2f1]">
            {t('searchFilters.search')}
          </button>
        </form>
        {desktopQueryHasText ? (
          <SearchResultFilterChips
            filters={desktopFilterChips}
            activeFilterCount={desktopFilterChips.find((filter) => filter.id === 'filter')?.selectedCount ?? 0}
            onOpenFilters={() => setFiltersOverlayRequest(null)}
            onOpenFilter={(filterId) => setFiltersOverlayRequest(filterId)}
            filtersOpen={filtersOverlayOpen}
            desktop
            className="mt-8 flex w-full max-w-[684px] items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
        ) : (
          <div className="mt-8 hidden w-full max-w-[684px] md:block" data-desktop-search-modes>
            <DesktopSearchModePills />
          </div>
        )}
      </div>

      <div data-mobile-outcome-header={mobileSearchEmptyActive ? '' : undefined} className={`hidden max-md:block ${mobileSearchEmptyActive ? '[&>*:last-child]:mb-0' : ''}`}>
        {searchResultViewActive ? <MobileSearchResultHeader
          query={query}
          resultCount={resultTotal}
           entOnlyFilterActive={entOnlyFilterActive}
           searchFilterSelections={searchFilterSelections}
           searchFilterSelectionLabels={searchFilterSelectionLabels}
           searchFilterActivationOrder={searchFilterActivationOrder}
           onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
          onEntOnlyFilterToggle={() => setEntOnlyFilterActive(!entOnlyFilterActive)}
          onOpenFilters={() => setFiltersOverlayRequest(null)}
          onOpenFilter={(filterId) => setFiltersOverlayRequest(filterId)}
        /> : <MobileSearchBrowseHeader
          query={query}
          onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
          onOpenFilters={() => setFiltersOverlayRequest(null)}
        />}
      </div>

      {mobileSearchEmptyActive && (
        <>
          <BetweenBlocks
            data-mobile-outcome-slot
            className="hidden max-md:grid"
            outcomeClassName="flex justify-center"
          >
            <MobileSearchEmptyState query={debounced.trim()} />
          </BetweenBlocks>
          <div data-adaptive-outcome-desktop data-desktop-search-results className="mt-6 flex w-full max-w-[684px] flex-col items-center gap-3 py-16 text-center text-muted max-md:hidden">
            <HugeiconsIcon icon={HelpCircleIcon} size={48} strokeWidth={1.4} />
            <p className="text-[16px] leading-none" children={t('search.empty')} />
          </div>
        </>
      )}

      {pageIsLoading && (
        <>
          <div data-desktop-search-results className="hidden w-full max-w-[684px] flex-col gap-4 md:mt-6 md:flex" role="status" aria-label={t('common.loading')}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="hidden flex-col gap-4 max-md:-mx-[2px] max-md:flex max-md:w-[calc(100%+4px)]" role="status" aria-label={t('common.loading')}>
            <SkeletonCard variant="mobile-term-card" />
            <SkeletonCard variant="mobile-term-card" />
            <SkeletonCard variant="mobile-term-card" />
          </div>
        </>
      )}

      {pageHasError && (
        <section data-desktop-search-results className="hidden w-full max-w-[684px] flex-col items-center gap-4 rounded-[16px] bg-white p-8 text-center md:mt-6 md:flex" role="alert" data-search-error>
          <p className="text-[16px] leading-5 text-[#514b5c]">{t('common.error')}</p>
          <button
            type="button"
            className="h-10 rounded-[8px] bg-[#6a37c3] px-8 text-[16px] font-medium leading-4 text-white"
            onClick={showingSearchResults ? retrySearch : retryFeatured}
          >
            {t('common.retry')}
          </button>
          {resourceError instanceof Error && <span className="sr-only">{resourceError.message}</span>}
        </section>
      )}
      {pageHasError && (
        <section className="flex flex-col items-center gap-4 rounded-[16px] bg-white p-8 text-center md:hidden" role="alert" data-mobile-search-error>
          <p className="text-[16px] leading-5 text-[#514b5c]">{t('common.error')}</p>
          <button
            type="button"
            className="h-10 w-full rounded-[8px] bg-[#6a37c3] px-8 text-[16px] font-medium leading-4 text-white"
            onClick={showingSearchResults ? retrySearch : retryFeatured}
          >
            {t('common.retry')}
          </button>
        </section>
      )}

      {!pageIsLoading && !pageHasError && !filterNoMatch && !showingSearchResults && displayResults.length === 0 && (
        <p data-desktop-search-results className="w-full max-w-[684px] py-12 text-center leading-none text-muted md:mt-6">{t('search.startTyping')}</p>
      )}

      {!pageIsLoading && !pageHasError && filterNoMatch && (
        <p data-desktop-search-results className="hidden w-full max-w-[684px] py-12 text-center leading-none text-muted md:mt-6 md:block">{t('search.empty')}</p>
      )}

      {!pageIsLoading && !pageHasError && displayResults.length > 0 && (
        <>
          <div data-desktop-search-results-container className="hidden min-w-0 w-full flex-col gap-4 md:flex md:mt-6">
            <div data-desktop-search-results className={`flex min-w-0 flex-col gap-4 ${selectedTermId ? 'w-full' : 'w-full max-w-[684px]'}`}>
            {visibleResults.map((term) => (
              <TermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, displayResults)}
                expansion={selectedTermId === term.public_id ? 'fill-parent' : 'intrinsic'}
                selected={selectedTermId === term.public_id}
                onSelectedChange={(nextSelected) => setSelectedTermId(nextSelected ? term.public_id : null)}
              />
            ))}
            {hiddenResultsCount > 0 && (
              <button
                type="button"
                data-desktop-search-load-more
                className="mt-2 flex h-12 w-full max-w-[684px] items-center justify-center rounded-[8px] bg-[#ded2f1] px-4 text-center text-[16px] font-medium leading-none text-[#6a37c3] transition-opacity hover:opacity-90"
                onClick={() => void loadMore()}
              >
                {t('search.loadMore', { count: hiddenResultsCount })}
              </button>
            )}
            </div>
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
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[8px] bg-[#44237d] px-4 text-center text-[16px] font-medium leading-none text-[#f8f5fc] max-md:-mx-[2px] max-md:w-[calc(100%+4px)] transition-opacity hover:opacity-90 max-md:mt-6 md:hidden"
              onClick={() => void loadMore()}
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
          onSubmitSearch={submitSearch}
          onClose={() => setMobileSearchSheetOpen(false)}
        />
      )}
      {filtersOverlayOpen && isDesktop && (
        <DesktopSearchFiltersDialog
          open
          initialFilter={filtersOverlayRequest}
          query={query}
          committed={committedFilters}
          options={filterCatalog.selectOptions}
          bookCatalogSnapshot={filterCatalog.bookCatalogSnapshot}
          catalogLoading={filterCatalog.catalogLoading}
          catalogError={filterCatalog.catalogError}
          onRetryCatalog={filterCatalog.retryCatalog}
          onApply={(snapshot) => {
            applySearchFilters(snapshot);
            setFiltersOverlayRequest(undefined);
          }}
          onDismiss={() => setFiltersOverlayRequest(undefined)}
          t={t}
        />
      )}
      {filtersOverlayOpen && !isDesktop && (
        <SearchFilters overlay initialFilter={filtersOverlayRequest} onDismiss={() => setFiltersOverlayRequest(undefined)} />
      )}
      </div>
    </MobilePageFrame>
  );
}
