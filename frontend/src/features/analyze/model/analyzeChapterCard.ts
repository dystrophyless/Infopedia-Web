import type { AnalyzeChapterResult, AnalyzeTopicCode } from '../../../types';

export interface AnalyzeChapterCardData {
  chapterId: number;
  title: string;
  score: number;
  maxScore: number;
  questionCount: number;
  percentage: number;
  lostPoints: number;
  topicCount: number;
  materialGrades: number[];
  topics: AnalyzeTopicCode[];
}

/**
 * Projects the raw analysis payload into the small, disclosure-safe card
 * contract. Locked cards deliberately receive no topic labels from the API.
 */
export function getAnalyzeChapterCardData(
  chapter: AnalyzeChapterResult,
  locked: boolean,
): AnalyzeChapterCardData {
  const topics = locked ? [] : chapter.topic_codes ?? [];
  const materialGrades = Array.from(new Set(chapter.material_grades ?? [])).sort(
    (left, right) => left - right,
  );
  const topicCount = locked
    ? chapter.topic_count ?? 0
    : chapter.topic_count ?? chapter.books.reduce((sum, book) => sum + book.topic_count, 0);

  return {
    chapterId: chapter.chapter_id,
    title: chapter.title,
    score: chapter.score,
    maxScore: chapter.max_score,
    questionCount: chapter.question_count,
    percentage: chapter.percentage,
    lostPoints: Math.max(0, chapter.max_score - chapter.score),
    topicCount,
    materialGrades,
    topics,
  };
}
