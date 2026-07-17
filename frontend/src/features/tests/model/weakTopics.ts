import type { AnalyzeChapterResult } from '../../../types';
import { buildWeakTopicInsights } from '../../../utils/weakTopics';

export type TestsWeakTopic = {
  chapter_id: number | null;
  code: string;
  title: string;
  percentage: number;
};

export const MAX_WEAK_TOPIC_ROWS = 3;

export const FALLBACK_WEAK_TOPICS: TestsWeakTopic[] = [
  { chapter_id: null, code: 'computer-devices', title: 'Устройство компьютера', percentage: 21 },
  { chapter_id: null, code: 'relational-databases', title: 'Реляционные базы данных', percentage: 33 },
  {
    chapter_id: null,
    code: 'hardware-and-software',
    title: 'Аппаратное обеспечение. Программное обеспечение',
    percentage: 47,
  },
];

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getWeakTopicSearchTarget(topics: TestsWeakTopic[]): string {
  const firstTopic = topics[0]?.title.trim();
  if (!firstTopic) return '/search';
  return `/search?query=${encodeURIComponent(firstTopic)}`;
}

export function buildTestsWeakTopics(
  latestResults: AnalyzeChapterResult[] | null,
): TestsWeakTopic[] {
  const liveWeakTopics = buildWeakTopicInsights(latestResults ?? [])
    .slice(0, MAX_WEAK_TOPIC_ROWS)
    .map((topic) => ({
      chapter_id: topic.chapter_id,
      code: topic.code,
      title: topic.title,
      percentage: topic.percentage,
    }));

  return liveWeakTopics.length > 0 ? liveWeakTopics : FALLBACK_WEAK_TOPICS;
}
