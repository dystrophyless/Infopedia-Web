import type { TFunction } from 'i18next';
import {
  FilterHorizontalIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import type {
  SearchFilterSelectId,
  SearchFilterSelectionLabels,
  SearchFilterSelections,
} from './searchStore';
import { normalizeSearchFilterActivationOrder, type SearchFilterActivationOrder, type SearchFilterCategoryId } from './searchFilterActivationOrder';

export type SearchResultFilterChipId =
  | 'filter'
  | 'specification'
  | 'book'
  | 'grade'
  | 'topic';

export interface SearchResultFilterChip {
  id: SearchResultFilterChipId;
  label: string;
  icon: typeof FilterHorizontalIcon;
  active: boolean;
  selectedCount?: number;
  toggle?: boolean;
  selectId?: SearchFilterSelectId;
  onToggle?: () => void;
}

export interface SelectedResultFilterLabel {
  label: string;
  selectedCount?: number;
}

export function getResultFilterCategoryLabel(
  filterId: SearchFilterSelectId,
  t: TFunction,
): string {
  if (filterId === 'book') return t('search.resultFilterBook');
  if (filterId === 'grade') return t('search.resultFilterGrade');
  return t('search.resultFilterTopic');
}

export function getFallbackResultFilterOptionLabel(
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

  return selectedId;
}

export function getSelectedResultFilterLabel(
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

export function getSearchResultFilterChips({
  entOnlyFilterActive,
  searchFilterSelections,
  searchFilterSelectionLabels,
  searchFilterActivationOrder,
  onEntOnlyFilterToggle,
  t,
}: {
  entOnlyFilterActive: boolean;
  searchFilterSelections: SearchFilterSelections;
  searchFilterSelectionLabels: SearchFilterSelectionLabels;
  searchFilterActivationOrder?: readonly SearchFilterActivationOrder[number][];
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
      selectId: 'book',
    },
    {
      id: 'grade',
      label: gradeLabel?.label ?? t('search.resultFilterGrade'),
      icon: PlusSignIcon,
      active: Boolean(gradeLabel),
      selectedCount: gradeLabel?.selectedCount,
      selectId: 'grade',
    },
    {
      id: 'topic',
      label: sectionLabel?.label ?? t('search.resultFilterTopic'),
      icon: PlusSignIcon,
      active: Boolean(sectionLabel),
      selectedCount: sectionLabel?.selectedCount,
      selectId: 'section',
    },
  ];
  const activeFilterCount = filterChips.filter((filter) => filter.active).length;
  const filterCountChip: SearchResultFilterChip = {
    id: 'filter',
    label: t('search.filterAria'),
    icon: FilterHorizontalIcon,
    active: activeFilterCount > 0,
    selectedCount: activeFilterCount > 0 ? activeFilterCount : undefined,
  };
  const chipIdByCategory: Record<SearchFilterCategoryId, SearchResultFilterChipId> = {
    ent: 'specification',
    book: 'book',
    grade: 'grade',
    section: 'topic',
  };
  const normalizedOrder = normalizeSearchFilterActivationOrder(searchFilterActivationOrder, {
    entOnly: entOnlyFilterActive,
    selections: searchFilterSelections,
  });
  const usedFilters = normalizedOrder.map((category) =>
    filterChips.find((filter) => filter.id === chipIdByCategory[category])!,
  );
  const unusedFilters = filterChips.filter((filter) => !filter.active);

  return [filterCountChip, ...usedFilters, ...unusedFilters];
}
