import { describe, expect, it } from 'vitest';
import { createBookCatalogSnapshot } from './publisherBookResolver';
import { buildSearchRequestDescriptor } from './searchRequestKey';

const snapshotResult = createBookCatalogSnapshot([
  { public_id: 'book:signed:opaque-b', publisher: 'Атамұра', grade: 10 },
  { public_id: 'book:signed:opaque-a', publisher: 'Атамура', grade: 7 },
]);
if (!snapshotResult.ok) throw new Error('fixture must be valid');

describe('canonical term search request descriptor', () => {
  it('trims query, strictly sorts grades, resolves publishers, and keeps chapter refs only', () => {
    const descriptor = buildSearchRequestDescriptor({
      query: '  Python  ',
      selections: {
        grade: ['11', '7', '10', '7'],
        book: ['atamura'],
        section: ['chapter:signed:z', 'chapter:signed:a'],
      },
      entOnly: true,
      bookCatalog: snapshotResult.snapshot,
    });

    expect(descriptor).toMatchObject({
      ok: true,
      useFeaturedTerms: false,
      request: {
        query: 'Python',
        grades: [7, 10, 11],
        bookRefs: ['book:signed:opaque-a', 'book:signed:opaque-b'],
        chapterRefs: ['chapter:signed:a', 'chapter:signed:z'],
        entOnly: true,
      },
    });
    if (!descriptor.ok) return;
    expect(descriptor.key).toContain(snapshotResult.snapshot.version);
    expect(descriptor.key).not.toContain('atamura');
  });

  it('uses featured terms only for an empty query with no committed filters', () => {
    const descriptor = buildSearchRequestDescriptor({
      query: '   ',
      selections: { grade: [], book: [], section: [] },
      entOnly: false,
      bookCatalog: null,
    });
    expect(descriptor).toMatchObject({ ok: true, useFeaturedTerms: true });
  });

  it('uses authenticated server search for an empty query with any filter', () => {
    const descriptor = buildSearchRequestDescriptor({
      query: '',
      selections: { grade: ['10'], book: [], section: [] },
      entOnly: false,
      bookCatalog: null,
    });
    expect(descriptor).toMatchObject({ ok: true, useFeaturedTerms: false });
  });

  it('blocks malformed grades and publisher selection without a usable catalog', () => {
    expect(
      buildSearchRequestDescriptor({
        query: '',
        selections: { grade: ['10th'], book: [], section: [] },
        entOnly: false,
        bookCatalog: null,
      }),
    ).toMatchObject({ ok: false, code: 'invalid-grade' });
    expect(
      buildSearchRequestDescriptor({
        query: 'python',
        selections: { grade: [], book: ['atamura'], section: [] },
        entOnly: false,
        bookCatalog: null,
      }),
    ).toMatchObject({ ok: false, code: 'catalog-unavailable' });
  });
});
