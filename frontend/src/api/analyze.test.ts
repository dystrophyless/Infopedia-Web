import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('./client', () => ({ API_URL: 'http://api.test', apiClient: { get, post } }));

import { createAnalyzeTask, getUntAnalysisAttempts } from './analyze';

describe('UNT analysis API boundary', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

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

  it('sends the selected attempt and date with the analysis PDF', async () => {
    const task = { task_id: 'task-1', status: 'pending' as const };
    post.mockResolvedValueOnce({ data: task });

    await expect(
      createAnalyzeTask(
        new File(['pdf'], 'results.pdf', { type: 'application/pdf' }),
        'ru',
        { attemptId: 'january', attemptDate: '2026-01-11' },
      ),
    ).resolves.toBe(task);

    const form = post.mock.calls[0][1] as FormData;
    expect(post.mock.calls[0][0]).toBe('/api/analyze');
    expect(form.get('unt_attempt_id')).toBe('january');
    expect(form.get('unt_attempt_date')).toBe('2026-01-11');
  });
});
