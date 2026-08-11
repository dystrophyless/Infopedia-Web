import { describe, expect, it } from 'vitest';
import { chooseSearchLoadMoreAction, shouldReplaceSearchRequest } from './searchRequestPolicy';

describe('term search request policy', () => {
  it('starts one replacement per new key and skips an identical apply', () => {
    expect(shouldReplaceSearchRequest(null, 'key-a', false)).toBe(true);
    expect(shouldReplaceSearchRequest('key-a', 'key-a', false)).toBe(false);
    expect(shouldReplaceSearchRequest('key-a', 'key-a', true)).toBe(true);
  });

  it('reveals four loaded terms before appending at the loaded length', () => {
    expect(chooseSearchLoadMoreAction({ visible: 4, loaded: 11, hasMore: true })).toEqual({
      type: 'reveal', nextVisible: 8,
    });
    expect(chooseSearchLoadMoreAction({ visible: 11, loaded: 11, hasMore: true })).toEqual({
      type: 'append', skip: 11,
    });
    expect(chooseSearchLoadMoreAction({ visible: 11, loaded: 11, hasMore: false })).toEqual({
      type: 'none',
    });
  });
});
