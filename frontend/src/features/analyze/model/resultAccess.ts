import type { AnalyzeChapterResult } from '../../../types';

export interface AnalyzeResultAccess {
  allChapters: AnalyzeChapterResult[];
  freeChapter: AnalyzeChapterResult | null;
  lockedChapters: AnalyzeChapterResult[];
  orderedChapters: AnalyzeChapterResult[];
}

const compareAnalyzeChapters = (
  left: AnalyzeChapterResult,
  right: AnalyzeChapterResult,
): number => {
  const lostPointsDifference =
    right.max_score - right.score - (left.max_score - left.score);
  if (lostPointsDifference !== 0) return lostPointsDifference;

  const percentageDifference = left.percentage - right.percentage;
  if (percentageDifference !== 0) return percentageDifference;

  const questionCountDifference = right.question_count - left.question_count;
  if (questionCountDifference !== 0) return questionCountDifference;

  return left.chapter_id - right.chapter_id;
};

export const selectAnalyzeResultAccess = (
  chapters: AnalyzeChapterResult[],
): AnalyzeResultAccess => {
  const allChapters = [...chapters];
  const orderedChapters = allChapters
    .filter(({ max_score, score }) => max_score - score > 0)
    .sort(compareAnalyzeChapters);

  return {
    allChapters,
    freeChapter: orderedChapters[0] ?? null,
    lockedChapters: orderedChapters.slice(1),
    orderedChapters,
  };
};
