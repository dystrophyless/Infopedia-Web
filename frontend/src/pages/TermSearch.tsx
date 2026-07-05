import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import type { TFunction } from 'i18next';
import {
  ArrowLeft01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  HelpCircleIcon,
  PlusSignIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { useDebounce } from '../hooks/useDebounce';
import { getFeaturedTerms, searchTerms } from '../api/terms';
import {
  useSearchStore,
  type SearchFilterSelectId,
  type SearchFilterSelectionLabels,
  type SearchFilterSelections,
} from '../stores/searchStore';
import { TermCard } from '../components/TermCard';
import { SkeletonCard } from '../components/SkeletonCard';
import type { Definition, FeaturedTerm, Term } from '../types';

const SEARCH_RESULT_LIMIT = 11;
const MOBILE_SEARCH_PAGE_SIZE = 4;
const DRAG_CLOSE_THRESHOLD = 72;
const DRAG_CLOSE_ANIMATION_MS = 180;
const DRAG_CLOSE_TRANSLATE_FALLBACK = 720;
const TOUCH_DRAG_INTENT_THRESHOLD = 6;

function previewText(text: string): string {
  return text.trim().replace(/\n{2,}/g, '\n');
}

function toFeaturedTerm({ term, featured_definition }: FeaturedTerm): Term {
  return {
    ...term,
    definitions: [featured_definition],
  };
}

function getRelatedTerms(term: Term, terms: Term[]): Pick<Term, 'public_id' | 'name'>[] {
  return terms
    .filter((candidate) => candidate.public_id !== term.public_id)
    .slice(0, 2)
    .map(({ public_id, name }) => ({ public_id, name }));
}

function normalizeSearchFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s._-]+/g, '');
}

const BOOK_FILTER_ALIASES: Record<string, string[]> = {
  atamura: ['Атамұра', 'Атамура', 'Atamura'],
  armanPv: ['Арман ПВ', 'Арман-ПВ', 'Arman PV', 'Arman-PV', 'ArmanPV'],
  mektep: ['Мектеп', 'Mektep'],
  almatykitap: ['Алматыкітап', 'Алматыкитап', 'Almatykitap', 'Almaty kitap'],
};

function getBookFilterCandidates(selectedId: string): string[] {
  return [selectedId, ...(BOOK_FILTER_ALIASES[selectedId] ?? [])];
}

function selectedFilterMatchesValue(
  value: string | number | undefined | null,
  selectedIds: string[],
  getCandidates: (selectedId: string) => string[] = (selectedId) => [selectedId],
): boolean {
  if (selectedIds.length === 0) return true;
  if (value === undefined || value === null) return false;

  const normalizedValue = normalizeSearchFilterValue(String(value));
  return selectedIds.some((selectedId) =>
    getCandidates(selectedId).some(
      (candidate) => normalizeSearchFilterValue(candidate) === normalizedValue,
    ),
  );
}

function definitionMatchesSearchFilters(
  definition: Definition,
  searchFilterSelections: SearchFilterSelections,
): boolean {
  const book = definition.topic?.book;
  const chapter = definition.topic?.chapter;
  const matchesBook =
    selectedFilterMatchesValue(book?.public_id, searchFilterSelections.book) ||
    selectedFilterMatchesValue(
      book?.publisher,
      searchFilterSelections.book,
      getBookFilterCandidates,
    );
  const matchesGrade = selectedFilterMatchesValue(book?.grade, searchFilterSelections.grade);
  const matchesSection =
    searchFilterSelections.section.length === 0 ||
    [chapter?.public_id, chapter?.name].some((value) =>
      selectedFilterMatchesValue(value, searchFilterSelections.section),
    );

  return matchesBook && matchesGrade && matchesSection;
}

function hasActiveSearchFilters(searchFilterSelections: SearchFilterSelections): boolean {
  return Object.values(searchFilterSelections).some((selectedIds) => selectedIds.length > 0);
}

function termMatchesSearchFilters(
  term: Term,
  searchFilterSelections: SearchFilterSelections,
): boolean {
  if (!hasActiveSearchFilters(searchFilterSelections)) return true;
  return (
    term.definitions?.some((definition) =>
      definitionMatchesSearchFilters(definition, searchFilterSelections),
    ) ?? false
  );
}

function filterTermsBySearchFilters(
  terms: Term[],
  searchFilterSelections: SearchFilterSelections,
): Term[] {
  if (!hasActiveSearchFilters(searchFilterSelections)) return terms;
  return terms.filter((term) => termMatchesSearchFilters(term, searchFilterSelections));
}

