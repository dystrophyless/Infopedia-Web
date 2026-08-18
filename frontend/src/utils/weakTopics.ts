import type { AnalyzeChapterResult } from '../types';

export type WeakTopicInsight = AnalyzeChapterResult & {
  lostPoints: number;
};

export type WeakTopicSummary = {
  lowestPercent: number;
  lostPoints: number;
  revisionCount: number;
};

export function buildWeakTopicInsights(results: AnalyzeChapterResult[]): WeakTopicInsight[] {
  return results
    .map((topic) => ({
      ...topic,
      lostPoints: Math.max(0, topic.max_score - topic.score),
    }))
    .filter((topic) => topic.lostPoints >= 1)
    .sort((first, second) => {
      if (first.percentage !== second.percentage) return first.percentage - second.percentage;
      if (first.lostPoints !== second.lostPoints) return second.lostPoints - first.lostPoints;
      if (first.question_count !== second.question_count) return second.question_count - first.question_count;
      return first.title.localeCompare(second.title);
    });
}

export function getWeakTopicSummary(weakTopics: WeakTopicInsight[]): WeakTopicSummary {
  return {
    lowestPercent: weakTopics[0]?.percentage ?? 0,
    lostPoints: weakTopics.reduce((sum, topic) => sum + topic.lostPoints, 0),
    revisionCount: weakTopics.length,
  };
}
