import { describe, expect, it } from 'vitest';
import type { AnalyzeChapterResult } from '../../../types';
import { buildTestsWeakTopics, clampPercent, getWeakTopicSearchTarget } from './weakTopics';

const chapterIds = new Map<string, number>();

const result = (
  title: string,
  percentage: number,
  score: number,
  maxScore = 10,
): AnalyzeChapterResult => {
  const chapterId = chapterIds.get(title) ?? chapterIds.size + 1;
  chapterIds.set(title, chapterId);
  return {
    chapter_id: chapterId,
    code: title.toLowerCase(),
    title,
    percentage,
    score,
    max_score: maxScore,
    question_count: 10,
    books: [],
  };
};

describe('tests weak-topic model', () => {
  it('clamps rendered progress values and encodes the first topic search target', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(-4)).toBe(0);
    expect(clampPercent(47.6)).toBe(48);
    expect(clampPercent(140)).toBe(100);
    expect(getWeakTopicSearchTarget([])).toBe('/search');
    expect(getWeakTopicSearchTarget([{ chapter_id: null, code: '', title: '  ', percentage: 1 }])).toBe('/search');
    expect(
      getWeakTopicSearchTarget([{ chapter_id: 9, code: 'relational-databases', title: 'Реляционные базы', percentage: 33 }]),
    ).toBe('/search?query=%D0%A0%D0%B5%D0%BB%D1%8F%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D1%8B%D0%B5%20%D0%B1%D0%B0%D0%B7%D1%8B');
  });

  it('uses up to three live weak topics in weakness order', () => {
    chapterIds.clear();
    const topics = buildTestsWeakTopics([
      result('Strong', 95, 10),
      result('Fourth', 60, 5),
      result('Second', 20, 2),
      result('First', 10, 1),
      result('Third', 40, 4),
    ]);

    expect(topics).toEqual([
      { chapter_id: 4, code: 'first', title: 'First', percentage: 10 },
      { chapter_id: 3, code: 'second', title: 'Second', percentage: 20 },
      { chapter_id: 5, code: 'third', title: 'Third', percentage: 40 },
    ]);
  });

  it('returns no weak topics when analysis is missing, empty, or perfect', () => {
    expect(buildTestsWeakTopics(null)).toEqual([]);
    expect(buildTestsWeakTopics([])).toEqual([]);
    expect(buildTestsWeakTopics([result('Perfect', 100, 10)])).toEqual([]);
  });
});
