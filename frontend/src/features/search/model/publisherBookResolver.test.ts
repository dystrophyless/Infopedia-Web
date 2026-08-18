import { describe, expect, it } from 'vitest';
import {
  createBookCatalogSnapshot,
  resolvePublisherBookRefs,
  updateBookCatalogSnapshot,
} from './publisherBookResolver';

const books = [
  { public_id: 'book:signed:atamura:10', publisher: 'Атамұра', grade: 10 },
  { public_id: 'book:signed:arman:11', publisher: 'Арман-ПВ', grade: 11 },
  { public_id: 'book:signed:atamura:7', publisher: 'Атамура', grade: 7 },
  { public_id: 'book:signed:almaty:9', publisher: 'Алматыкітап', grade: 9 },
];

describe('publisher book resolver', () => {
  it('expands publisher ids to every authoritative signed book ref in stable order', () => {
    const snapshot = createBookCatalogSnapshot(books);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;

    expect(resolvePublisherBookRefs(['atamura', 'armanPv'], snapshot.snapshot)).toEqual({
      ok: true,
      bookRefs: [
        'book:signed:arman:11',
        'book:signed:atamura:10',
        'book:signed:atamura:7',
      ],
      catalogVersion: snapshot.snapshot.version,
    });
  });

  it('rejects a selected publisher missing from the last valid catalog snapshot', () => {
    const snapshot = createBookCatalogSnapshot(books);
    if (!snapshot.ok) throw new Error('fixture must be valid');

    expect(resolvePublisherBookRefs(['missing'], snapshot.snapshot)).toEqual({
      ok: false,
      code: 'missing-publisher',
      publishers: ['missing'],
    });
  });

  it('rejects malformed catalog rows instead of putting untrusted ids on the wire', () => {
    expect(
      createBookCatalogSnapshot([
        { public_id: '', publisher: 'Атамұра', grade: 10 },
        { public_id: 'book:signed:bad-grade', publisher: 'Атамұра', grade: 12 },
      ]),
    ).toEqual({ ok: false, code: 'invalid-catalog' });
  });

  it('retains the last valid snapshot when a refresh is malformed', () => {
    const initial = createBookCatalogSnapshot(books);
    if (!initial.ok) throw new Error('fixture must be valid');
    const next = updateBookCatalogSnapshot(initial.snapshot, [
      { public_id: '', publisher: 'Атамұра', grade: 10 },
    ]);
    expect(next).toEqual({
      snapshot: initial.snapshot,
      error: 'invalid-catalog',
      stale: true,
    });
  });
});
