import type { TFunction } from 'i18next';
import type { BookCatalogItem, ChapterCatalogItem } from '../../../types';
import type { SearchFilterSelectId } from './searchStore';

export type FilterSelectId = SearchFilterSelectId;

export interface FilterOption {
  id: string;
  label?: string;
  labelKey?: string;
}

export interface SelectedFilterOption {
  id: string;
  label: string;
}

export type FilterOptionCatalog = Record<FilterSelectId, FilterOption[]>;

export const SEARCH_FILTER_GRADES: FilterOption[] = [
  { id: '7', labelKey: 'searchFilters.grade7' },
  { id: '8', labelKey: 'searchFilters.grade8' },
  { id: '9', labelKey: 'searchFilters.grade9' },
  { id: '10', labelKey: 'searchFilters.grade10' },
  { id: '11', labelKey: 'searchFilters.grade11' },
];

export const SEARCH_FILTER_BOOKS: FilterOption[] = [
  { id: 'atamura', labelKey: 'searchFilters.books.atamura' },
  { id: 'almatykitap', labelKey: 'searchFilters.books.almatykitap' },
  { id: 'armanPv', labelKey: 'searchFilters.books.armanPv' },
];

export const SEARCH_FILTER_CHAPTERS: FilterOption[] = [];

export function isFilterSelectId(value: string | null): value is FilterSelectId {
  return value === 'grade' || value === 'book' || value === 'section';
}

export function resolveOptionLabel(option: FilterOption, t: TFunction): string {
  if (option.label) return option.label;
  if (option.labelKey) return t(option.labelKey);
  return option.id;
}

function normalizePublisher(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s._-]+/g, '');
}

const PUBLISHER_ALIASES: Readonly<Record<string, string>> = {
  атамұра: 'atamura',
  атамура: 'atamura',
  atamura: 'atamura',
  алматыкітап: 'almatykitap',
  алматыкитап: 'almatykitap',
  almatykitap: 'almatykitap',
  арманпв: 'armanPv',
  armanpv: 'armanPv',
};

export function mapBookOptions(books: BookCatalogItem[], t: TFunction): FilterOption[] {
  void t;
  const available = new Set<string>();

  books.forEach((book) => {
    const canonicalId = PUBLISHER_ALIASES[normalizePublisher(book.publisher)];
    if (canonicalId) available.add(canonicalId);
  });

  return SEARCH_FILTER_BOOKS.filter(({ id }) => available.has(id));
}

export function mapChapterOptions(chapters: ChapterCatalogItem[]): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];

  chapters.forEach((chapter) => {
    const label = (chapter.title ?? chapter.name ?? '').trim();
    if (!chapter.public_id || !label || seen.has(chapter.public_id)) return;

    seen.add(chapter.public_id);
    options.push({ id: chapter.public_id, label });
  });

  return options;
}

export function createFilterOptionCatalog(
  bookOptions: FilterOption[],
  chapterOptions: FilterOption[],
): FilterOptionCatalog {
  return {
    grade: SEARCH_FILTER_GRADES,
    book: bookOptions.length > 0 ? bookOptions : SEARCH_FILTER_BOOKS,
    section: chapterOptions,
  };
}

export function getFilterTitle(filterId: FilterSelectId, t: TFunction): string {
  if (filterId === 'grade') return t('searchFilters.gradeLabel');
  if (filterId === 'book') return t('searchFilters.bookLabel');
  return t('searchFilters.sectionLabel');
}

export function getSelectedFilterOptions(
  selectedIds: string[],
  options: FilterOption[],
  t: TFunction,
): SelectedFilterOption[] {
  return selectedIds.map((selectedId) => {
    const selectedOption = options.find((option) => option.id === selectedId);
    return {
      id: selectedId,
      label: selectedOption ? resolveOptionLabel(selectedOption, t) : selectedId,
    };
  });
}