function bookChip(definition: Definition | undefined, t: TFunction): string | null {
  const book = definition?.topic?.book;
  if (!book?.publisher) return null;
  if (!book.grade) return book.publisher;
  return t('metadata.bookWithGrade', { publisher: book.publisher, grade: book.grade });
}

function MobileSearchModePills() {
  const { t } = useTranslation();
  const modes = [
    { id: 'random', label: t('search.modeRandom'), active: true },
    { id: 'forYou', label: t('search.modeForYou'), active: false },
    { id: 'popular', label: t('search.modePopular'), active: false },
  ];

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          data-search-mode-pill={mode.id}
          className={`flex h-[30px] shrink-0 items-center justify-center rounded-[16px] px-4 text-[14px] font-medium leading-none ${
            mode.active
              ? 'bg-[#44237d] text-[#f8f5fc]'
              : 'bg-[#ded2f1] text-[#a585db]'
          }`}
          aria-pressed={mode.active}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function MobileSearchBrowseHeader({
  query,
  onQueryChange,
  onSearchInputFocus,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onSearchInputFocus: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-8 grid grid-cols-[minmax(0,1fr)_40px_40px] gap-2">
        <label className="relative block">
          <span className="sr-only">{t('search.title')}</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c5b1e7]">
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
            className="h-10 rounded-[8px] bg-white w-full py-2 pl-[52px] pr-3 text-[16px] leading-6 text-[#44237d] outline-none placeholder:text-[#c5b1e7]"
          />
        </label>

        <Link
          to="/search/filters"
          aria-label={t('search.filterAria')}
          className="flex size-10 items-center justify-center rounded-[8px] bg-[#572d9f] text-[#f8f5fc]"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={18} strokeWidth={1.7} />
        </Link>

        <Link
          to="/profile"
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

function MobileSearchResultAppBar({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <header className="flex h-14 -mx-[24px] w-[calc(100%+48px)] items-center gap-4 px-4 text-[#252329]">
      <button
        type="button"
        className="flex size-6 items-center justify-center text-[#252329]"
        aria-label={t('common.previous')}
        onClick={onBack}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
      </button>
      <h1 className="text-[16px] font-medium leading-4 text-[#252329]">
        {t('search.resultsTitle')}
      </h1>
    </header>
  );
}

type SearchResultFilterChipId = 'filter' | 'specification' | 'book' | 'grade' | 'topic';

interface SearchResultFilterChip {
  id: SearchResultFilterChipId;
  label: string;
  icon: typeof FilterHorizontalIcon;
  active: boolean;
  selectedCount?: number;
  toggle?: boolean;
  to?: string;
  onToggle?: () => void;
}

interface SelectedResultFilterLabel {
  label: string;
  selectedCount?: number;
}

function getResultFilterCategoryLabel(filterId: SearchFilterSelectId, t: TFunction): string {
  if (filterId === 'book') return t('search.resultFilterBook');
  if (filterId === 'grade') return t('search.resultFilterGrade');
  return t('search.resultFilterTopic');
}

function getFallbackResultFilterOptionLabel(
  filterId: SearchFilterSelectId,
  selectedId: string,
  t: TFunction,
): string {
  if (filterId === 'grade') {
    return t(`searchFilters.grade${selectedId}`);
  }

  if (filterId === 'book') {
    const labelKeyByBookId: Record<string, string> = {
      atamura: 'searchFilters.books.atamura',
      armanPv: 'searchFilters.books.armanPv',
      mektep: 'searchFilters.books.mektep',
      almatykitap: 'searchFilters.books.almatykitap',
    };
    const labelKey = labelKeyByBookId[selectedId];
    return labelKey ? t(labelKey) : selectedId;
  }

  if (/^[A-Z0-9_]+$/.test(selectedId)) {
    return t(`analyze.chapters.${selectedId}`);
  }

  return selectedId;
}

function getSelectedResultFilterLabel(
  filterId: SearchFilterSelectId,
  selectedIds: string[],
  t: TFunction,
  selectionLabels: Record<string, string> | undefined,
): SelectedResultFilterLabel | null {
  if (selectedIds.length === 0) return null;

  if (selectedIds.length > 1) {
    return {
      label: getResultFilterCategoryLabel(filterId, t),
      selectedCount: selectedIds.length,
    };
  }

  return {
    label:
      selectionLabels?.[selectedIds[0]] ??
      getFallbackResultFilterOptionLabel(filterId, selectedIds[0], t),
  };
}

function getSearchResultFilterChips({
  entOnlyFilterActive,
  searchFilterSelections,
  searchFilterSelectionLabels,
  onEntOnlyFilterToggle,
  t,
}: {
  entOnlyFilterActive: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  onEntOnlyFilterToggle: () => void;
  t: TFunction;
}): SearchResultFilterChip[] {
  const bookLabel = getSelectedResultFilterLabel(
    'book',
    searchFilterSelections.book,
    t,
    searchFilterSelectionLabels.book,
  );
  const gradeLabel = getSelectedResultFilterLabel(
    'grade',
    searchFilterSelections.grade,
    t,
    searchFilterSelectionLabels.grade,
  );
  const sectionLabel = getSelectedResultFilterLabel(
    'section',
    searchFilterSelections.section,
    t,
    searchFilterSelectionLabels.section,
  );
  const filterChips: SearchResultFilterChip[] = [
    {
      id: 'specification',
      label: t('search.resultFilterSpecification'),
      icon: PlusSignIcon,
      active: entOnlyFilterActive,
      toggle: true,
      onToggle: onEntOnlyFilterToggle,
    },
    {
      id: 'book',
      label: bookLabel?.label ?? t('search.resultFilterBook'),
      icon: PlusSignIcon,
      active: Boolean(bookLabel),
      selectedCount: bookLabel?.selectedCount,
      to: '/search/filters?select=book',
    },
    {
      id: 'grade',
      label: gradeLabel?.label ?? t('search.resultFilterGrade'),
      icon: PlusSignIcon,
      active: Boolean(gradeLabel),
      selectedCount: gradeLabel?.selectedCount,
      to: '/search/filters?select=grade',
    },
    {
      id: 'topic',
      label: sectionLabel?.label ?? t('search.resultFilterTopic'),
      icon: PlusSignIcon,
      active: Boolean(sectionLabel),
      selectedCount: sectionLabel?.selectedCount,
      to: '/search/filters?select=section',
    },
  ];
  const activeFilterCount = filterChips.filter((filter) => filter.active).length;
  const filterCountChip: SearchResultFilterChip = {
    id: 'filter',
    label: t('search.filterAria'),
    icon: FilterHorizontalIcon,
    active: activeFilterCount > 0,
    selectedCount: activeFilterCount > 0 ? activeFilterCount : undefined,
    to: '/search/filters',
  };
  const usedFilters = filterChips.filter((filter) => filter.active);
  const unusedFilters = filterChips.filter((filter) => !filter.active);

  return [filterCountChip, ...usedFilters, ...unusedFilters];
}

function MobileSearchResultHeader({
  query,
  resultCount,
  entOnlyFilterActive,
  searchFilterSelections,
  searchFilterSelectionLabels,
  onBack,
  onQueryChange,
  onSearchInputFocus,
  onEntOnlyFilterToggle,
}: {
  query: string;
  resultCount: number;
  entOnlyFilterActive: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  onBack: () => void;
  onQueryChange: (query: string) => void;
  onSearchInputFocus: () => void;
  onEntOnlyFilterToggle: () => void;
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
      <MobileSearchResultAppBar onBack={onBack} />

      <div className="mt-2 mb-4 -mx-[2px] grid w-[calc(100%+4px)] grid-cols-[minmax(0,1fr)]">
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
            className="h-10 w-full rounded-[8px] bg-white py-2 pl-14 pr-4 text-[16px] leading-6 text-[#161519] outline-none placeholder:text-[#c5b1e7]"
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

          return filter.to ? (
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
              onClick={filter.onToggle}
            >
              {chipContent}
            </button>
          );
        })}
      </div>

      <p className="-mx-[2px] mb-4 text-[16px] font-normal leading-4 text-[#6e6779]">
        {resultsCountLabel}
      </p>
    </>
  );
}

