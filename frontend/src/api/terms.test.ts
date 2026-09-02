import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('./client', () => ({ apiClient: { get } }));

import { getRelatedTermsForDefinition } from './terms';

describe('terms API boundary', () => {
  beforeEach(() => get.mockReset());

  it('requests related terms for the exact term and definition and forwards cancellation', async () => {
    const controller = new AbortController();
    const payload = [{ public_id: 'term-2', name: 'Related' }];
    get.mockResolvedValueOnce({ data: payload });

    await expect(getRelatedTermsForDefinition('term/1', 'definition/7', controller.signal)).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/terms/term%2F1/related', {
      params: { definition_ref: 'definition/7' },
      signal: controller.signal,
    });
  });
});
