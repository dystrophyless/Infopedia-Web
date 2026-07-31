import { useEffect, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Cancel01Icon, CheckIcon } from '@hugeicons/core-free-icons';
import { useSearchFilterCatalog } from '../hooks/useSearchFilterCatalog';
import {
  getFilterTitle,
  getSelectedFilterOptions,
  isFilterSelectId,
  resolveOptionLabel,
  useSearchStore,
  type FilterOption,
  type FilterSelectId,
} from '../model';

const DRAG_CLOSE_THRESHOLD = 72;
const DRAG_CLOSE_ANIMATION_MS = 180;
const DRAG_CLOSE_TRANSLATE_FALLBACK = 720;
const TOUCH_DRAG_INTENT_THRESHOLD = 6;

export interface SearchFiltersProps {
  overlay?: boolean;
  onDismiss?: () => void;
}

export function SearchFilters({ overlay = false, onDismiss }: SearchFiltersProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedFilter = searchParams.get('select');
  const quickSelectFilter = isFilterSelectId(requestedFilter) ? requestedFilter : null;
  const {
    entOnlyFilterActive: entOnly,
    searchFilterSelections: selections,
    setEntOnlyFilterActive,
    toggleSearchFilterOption,
    removeSearchFilterOption,
    resetSearchFilterOptions,
    resetSearchFilters,
  } = useSearchStore();
  const [activeFilter, setActiveFilter] = useState<FilterSelectId | null>(null);
  const { selectOptions, catalogLoading, catalogError } = useSearchFilterCatalog(t);
  const [pageDragOffset, setPageDragOffset] = useState(0);
  const [isPageDragging, setIsPageDragging] = useState(false);
  const filterPageScrollRef = useRef<HTMLDivElement | null>(null);
  const pageDragStartYRef = useRef<number | null>(null);
  const pageDragOffsetRef = useRef(0);
  const activePageTouchIdRef = useRef<number | null>(null);
  const pageTouchDragIntentRef = useRef<'sheet' | 'page' | null>(null);
  const pageCloseTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pageCloseTimeoutRef.current !== null) {
        window.clearTimeout(pageCloseTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (isFilterSelectId(requestedFilter)) {
      setActiveFilter(requestedFilter);
    }
  }, [requestedFilter]);

  function resetFiltersPage() {
    resetSearchFilters();
    setActiveFilter(null);
  }

  function closeFiltersPage() {
    if (overlay) {
      onDismiss?.();
      return;
    }

    navigate('/search');
  }

  function closeActiveFilterDialog() {
    if (quickSelectFilter) {
      closeFiltersPage();
      return;
    }

    setActiveFilter(null);
  }

  function getPageDismissDragOffset() {
    const viewportHeight =
      typeof window === 'undefined' ? DRAG_CLOSE_TRANSLATE_FALLBACK : window.innerHeight;
    return Math.max(viewportHeight, DRAG_CLOSE_TRANSLATE_FALLBACK, pageDragOffsetRef.current);
  }

  function setPageSheetDragOffset(offset: number) {
    const nextOffset = Math.max(offset, 0);
    pageDragOffsetRef.current = nextOffset;
    setPageDragOffset(nextOffset);
  }

  function finishPageDrag(shouldClose: boolean) {
    pageDragStartYRef.current = null;
    setIsPageDragging(false);

    if (shouldClose) {
      setPageDragOffset(getPageDismissDragOffset());
      pageCloseTimeoutRef.current = window.setTimeout(closeFiltersPage, DRAG_CLOSE_ANIMATION_MS);
      return;
    }

    setPageSheetDragOffset(0);
  }

  function getTrackedPageTouch(touches: ReactTouchEvent<HTMLElement>['touches']) {
    const activeTouchId = activePageTouchIdRef.current;
    if (activeTouchId === null) return null;

    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === activeTouchId) return touch;
    }

    return null;
  }

  function canFilterPageScroll(deltaY: number) {
    const pageScroll = filterPageScrollRef.current;
    if (!pageScroll) return false;

    if (deltaY > 0) return pageScroll.scrollTop > 0;
    if (deltaY < 0) {
      return pageScroll.scrollTop + pageScroll.clientHeight < pageScroll.scrollHeight - 1;
    }

    return false;
  }

  function handlePageDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (pageCloseTimeoutRef.current !== null) return;

    pageDragStartYRef.current = event.clientY;
    pageDragOffsetRef.current = 0;
    setIsPageDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePageDragMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (pageDragStartYRef.current === null) return;

    setPageSheetDragOffset(event.clientY - pageDragStartYRef.current);
  }

  function handlePageDragEnd(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (pageDragStartYRef.current === null) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishPageDrag(pageDragOffsetRef.current >= DRAG_CLOSE_THRESHOLD);
  }

  function handlePageTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (pageCloseTimeoutRef.current !== null) return;

    const touch = event.changedTouches.item(0);
    if (!touch) return;

    activePageTouchIdRef.current = touch.identifier;
    pageDragStartYRef.current = touch.clientY;
    pageDragOffsetRef.current = 0;
    pageTouchDragIntentRef.current = null;
  }

  function handlePageTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const touch = getTrackedPageTouch(event.touches);
    if (!touch || pageDragStartYRef.current === null) return;

    const nextOffset = touch.clientY - pageDragStartYRef.current;

    if (pageTouchDragIntentRef.current === null) {
      if (Math.abs(nextOffset) < TOUCH_DRAG_INTENT_THRESHOLD) return;

      if (canFilterPageScroll(nextOffset)) {
        pageTouchDragIntentRef.current = 'page';
        return;
      }

      pageTouchDragIntentRef.current = nextOffset > 0 ? 'sheet' : 'page';
    }

    if (pageTouchDragIntentRef.current !== 'sheet') return;

    event.preventDefault();
    setIsPageDragging(true);
    setPageSheetDragOffset(nextOffset);
  }

  function handlePageTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const trackedTouch = getTrackedPageTouch(event.changedTouches);
    const wasSheetDrag = pageTouchDragIntentRef.current === 'sheet';

    activePageTouchIdRef.current = null;
    pageTouchDragIntentRef.current = null;

    if (!trackedTouch && !wasSheetDrag) return;

    if (wasSheetDrag) {
      if (pageDragOffsetRef.current > 0) event.preventDefault();
      finishPageDrag(pageDragOffsetRef.current >= DRAG_CLOSE_THRESHOLD);
      return;
    }

    pageDragStartYRef.current = null;
  }

  return (
    <div
      data-search-filter-page-scroll
      ref={filterPageScrollRef}
      className={overlay
        ? 'fixed inset-0 z-50 bg-transparent max-md:overflow-y-auto'
        : 'mx-auto max-w-[900px] px-6 py-14 max-md:fixed max-md:inset-0 max-md:z-50 max-md:max-w-none max-md:overflow-y-auto max-md:bg-[#efebf6] max-md:px-0 max-md:py-0'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeFiltersPage();
      }}
    >
      <section
        data-search-filter-page-sheet
        className={`search-filter-sheet mx-auto max-w-[560px] rounded-[16px] bg-surface px-6 py-8 ${overlay
          ? 'mt-[80px] min-h-[calc(100dvh-80px)] max-w-none rounded-b-none rounded-t-[32px] bg-white flex flex-col overflow-hidden px-6 pb-0 pt-2'
          : 'max-md:mt-[calc(62px+env(safe-area-inset-top))] max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-[32px] max-md:bg-white max-md:min-h-[calc(100dvh-62px)] max-md:flex max-md:flex-col max-md:overflow-hidden max-md:px-6 max-md:pb-0 max-md:pt-2'}`}
        onPointerDown={handlePageDragStart}
        onPointerMove={handlePageDragMove}
        onPointerUp={handlePageDragEnd}
        onPointerCancel={handlePageDragEnd}
        onTouchStart={handlePageTouchStart}
        onTouchMove={handlePageTouchMove}
        onTouchEnd={handlePageTouchEnd}
        onTouchCancel={handlePageTouchEnd}
        style={{
          transform: pageDragOffset > 0 ? `translateY(${pageDragOffset}px)` : undefined,
          transition: isPageDragging ? 'none' : undefined,
        }}
      >
        <span
          aria-hidden="true"
          className="mx-auto block h-1 w-8 rounded-[4px] bg-[#ded2f1]"
        />

        <h1 className="mt-[14px] text-center text-[20px] font-normal leading-none text-[#6a37c3]">
          {t('searchFilters.title')}
        </h1>

        <div className="mt-9 flex flex-col gap-5 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:pb-6">
          <div className="flex flex-col gap-[10px]">
            <p className="text-[16px] font-normal leading-none text-[#7a43bb]">
              {t('searchFilters.entLabel')}
            </p>
            <button
              type="button"
              data-search-filter-toggle="ent"
              aria-pressed={entOnly}
              aria-label={t('searchFilters.toggleEntAria')}
              onClick={() => setEntOnlyFilterActive(!entOnly)}
              className="search-filter-control flex h-12 w-full items-center justify-between rounded-[8px] border border-[#a585db] bg-white px-4 py-2 text-left text-[16px] font-normal leading-none text-[#44237d]"
            >
              <span>{t('searchFilters.entToggleLabel')}</span>
              <span
                aria-hidden="true"
                className={`relative h-6 w-10 rounded-full transition-colors ${
                  entOnly ? 'bg-[#a585db]' : 'bg-[#d5d3d9]'
                }`}
              >
                <span
                  className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
                    entOnly ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          <SelectedFilterControl
            filterId="grade"
            label={t('searchFilters.gradeLabel')}
            options={selectOptions.grade}
            selectedIds={selections.grade}
            onOpen={() => setActiveFilter('grade')}
            onRemove={(optionId) => removeSearchFilterOption('grade', optionId)}
            t={t}
          />

          <SelectedFilterControl
            filterId="book"
            label={t('searchFilters.bookLabel')}
            options={selectOptions.book}
            selectedIds={selections.book}
            onOpen={() => setActiveFilter('book')}
            onRemove={(optionId) => removeSearchFilterOption('book', optionId)}
            t={t}
          />

          <SelectedFilterControl
            filterId="section"
            label={t('searchFilters.sectionLabel')}
            options={selectOptions.section}
            selectedIds={selections.section}
            onOpen={() => setActiveFilter('section')}
            onRemove={(optionId) => removeSearchFilterOption('section', optionId)}
            t={t}
          />
        </div>

        <div
          data-search-filter-page-actions
          className="search-filter-actions sticky bottom-0 -mx-6 mt-8 grid grid-cols-2 gap-3 border-t border-[#efeaf8] bg-white px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 max-md:mt-auto"
        >
          <button
            type="button"
            data-search-filter-page-action="reset"
            onClick={resetFiltersPage}
            className="search-filter-action-button search-filter-reset-button flex h-12 items-center justify-center rounded-[8px] border border-[#a585db] bg-white px-4 text-[16px] font-medium leading-none text-[#6a37c3]"
          >
            {t('searchFilters.reset')}
          </button>
          <button
            type="button"
            data-search-filter-page-action="search"
            onClick={closeFiltersPage}
            className="search-filter-action-button search-filter-save-button flex h-12 items-center justify-center rounded-[8px] bg-[#572d9f] px-4 text-[16px] font-medium leading-none text-[#f8f5fc]"
          >
            {t('searchFilters.search')}
          </button>
        </div>
      </section>

      {activeFilter && (
        <SearchFilterOptionsDialog
          filterId={activeFilter}
          title={getFilterTitle(activeFilter, t)}
          options={selectOptions[activeFilter]}
          selectedIds={selections[activeFilter]}
          isLoading={catalogLoading && activeFilter !== 'grade'}
          error={selectOptions[activeFilter].length === 0 ? catalogError : null}
          onToggleOption={toggleSearchFilterOption}
          onResetOptions={resetSearchFilterOptions}
          onClose={closeActiveFilterDialog}
          t={t}
        />
      )}
    </div>
  );
}

