import type { SearchFilterSelections } from './searchStore';
import {
  resolvePublisherBookRefs,
  type BookCatalogSnapshot,
} from './publisherBookResolver';

export interface CanonicalTermSearchRequest {
  query: string;
  grades: number[];
  bookRefs: string[];
  chapterRefs: string[];
  entOnly: boolean;
}

export type SearchRequestDescriptor =
  | {
      ok: true;
      key: string;
      request: CanonicalTermSearchRequest;
      useFeaturedTerms: boolean;
    }
  | {
      ok: false;
      code: 'invalid-grade' | 'catalog-unavailable' | 'missing-publisher';
    };

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function buildSearchRequestDescriptor({
  query,
  selections,
  entOnly,
  bookCatalog,
}: {
  query: string;
  selections: SearchFilterSelections;
  entOnly: boolean;
  bookCatalog: BookCatalogSnapshot | null;
}): SearchRequestDescriptor {
  const gradeValues = uniqueSorted(selections.grade);
  const grades = gradeValues.map(Number);
  if (
    grades.some(
      (grade, index) =>
        !Number.isInteger(grade) || grade < 7 || grade > 11 || String(grade) !== gradeValues[index],
    )
  ) {
    return { ok: false, code: 'invalid-grade' };
  }
  grades.sort((left, right) => left - right);

  const selectedPublishers = uniqueSorted(selections.book);
  if (selectedPublishers.length > 0 && !bookCatalog) {
    return { ok: false, code: 'catalog-unavailable' };
  }
  const publisherResolution =
    selectedPublishers.length > 0 && bookCatalog
      ? resolvePublisherBookRefs(selectedPublishers, bookCatalog)
      : { ok: true as const, bookRefs: [], catalogVersion: undefined };
  if (!publisherResolution.ok) return { ok: false, code: publisherResolution.code };

  const normalizedQuery = query.trim();
  const chapterRefs = uniqueSorted(selections.section);
  const request: CanonicalTermSearchRequest = {
    query: normalizedQuery,
    grades,
    bookRefs: publisherResolution.bookRefs,
    chapterRefs,
    entOnly,
  };
  const useFeaturedTerms =
    !normalizedQuery &&
    grades.length === 0 &&
    publisherResolution.bookRefs.length === 0 &&
    chapterRefs.length === 0 &&
    !entOnly;
  const key = JSON.stringify({
    query: normalizedQuery,
    grades,
    books: publisherResolution.bookRefs,
    chapters: chapterRefs,
    entOnly,
    catalogVersion:
      selectedPublishers.length > 0 ? publisherResolution.catalogVersion : undefined,
  });
  return { ok: true, key, request, useFeaturedTerms };
}
