import type { AnalyzeChapterResult } from '../../../types';
import { buildWeakTopicInsights } from '../../../utils/weakTopics';

export type TestsWeakTopic = {
  chapter_id: number | null;
  code: string;
  title: string;
  percentage: number;
};

export const MAX_WEAK_TOPIC_ROWS = 3;

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

  return liveWeakTopics;
}