export function SelectedFilterControl({
  filterId,
  label,
  options,
  selectedIds,
  onOpen,
  onRemove,
  t,
}: {
  filterId: FilterSelectId;
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  onOpen: () => void;
  onRemove: (optionId: string) => void;
  t: TFunction;
}) {
  const selectedOptions = getSelectedFilterOptions(selectedIds, options, t);

  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[16px] font-normal leading-none text-[#7a43bb]">{label}</p>
      <div
        data-search-filter-select={filterId}
        className={`search-filter-control flex min-h-12 w-full rounded-[8px] border border-[#a585db] bg-white text-left text-[16px] font-normal leading-none ${
          selectedOptions.length > 0
            ? filterId === 'section'
              ? 'items-start gap-2 p-2'
              : 'items-center gap-2 p-2'
            : 'items-center justify-between gap-3 px-4 py-2 text-[#7650b4]'
        }`}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                data-search-filter-chip={option.id}
                className={`flex max-w-full items-center justify-center gap-1 rounded-[16px] bg-[#6a37c3] px-4 py-2 text-[14px] font-normal leading-none text-[#f8f5fc] ${
                  filterId === 'section'
                    ? 'min-h-8 w-full whitespace-normal break-words'
                    : 'h-8 shrink-0'
                }`}
              >
                <button
                  type="button"
                  aria-label={t('searchFilters.openFilterAria', { label })}
                  onClick={onOpen}
                  className={`min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    filterId === 'section'
                      ? 'flex-1 whitespace-normal break-words'
                      : 'max-w-[240px] truncate'
                  }`}
                >
                  {option.label}
                </button>
                <button
                  type="button"
                  data-search-filter-chip-remove={option.id}
                  aria-label={t('searchFilters.removeSelectionAria', { label: option.label })}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(option.id);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="-mr-1 flex size-[14px] shrink-0 items-center justify-center rounded-full text-[#f8f5fc]"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <button
            type="button"
            aria-label={t('searchFilters.openFilterAria', { label })}
            onClick={onOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0 truncate">{t('searchFilters.selectPlaceholder')}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} size={24} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}

export function SearchFilterOptionsDialog({
  filterId,
  title,
  options,
  selectedIds,
  isLoading,
  error,
  onToggleOption,
  onResetOptions,
  onClose,
  t,
}: {
  filterId: FilterSelectId;
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;
  onToggleOption: (filterId: FilterSelectId, optionId: string, optionLabel: string) => void;
  onResetOptions: (filterId: FilterSelectId) => void;
  onClose: () => void;
  t: TFunction;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const optionsListRef = useRef<HTMLDivElement | null>(null);
  const touchDragIntentRef = useRef<'sheet' | 'list' | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const activeTouchIdRef = useRef<number | null>(null);
  const touchStartedInOptionsListRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  function getDismissDragOffset() {
    const viewportHeight =
      typeof window === 'undefined' ? DRAG_CLOSE_TRANSLATE_FALLBACK : window.innerHeight;
    return Math.max(viewportHeight, DRAG_CLOSE_TRANSLATE_FALLBACK, dragOffsetRef.current);
  }

  function setSheetDragOffset(offset: number) {
    const nextOffset = Math.max(offset, 0);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }

  function finishDrag(shouldClose: boolean) {
    dragStartYRef.current = null;
    setIsDragging(false);

    if (shouldClose) {
      setSheetDragOffset(getDismissDragOffset());
      closeTimeoutRef.current = window.setTimeout(onClose, DRAG_CLOSE_ANIMATION_MS);
      return;
    }

    setSheetDragOffset(0);
  }

  function getTrackedTouch(touches: ReactTouchEvent<HTMLElement>['touches']) {
    const activeTouchId = activeTouchIdRef.current;
    if (activeTouchId === null) return null;

    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === activeTouchId) return touch;
    }

    return null;
  }

  function canOptionsListScroll(deltaY: number) {
    const optionsList = optionsListRef.current;
    if (!optionsList) return false;

    if (deltaY > 0) return optionsList.scrollTop > 0;
    if (deltaY < 0) {
      return optionsList.scrollTop + optionsList.clientHeight < optionsList.scrollHeight - 1;
    }

    return false;
  }

  function handleDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (closeTimeoutRef.current !== null) return;

    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (dragStartYRef.current === null) return;

    setSheetDragOffset(event.clientY - dragStartYRef.current);
  }

  function handleDragEnd(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    if (dragStartYRef.current === null) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldClose = dragOffsetRef.current >= DRAG_CLOSE_THRESHOLD;
    finishDrag(shouldClose);
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (closeTimeoutRef.current !== null) return;

    const touch = event.changedTouches.item(0);
    if (!touch) return;

    activeTouchIdRef.current = touch.identifier;
    dragStartYRef.current = touch.clientY;
    dragOffsetRef.current = 0;
    touchDragIntentRef.current = null;
    touchStartedInOptionsListRef.current = Boolean(
      optionsListRef.current?.contains(event.target as Node),
    );
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const touch = getTrackedTouch(event.touches);
    if (!touch || dragStartYRef.current === null) return;

    const nextOffset = touch.clientY - dragStartYRef.current;

    if (touchDragIntentRef.current === null) {
      if (Math.abs(nextOffset) < TOUCH_DRAG_INTENT_THRESHOLD) return;

      if (touchStartedInOptionsListRef.current && canOptionsListScroll(nextOffset)) {
        touchDragIntentRef.current = 'list';
        return;
      }

      touchDragIntentRef.current = nextOffset > 0 ? 'sheet' : 'list';
    }

    if (touchDragIntentRef.current !== 'sheet') return;

    event.preventDefault();
    setIsDragging(true);
    setSheetDragOffset(nextOffset);
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const trackedTouch = getTrackedTouch(event.changedTouches);
    const wasSheetDrag = touchDragIntentRef.current === 'sheet';

    activeTouchIdRef.current = null;
    touchDragIntentRef.current = null;
    touchStartedInOptionsListRef.current = false;

    if (!trackedTouch && !wasSheetDrag) return;

    if (wasSheetDrag) {
      if (dragOffsetRef.current > 0) event.preventDefault();
      finishDrag(dragOffsetRef.current >= DRAG_CLOSE_THRESHOLD);
      return;
    }

    dragStartYRef.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#efebf6] md:bg-[#12091f]/30"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        aria-label={t('search.sheetClose')}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        data-search-filter-dialog
        aria-labelledby="search-filter-dialog-title"
        className="search-filter-sheet absolute inset-x-0 bottom-0 top-[calc(62px+env(safe-area-inset-top))] flex min-h-0 flex-col overflow-hidden rounded-t-[32px] bg-white px-6 pt-2 animate-[mobile-search-sheet-in_180ms_ease-out] motion-reduce:animate-none md:left-1/2 md:top-16 md:max-h-[min(720px,calc(100dvh-96px))] md:max-w-[430px] md:-translate-x-1/2 md:rounded-b-[32px]"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        <button
          type="button"
          aria-label={t('searchFilters.dragCloseAria')}
          className="mx-auto flex h-6 w-16 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="block h-1 w-8 rounded-[4px] bg-[#ded2f1]"
          />
        </button>

        <h2
          id="search-filter-dialog-title"
          className="mt-4 text-center text-[20px] font-normal leading-none text-[#6a37c3]"
        >
          {title}
        </h2>

        <div
          data-search-filter-options-list
          ref={optionsListRef}
          className="mt-8 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isLoading && options.length === 0 && (
            <p className="py-6 text-center text-[16px] leading-none text-[#514b5c]" role="status">
              {t('common.loading')}
            </p>
          )}

          {!isLoading && options.length === 0 && (
            <p className="py-6 text-center text-[16px] leading-none text-[#514b5c]" role="status">
              {error ?? t('searchFilters.emptyOptions')}
            </p>
          )}

          {options.map((option) => {
            const selected = selectedIds.includes(option.id);

            return (
              <label
                key={option.id}
                data-search-filter-option={option.id}
                className={`search-filter-option flex w-full shrink-0 cursor-pointer select-none justify-between gap-4 ${
                  filterId === 'section'
                    ? 'min-h-12 items-center py-3'
                    : 'h-12 items-center'
                } rounded-[8px] border border-[#a585db] border-solid bg-white px-4 text-[16px] font-normal leading-none text-[#44237d] ${selected ? 'search-filter-option-active border-[#6a37c3]' : ''}`}
              >
                <span
                  className={`min-w-0 ${
                    filterId === 'section'
                      ? 'flex-1 whitespace-normal break-words'
                      : 'truncate'
                  }`}
                >
                  {resolveOptionLabel(option, t)}
                </span>
                <span className="relative flex size-6 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(option.id)}
                    onChange={() =>
                      onToggleOption(filterId, option.id, resolveOptionLabel(option, t))
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`search-filter-checkbox-visual flex size-6 items-center justify-center rounded-[4px] border-[1.5px] border-solid transition-colors [&_svg]:size-4 ${
                      selected ? 'search-filter-checkbox-visual-active border-[#6a37c3] bg-[#6a37c3] text-white' : 'border-[#a585db] bg-white'
                    }`}
                  >
                    {selected && <HugeiconsIcon icon={CheckIcon} />}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div
          data-search-filter-actions
          className="search-filter-actions sticky bottom-0 -mx-6 mt-auto grid grid-cols-2 gap-3 border-t border-[#efeaf8] bg-white px-6 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4"
        >
          <button
            type="button"
            data-search-filter-action="reset"
            onClick={() => onResetOptions(filterId)}
            className="search-filter-action-button search-filter-reset-button flex h-12 items-center justify-center rounded-[8px] border border-[#a585db] bg-white px-4 text-[16px] font-medium leading-none text-[#6a37c3]"
          >
            {t('searchFilters.reset')}
          </button>
          <button
            type="button"
            data-search-filter-action="save"
            onClick={onClose}
            className="search-filter-action-button search-filter-save-button flex h-12 items-center justify-center rounded-[8px] bg-[#572d9f] px-4 text-[16px] font-medium leading-none text-[#f8f5fc]"
          >
            {t('searchFilters.save')}
          </button>
        </div>
      </section>
    </div>
  );
}