function MobileSearchEmptyState({ query }: { query: string }) {
  const { t } = useTranslation();

  return (
    <div
      data-mobile-search-empty
      className="hidden flex-col items-center text-center max-md:mt-[88px] max-md:flex max-md:w-[calc(100%+4px)]"
    >
      <div
        data-mobile-search-empty-icon
        className="flex size-16 items-center justify-center rounded-[64px] bg-[#ded2f1] text-[#a585db]"
      >
        <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.6} />
      </div>
      <h2 className="mt-[21px] text-[20px] font-medium leading-5 text-[#161519]">
        {t('search.emptyTitle')}
      </h2>
      <p className="mt-[21px] max-w-[284px] text-center text-[14px] leading-[14px] text-[#6e6779]">
        {t('search.emptyDescription', { query })}
      </p>
      <Link
        to="/search/filters"
        data-mobile-search-empty-action
        className="mt-[21px] flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-4 text-white"
      >
        {t('search.emptyChangeParameters')}
      </Link>
    </div>
  );
}

function MobileSearchInputSheet({
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

      <form
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
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="mobile-search-sheet absolute inset-x-0 bottom-0 top-[62px] overflow-hidden rounded-t-[32px] bg-white px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 animate-[mobile-search-sheet-in_180ms_ease-out] motion-reduce:animate-none"
        style={{
          transform:
            searchSheetDragOffset > 0 ? `translateY(${searchSheetDragOffset}px)` : undefined,
          transition: isSearchSheetDragging ? 'none' : undefined,
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
          className="mb-[17px] text-[20px] font-normal leading-5 text-[#6a37c3] [text-align:center]"
        >
          {t('search.sheetTitle')}
        </h2>

        <div className="relative">
          <label htmlFor="mobile-search-sheet-input" className="sr-only">
            {t('search.title')}
          </label>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a585db]">
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
            className="mobile-search-sheet-field h-12 w-full rounded-[12px] border border-[#a585db] bg-white py-3 pl-[52px] pr-[52px] text-[16px] leading-6 text-[#44237d] outline-none placeholder:text-[#a585db]"
          />
          {query && (
            <button
              type="button"
              data-mobile-search-clear
              aria-label={t('search.clearInput')}
              className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[#a585db] transition-colors hover:text-[#572d9f]"
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
    </div>
  );
}

function MobileSearchTermCard({
  term,
  relatedTerms = [],
}: {
  term: Term;
  relatedTerms?: Pick<Term, 'public_id' | 'name'>[];
}) {
  const { t } = useTranslation();
  const definition = term.definitions?.[0];
  const source = bookChip(definition, t);
  const page =
    definition?.page !== undefined && definition.page !== null
      ? t('search.pageChip', { page: definition.page })
      : null;
  const chips = [source, page].filter(Boolean);

  return (
    <article className="rounded-[16px] bg-white px-6 py-8 text-[#161519]">
      <div className="px-2">
        <div className="relative min-h-6 pr-10">
          <h2 className="max-w-[274px] text-[20px] font-medium leading-5">
            {term.name}
          </h2>
          <button
            type="button"
            className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-[6px] text-[#161519]"
            aria-label={t('search.saveTermAria', { term: term.name })}
          >
            <HugeiconsIcon icon={Bookmark02Icon} size={24} strokeWidth={1.6} />
          </button>
        </div>

        {definition && (
          <div className="relative mt-6 h-24 overflow-hidden">
            <p className="line-clamp-6 whitespace-pre-line text-[16px] leading-4 text-[#8c8698]">
              {previewText(definition.text)}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent" />
          </div>
        )}

        {chips.length > 0 && (
          <div className="mt-4 flex h-6 flex-wrap items-center gap-2 overflow-hidden">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex h-6 max-w-full items-center rounded-[8px] bg-[#eae9ec] px-3 text-[12px] leading-none text-[#b1acb9]"
              >
                <span className="truncate">{chip}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        to={`/terms/${term.public_id}`}
        state={{ backTo: '/search', term, relatedTerms }}
        className="mt-8 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#572d9f] px-4 text-[16px] font-medium leading-none text-[#efeaf8] transition-opacity hover:opacity-90"
      >
        {t('search.detailsCta')}
      </Link>
    </article>
  );
}

export function TermSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
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
  const initialQuery = searchParams.get('query') ?? '';

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

  return (
    <div className="mx-auto max-w-[900px] px-6 py-14 max-md:max-w-none max-md:min-h-[100dvh] max-md:bg-[#efebf6] max-md:px-[24px] max-md:pb-0 max-md:pt-[max(64px,calc(24px+env(safe-area-inset-top,0px)))]">
      <div className="max-md:hidden">
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
            className="w-full rounded-[15px] border border-border bg-surface py-4 pl-14 pr-5 text-[18px] text-text shadow-feature outline-none transition-colors focus:border-accent max-md:shadow-none"
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
          onBack={handleMobileResultsBack}
          onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
          onEntOnlyFilterToggle={() => setEntOnlyFilterActive(!entOnlyFilterActive)}
        /> : <MobileSearchBrowseHeader
          query={query}
          onQueryChange={setQuery}
          onSearchInputFocus={() => setMobileSearchSheetOpen(true)}
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
            <p className="text-[16px]">{t('search.empty')}</p>
          </div>
          <MobileSearchEmptyState query={debounced.trim()} />
        </>
      )}

      {!pageIsLoading && !showingSearchResults && displayResults.length === 0 && (
        <p className="py-12 text-center text-muted">{t('search.startTyping')}</p>
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
    </div>
  );
}
