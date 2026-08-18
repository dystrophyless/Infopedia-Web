import { describe, expect, it } from 'vitest';
import type { AnalyzeChapterResult } from '../../../types';
import { getAnalyzeChapterCardData } from './analyzeChapterCard';

const chapter = (overrides: Partial<AnalyzeChapterResult> = {}): AnalyzeChapterResult => ({
  chapter_id: 7,
  code: 'algorithms',
  title: 'Algorithms',
  question_count: 12,
  max_score: 20,
  score: 14,
  percentage: 70,
  books: [{ public_id: 'book-1', publisher: 'Arman-PV', grade: 10, topic_count: 2, percentage: 70 }],
  topic_count: 2,
  material_grades: [10, 11, 10],
  topic_codes: [
    { name: 'loops', title: 'Loops', status: 'completed' },
    { name: 'arrays', title: 'Arrays', status: 'active' },
  ],
  ...overrides,
});

describe('getAnalyzeChapterCardData', () => {
  it('clamps lost points at zero while preserving direct score fields', () => {
    const data = getAnalyzeChapterCardData(chapter({ score: 30 }), false);

    expect(data.lostPoints).toBe(0);
    expect(data.score).toBe(30);
    expect(data.maxScore).toBe(20);
    expect(data.questionCount).toBe(12);
  });

  it('keeps raw question and max-score fields available to card consumers', () => {
    const data = getAnalyzeChapterCardData(chapter({ question_count: 4, max_score: 6 }), false);

    expect(data.questionCount).toBe(4);
    expect(data.maxScore).toBe(6);
  });

  it('returns topic codes only for unlocked chapters and never leaks locked labels', () => {
    const unlocked = getAnalyzeChapterCardData(chapter(), false);
    const locked = getAnalyzeChapterCardData(chapter(), true);

    expect(unlocked.topics.map((topic) => topic.title)).toEqual(['Loops', 'Arrays']);
    expect(locked.topics).toEqual([]);
    expect(locked.topicCount).toBe(2);
  });

  it('deduplicates and sorts material grades for the helper copy', () => {
    expect(getAnalyzeChapterCardData(chapter(), false).materialGrades).toEqual([10, 11]);
  });
});
