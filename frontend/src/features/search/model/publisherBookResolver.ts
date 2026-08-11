import type { BookCatalogItem } from '../../../types';

export interface BookCatalogSnapshot {
  books: readonly BookCatalogItem[];
  byPublisher: Readonly<Record<string, readonly string[]>>;
  version: string;
}

export type BookCatalogSnapshotResult =
  | { ok: true; snapshot: BookCatalogSnapshot }
  | { ok: false; code: 'invalid-catalog' };

export type PublisherBookResolution =
  | { ok: true; bookRefs: string[]; catalogVersion: string }
  | { ok: false; code: 'missing-publisher'; publishers: string[] };

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

export function canonicalPublisherId(value: string): string | null {
  return PUBLISHER_ALIASES[normalizePublisher(value)] ?? null;
}

function catalogHash(material: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < material.length; index += 1) {
    hash ^= material.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `books-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createBookCatalogSnapshot(
  books: readonly BookCatalogItem[],
): BookCatalogSnapshotResult {
  const rows: BookCatalogItem[] = [];
  const byPublisher = new Map<string, Set<string>>();

  for (const book of books) {
    const publicId = book.public_id?.trim();
    const publisher = book.publisher?.trim();
    if (
      !publicId ||
      !publisher ||
      !Number.isInteger(book.grade) ||
      book.grade < 7 ||
      book.grade > 11
    ) {
      return { ok: false, code: 'invalid-catalog' };
    }

    rows.push({ public_id: publicId, publisher, grade: book.grade });
    const canonicalPublisher = canonicalPublisherId(publisher);
    if (!canonicalPublisher) continue;
    const refs = byPublisher.get(canonicalPublisher) ?? new Set<string>();
    refs.add(publicId);
    byPublisher.set(canonicalPublisher, refs);
  }

  const sortedRows = [...rows].sort((left, right) =>
    `${left.public_id}|${left.publisher}|${left.grade}`.localeCompare(
      `${right.public_id}|${right.publisher}|${right.grade}`,
    ),
  );
  const publisherRecord = Object.fromEntries(
    [...byPublisher.entries()].map(([publisher, refs]) => [publisher, [...refs].sort()]),
  );
  const versionMaterial = sortedRows
    .map(({ public_id: publicId, publisher, grade }) => `${publicId}|${publisher}|${grade}`)
    .join(';');

  return {
    ok: true,
    snapshot: {
      books: sortedRows,
      byPublisher: publisherRecord,
      version: catalogHash(versionMaterial),
    },
  };
}

export function updateBookCatalogSnapshot(
  previous: BookCatalogSnapshot | null,
  books: readonly BookCatalogItem[],
): { snapshot: BookCatalogSnapshot | null; error: 'invalid-catalog' | null; stale: boolean } {
  const next = createBookCatalogSnapshot(books);
  if (next.ok) return { snapshot: next.snapshot, error: null, stale: false };
  return { snapshot: previous, error: next.code, stale: previous !== null };
}

export function resolvePublisherBookRefs(
  selectedPublishers: readonly string[],
  snapshot: BookCatalogSnapshot,
): PublisherBookResolution {
  const normalizedPublishers = [...new Set(selectedPublishers.map((value) => value.trim()))]
    .filter(Boolean)
    .sort();
  const missingPublishers = normalizedPublishers.filter(
    (publisher) => !snapshot.byPublisher[publisher]?.length,
  );
  if (missingPublishers.length > 0) {
    return { ok: false, code: 'missing-publisher', publishers: missingPublishers };
  }

  const bookRefs = [
    ...new Set(normalizedPublishers.flatMap((publisher) => snapshot.byPublisher[publisher] ?? [])),
  ].sort();
  return { ok: true, bookRefs, catalogVersion: snapshot.version };
}
