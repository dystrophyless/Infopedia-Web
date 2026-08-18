import { apiClient } from './client';
import type { TopicDetail, TopicLocale } from '../types';
import { normalizeTopicLocale } from './topicLocale';

export { normalizeTopicLocale } from './topicLocale';

export {
  getSearchFilterBooks,
  getSearchFilterChapters,
  getTopicBooks,
  getTopicChapters,
} from '../features/search/api/filterCatalog';

export async function getTopic(
  topicRef: string,
  locale: TopicLocale | string = 'kk',
): Promise<TopicDetail> {
  const { data } = await apiClient.get<TopicDetail>(
    `/api/topics/${encodeURIComponent(topicRef)}`,
    { params: { locale: normalizeTopicLocale(locale) } },
  );
  return data;
}
