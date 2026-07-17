import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('./client', () => ({
  apiClient: { get },
}));

import { getTopic, normalizeTopicLocale } from './topics';
import type { TopicDetail } from '../types';

describe('topics API boundary', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('normalizes browser locale variants to the supported topic locales', () => {
    expect(normalizeTopicLocale('ru-RU')).toBe('ru');
    expect(normalizeTopicLocale('kk-KZ')).toBe('kk');
    expect(normalizeTopicLocale('en-US')).toBe('kk');
    expect(normalizeTopicLocale(null)).toBe('kk');
  });

  it('encodes the topic reference and passes the normalized locale query parameter', async () => {
    const payload: TopicDetail = {
      public_id: 'topic/ref',
      name: 'Topic',
      page_start: 1,
      page_end: 2,
      book: { public_id: 'book-1', publisher: 'Publisher', grade: 10 },
      topic_codes: [
        { public_id: 'topic-code-1', name: '7.1.1.1', title: 'Localized title' },
      ],
    };
    get.mockResolvedValueOnce({ data: payload });

    await expect(getTopic('topic/ref', 'ru-RU')).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/topics/topic%2Fref', {
      params: { locale: 'ru' },
    });
  });
});
