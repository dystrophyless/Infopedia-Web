import type { TopicLocale } from '../types';

export function normalizeTopicLocale(locale?: string | null): TopicLocale {
  const normalized = locale?.trim().toLowerCase() ?? '';

  if (normalized === 'ru' || normalized.startsWith('ru-')) return 'ru';
  if (
    normalized === 'kk' ||
    normalized.startsWith('kk-') ||
    normalized === 'kz' ||
    normalized.startsWith('kz-')
  ) return 'kk';
  return 'kk';
}
