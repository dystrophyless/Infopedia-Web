import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { TFunction } from 'i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CheckIcon,
} from '@hugeicons/core-free-icons';
import { Dialog } from '../../../ui';
import type { BookCatalogSnapshot } from '../model/publisherBookResolver';
import {
  createSearchFilterDraft,
  removeSearchFilterDraftOption,
  resetSearchFilterDraft,
  toggleSearchFilterDraftOption,
  type SearchFilterDraft,
  type SearchFilterSnapshot,
} from '../model/searchFilterDraft';
import { buildSearchRequestDescriptor } from '../model/searchRequestKey';
import type { FilterOption, FilterOptionCatalog, FilterSelectId } from '../model/filterOptions';
import { getSelectedFilterOptions, resolveOptionLabel } from '../model/filterOptions';

export interface DesktopSearchFiltersDialogProps {
  open: boolean;
  query: string;
  committed: SearchFilterSnapshot;
  options: FilterOptionCatalog;
  bookCatalogSnapshot: BookCatalogSnapshot | null;
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
  onApply: (snapshot: SearchFilterSnapshot) => void;
  onDismiss: () => void;
  t: TFunction;
}

export function DesktopSearchFiltersDialog({
  open,
  query,
  committed,
  options,
  bookCatalogSnapshot,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  onApply,
  onDismiss,
  t,
}: DesktopSearchFiltersDialogProps) {
  const [draft, setDraft] = useState<SearchFilterDraft>(() => createSearchFilterDraft(committed));
  const [activeMenu, setActiveMenu] = useState<FilterSelectId | null>(null);
  const [keyboardFocusTarget, setKeyboardFocusTarget] = useState<'first' | 'last' | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const descriptor = useMemo(
    () =>
      buildSearchRequestDescriptor({
        query,
        selections: draft.selections,
        entOnly: draft.entOnly,
        bookCatalog: bookCatalogSnapshot,
      }),
    [bookCatalogSnapshot, draft.entOnly, draft.selections, query],
  );
  const applyBlocked = !descriptor.ok;

  function toggleOption(filterId: FilterSelectId, option: FilterOption) {
    setDraft((current) =>
      toggleSearchFilterDraftOption(current, filterId, option.id, resolveOptionLabel(option, t)),
    );
  }

  function applyDraft() {
    if (applyBlocked) return;
    onApply(draft);
  }

  function openMenuFromKeyboard(filterId: FilterSelectId, target: 'first' | 'last') {
    setKeyboardFocusTarget(target);
    setActiveMenu(filterId);
  }

  useEffect(() => {
    if (!activeMenu || !keyboardFocusTarget) return undefined;
    const frame = requestAnimationFrame(() => {
      const menu = dialogContentRef.current?.querySelector<HTMLElement>(
        `#desktop-search-filter-menu-${activeMenu}`,
      );
      const menuOptions = menu
        ? [...menu.querySelectorAll<HTMLButtonElement>('[role="option"]')]
        : [];
      const option = keyboardFocusTarget === 'last' ? menuOptions.at(-1) : menuOptions[0];
      option?.focus();
      option?.scrollIntoView({ block: 'nearest' });
      setKeyboardFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeMenu, keyboardFocusTarget]);

  return (
    <Dialog
      open={open}
      onDismiss={onDismiss}
      id="search-filter-page-sheet"
      titleId="desktop-search-filters-title"
      initialFocusRef={closeButtonRef}
      overlayClassName="!items-start !justify-end !bg-[rgba(22,21,25,0.25)] p-6"
      className="relative h-[600px] !w-[480px] !max-w-none !rounded-[16px] bg-white !p-8"
    >
      <div ref={dialogContentRef} className="flex h-full flex-col" data-desktop-search-filters-dialog>
        <div className="flex items-center justify-between">
          <h2
            id="desktop-search-filters-title"
            className="text-[24px] font-medium leading-none text-[#6a37c3]"
          >
            {t('searchFilters.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onDismiss}
            aria-label={t('search.sheetClose')}
            className="flex size-6 items-center justify-center text-[#a585db] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.6} />
          </button>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <DesktopEntField
            checked={draft.entOnly}
            onToggle={() => setDraft((current) => ({ ...current, entOnly: !current.entOnly }))}
            t={t}
          />
          <DesktopSelectField
            filterId="book"
            label={t('searchFilters.bookLabel')}
            options={options.book}
            selectedIds={draft.selections.book}
            active={activeMenu === 'book'}
            onOpen={() => setActiveMenu((current) => (current === 'book' ? null : 'book'))}
            onRemove={(optionId) =>
              setDraft((current) => removeSearchFilterDraftOption(current, 'book', optionId))
            }
            onKeyboardOpen={(target) => openMenuFromKeyboard('book', target)}
            t={t}
          />
          <DesktopSelectField
            filterId="grade"
            label={t('searchFilters.gradeLabel')}
            options={options.grade}
            selectedIds={draft.selections.grade}
            active={activeMenu === 'grade'}
            onOpen={() => setActiveMenu((current) => (current === 'grade' ? null : 'grade'))}
            onRemove={(optionId) =>
              setDraft((current) => removeSearchFilterDraftOption(current, 'grade', optionId))
            }
            onKeyboardOpen={(target) => openMenuFromKeyboard('grade', target)}
            t={t}
          />
          <DesktopSelectField
            filterId="section"
            label={t('searchFilters.sectionLabel')}
            options={options.section}
            selectedIds={draft.selections.section}
            active={activeMenu === 'section'}
            onOpen={() => setActiveMenu((current) => (current === 'section' ? null : 'section'))}
            onRemove={(optionId) =>
              setDraft((current) => removeSearchFilterDraftOption(current, 'section', optionId))
            }
            onKeyboardOpen={(target) => openMenuFromKeyboard('section', target)}
            t={t}
          />
        </div>

        {catalogError && !activeMenu && (
          <div
            role="alert"
            className="absolute bottom-[88px] left-8 right-8 flex items-center justify-between gap-3 rounded-[8px] bg-[#f8f5fc] px-4 py-3 text-[14px] leading-5 text-[#44237d]"
          >
            <span>{catalogError}</span>
            <button
              type="button"
              onClick={onRetryCatalog}
              className="shrink-0 rounded-[8px] bg-[#6a37c3] px-3 py-2 font-medium text-white"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            data-desktop-search-filter-reset
            onClick={() => setDraft((current) => resetSearchFilterDraft(current))}
            className="flex h-12 w-[204px] items-center justify-center rounded-[8px] bg-[#ded2f1] px-6 text-[18px] font-medium leading-normal text-[#865bcf]"
          >
            {t('searchFilters.reset')}
          </button>
          <button
            type="button"
            data-desktop-search-filter-apply
            onClick={applyDraft}
            disabled={applyBlocked}
            aria-describedby={applyBlocked ? 'desktop-search-filter-catalog-error' : undefined}
            className="flex h-12 w-[204px] items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 text-[18px] font-medium leading-normal text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('searchFilters.search')}
          </button>
        </div>

        {applyBlocked && (
          <span id="desktop-search-filter-catalog-error" className="sr-only" role="status">
            {catalogLoading ? t('common.loading') : catalogError ?? t('searchFilters.loadOptionsFailed')}
          </span>
        )}

        {activeMenu && (
          <DesktopFilterMenu
            filterId={activeMenu}
            options={options[activeMenu]}
            selectedIds={draft.selections[activeMenu]}
            loading={catalogLoading && activeMenu !== 'grade'}
            error={catalogError}
            onToggle={(option) => toggleOption(activeMenu, option)}
            onRetry={onRetryCatalog}
            label={
              activeMenu === 'book'
                ? t('searchFilters.bookLabel')
                : activeMenu === 'grade'
                  ? t('searchFilters.gradeLabel')
                  : t('searchFilters.sectionLabel')
            }
            t={t}
          />
        )}
      </div>
    </Dialog>
  );
}

function DesktopEntField({ checked, onToggle, t }: { checked: boolean; onToggle: () => void; t: TFunction }) {
  return (
    <div className="flex w-[416px] flex-col gap-2">
      <span className="text-[18px] font-normal leading-[18px] text-[#865bcf]">
        {t('searchFilters.entLabel')}
      </span>
      <button
        type="button"
        data-desktop-search-filter-field="ent"
        aria-pressed={checked}
        onClick={onToggle}
        className="flex h-12 w-[416px] items-center justify-between rounded-[8px] border border-[#a585db] bg-white px-4 py-2 text-left text-[16px] font-normal leading-6 text-[#44237d]"
      >
        <span>{t('searchFilters.entToggleLabel')}</span>
        <span
          aria-hidden="true"
          className="relative h-6 w-10 rounded-full bg-[#a585db]"
        >
          <span
            className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </span>
      </button>
    </div>
  );
}

function DesktopSelectField({
  filterId,
  label,
  options,
  selectedIds,
  active,
  onOpen,
  onRemove,
  onKeyboardOpen,
  t,
}: {
  filterId: FilterSelectId;
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  active: boolean;
  onOpen: () => void;
  onRemove: (optionId: string) => void;
  onKeyboardOpen: (target: 'first' | 'last') => void;
  t: TFunction;
}) {
  const selectedOptions = getSelectedFilterOptions(selectedIds, options, t);
  const menuId = `desktop-search-filter-menu-${filterId}`;
  const labelId = `desktop-search-filter-label-${filterId}`;
  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onKeyboardOpen('first');
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    onKeyboardOpen(event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first');
  }
  return (
    <div className="flex w-[416px] flex-col gap-2">
      <span id={labelId} className="text-[18px] font-normal leading-[18px] text-[#865bcf]">{label}</span>
      <div
        data-desktop-search-filter-field={filterId}
        className={`flex h-12 w-[416px] items-center justify-between gap-2 overflow-hidden rounded-[8px] bg-white px-4 py-2 text-[16px] font-normal leading-6 ${
          active ? 'border-2 border-[#6a37c3]' : 'border border-[#a585db]'
        }`}
      >
        {selectedOptions.length === 0 ? (
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="listbox"
            aria-expanded={active}
            aria-controls={menuId}
            aria-labelledby={labelId}
            onKeyDown={handleTriggerKeyDown}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[#a585db]"
          >
            <span className="truncate">{t('searchFilters.selectPlaceholder')}</span>
          </button>
        ) : (
          <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                className="flex h-8 max-w-[132px] shrink-0 items-center gap-1 rounded-[16px] bg-[#6a37c3] px-3 text-[14px] leading-none text-[#f8f5fc]"
              >
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  aria-label={t('searchFilters.removeSelectionAria', { label: option.label })}
                  onClick={() => onRemove(option.id)}
                  className="flex size-[14px] shrink-0 items-center justify-center"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                </button>
              </span>
            ))}
          </span>
        )}
        <button
          type="button"
          onClick={onOpen}
          onKeyDown={handleTriggerKeyDown}
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={active}
          aria-controls={menuId}
          aria-labelledby={labelId}
          className="shrink-0 text-[#a585db]"
        >
          <HugeiconsIcon
            icon={filterId === 'book' && active ? ArrowUp01Icon : ArrowDown01Icon}
            size={24}
            strokeWidth={1.6}
          />
        </button>
      </div>
    </div>
  );
}

function DesktopFilterMenu({
  filterId,
  options,
  selectedIds,
  loading,
  error,
  onToggle,
  onRetry,
  label,
  t,
}: {
  filterId: FilterSelectId;
  options: FilterOption[];
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  onToggle: (option: FilterOption) => void;
  onRetry: () => void;
  label: string;
  t: TFunction;
}) {
  const placement =
    filterId === 'book'
      ? 'top-[276px] h-[176px]'
      : filterId === 'grade'
        ? 'top-[72px] h-[238px]'
        : 'top-[72px] h-[336px]';
  return (
    <div
      id={`desktop-search-filter-menu-${filterId}`}
      data-desktop-filter-menu={filterId}
      role={error && options.length === 0 ? 'region' : 'listbox'}
      aria-label={label}
      aria-multiselectable={error && options.length === 0 ? undefined : 'true'}
      className={`absolute left-8 z-10 flex w-[416px] flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[16px] bg-[#f8f5fc] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${placement}`}
    >
      {loading && options.length === 0 && (
        <p className="p-4 text-[16px] text-[#44237d]" role="status">{t('common.loading')}</p>
      )}
      {!loading && options.length === 0 && (
        error ? (
          <div className="flex flex-col items-start gap-3 p-4 text-[16px] leading-5 text-[#44237d]" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="h-10 rounded-[8px] bg-[#6a37c3] px-4 font-medium leading-4 text-white"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <p className="p-4 text-[16px] text-[#44237d]" role="status">
            {t('searchFilters.emptyOptions')}
          </p>
        )
      )}
      {error && options.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-[8px] bg-[#f8f5fc] p-3 text-[14px] leading-5 text-[#44237d]" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="h-10 shrink-0 rounded-[8px] bg-[#6a37c3] px-4 font-medium leading-4 text-white"
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      {options.map((option) => {
        const selected = selectedIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onToggle(option)}
            onKeyDown={(event) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              const menu = event.currentTarget.closest<HTMLElement>('[role="listbox"]');
              const menuOptions = menu
                ? [...menu.querySelectorAll<HTMLButtonElement>('[role="option"]')]
                : [];
              const currentIndex = menuOptions.indexOf(event.currentTarget);
              const targetIndex = event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? menuOptions.length - 1
                  : event.key === 'ArrowDown'
                    ? Math.min(currentIndex + 1, menuOptions.length - 1)
                    : Math.max(currentIndex - 1, 0);
              const target = menuOptions[targetIndex];
              if (!target) return;
              event.preventDefault();
              target.focus();
              target.scrollIntoView({ block: 'nearest' });
            }}
            className="flex w-full shrink-0 items-center gap-4 rounded-[8px] border border-[#a585db] bg-[#f8f5fc] px-4 py-[11px] text-left text-[16px] font-normal leading-4 text-[#44237d]"
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words">
              {resolveOptionLabel(option, t)}
            </span>
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${
                selected ? 'border-[#6a37c3] bg-[#6a37c3] text-white' : 'border-[#a585db]'
              }`}
            >
              {selected && <HugeiconsIcon icon={CheckIcon} size={16} strokeWidth={2} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
