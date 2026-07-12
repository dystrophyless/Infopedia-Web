import type { Definition, Term } from '../../../types';
import type { SearchFilterSelections } from './searchStore';

export const BOOK_FILTER_ALIASES: Readonly<Record<string, readonly string[]>> = {
  atamura: ['Атамұра', 'Атамура', 'Atamura'],
  armanPv: ['Арман ПВ', 'Арман-ПВ', 'Arman PV', 'Arman-PV', 'ArmanPV'],
  mektep: ['Мектеп', 'Mektep'],
  almatykitap: ['Алматыкітап', 'Алматыкитап', 'Almatykitap', 'Almaty kitap'],
};

export function normalizeSearchFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s._-]+/g, '');
}

export function getBookFilterCandidates(selectedId: string): readonly string[] {
  return [selectedId, ...(BOOK_FILTER_ALIASES[selectedId] ?? [])];
}

export function selectedFilterMatchesValue(
  value: string | number | undefined | null,
  selectedIds: string[],
  getCandidates: (selectedId: string) => readonly string[] = (selectedId) => [selectedId],
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

export function definitionMatchesSearchFilters(
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
  const matchesGrade = selectedFilterMatchesValue(
    book?.grade,
    searchFilterSelections.grade,
  );
  const matchesSection =
    searchFilterSelections.section.length === 0 ||
    [chapter?.public_id, chapter?.name].some((value) =>
      selectedFilterMatchesValue(value, searchFilterSelections.section),
    );

  return matchesBook && matchesGrade && matchesSection;
}

export function hasActiveSearchFilters(
  searchFilterSelections: SearchFilterSelections,
): boolean {
  return Object.values(searchFilterSelections).some((selectedIds) => selectedIds.length > 0);
}

export function termMatchesSearchFilters(
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

export function filterTermsBySearchFilters(
  terms: Term[],
  searchFilterSelections: SearchFilterSelections,
): Term[] {
  if (!hasActiveSearchFilters(searchFilterSelections)) return terms;
  return terms.filter((term) => termMatchesSearchFilters(term, searchFilterSelections));
}
