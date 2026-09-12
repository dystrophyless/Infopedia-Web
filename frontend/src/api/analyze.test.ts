import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('./client', () => ({ API_URL: 'http://api.test', apiClient: { get } }));

import { getUntAnalysisAttempts } from './analyze';

describe('UNT analysis API boundary', () => {
  beforeEach(() => get.mockReset());

  it('requests server-calculated attempt availability', async () => {
    const payload = {
      reference_date: '2026-01-11',
      attempts: [
        { id: 'january', start_date: '2026-01-10', end_date: '2026-02-10', available: true },
      ],
    };
    get.mockResolvedValueOnce({ data: payload });

    await expect(getUntAnalysisAttempts()).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/analyze/attempts');
  });
});
