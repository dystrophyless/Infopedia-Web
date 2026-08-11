import { describe, expect, it } from 'vitest';
import { appendSearchPage, replaceSearchPage } from './searchPageState';

const term = (id: string, definitions = [`definition-${id}`]) => ({
  public_id: id,
  name: id,
  definitions: definitions.map((text) => ({ text, page: 1 })),
});

describe('server search page state', () => {
  it('replaces from skip zero without sorting or reordering definitions', () => {
    const page = replaceSearchPage({
      terms: [term('z', ['qualifying-first', 'second']), term('a')],
      total: 8,
      skip: 0,
      limit: 11,
      has_more: true,
    });
    expect(page.terms.map(({ public_id }) => public_id)).toEqual(['z', 'a']);
    expect(page.terms[0].definitions?.[0].text).toBe('qualifying-first');
  });

  it('appends at the loaded length while preserving server total and order', () => {
    const current = replaceSearchPage({
      terms: [term('b'), term('a')], total: 4, skip: 0, limit: 2, has_more: true,
    });
    const next = appendSearchPage(current, {
      terms: [term('d'), term('c')], total: 4, skip: 2, limit: 2, has_more: false,
    });
    expect(next.terms.map(({ public_id }) => public_id)).toEqual(['b', 'a', 'd', 'c']);
    expect(next.total).toBe(4);
    expect(next.hasMore).toBe(false);
  });

  it('rejects a stale page whose skip does not equal the loaded length', () => {
    const current = replaceSearchPage({
      terms: [term('a')], total: 2, skip: 0, limit: 1, has_more: true,
    });
    expect(() => appendSearchPage(current, {
      terms: [term('b')], total: 2, skip: 0, limit: 1, has_more: false,
    })).toThrow(/skip/i);
  });
});
