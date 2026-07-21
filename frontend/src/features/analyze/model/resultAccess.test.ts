import { describe, expect, it } from 'vitest';
import type { AnalyzeChapterResult } from '../../../types';
import { selectAnalyzeResultAccess } from './resultAccess';

const chapter = (
  chapter_id: number,
  overrides: Partial<AnalyzeChapterResult> = {},
): AnalyzeChapterResult => ({
  chapter_id,
  code: `chapter-${chapter_id}`,
  title: `Chapter ${chapter_id}`,
  question_count: 10,
  max_score: 10,
  score: 5,
  percentage: 50,
  books: [],
  ...overrides,
});

describe('selectAnalyzeResultAccess', () => {
  it('selects the chapter with the most lost points first', () => {
    const chapters = [
      chapter(1, { max_score: 10, score: 7 }),
      chapter(2, { max_score: 20, score: 5 }),
    ];

    expect(selectAnalyzeResultAccess(chapters).freeChapter?.chapter_id).toBe(2);
  });

  it('uses percentage ascending as the first tie-breaker', () => {
    const chapters = [
      chapter(1, { percentage: 40 }),
      chapter(2, { percentage: 30 }),
    ];

    expect(selectAnalyzeResultAccess(chapters).orderedChapters.map(({ chapter_id }) => chapter_id)).toEqual([2, 1]);
  });

  it('uses question count descending as the second tie-breaker', () => {
    const chapters = [
      chapter(1, { question_count: 10, percentage: 30 }),
      chapter(2, { question_count: 20, percentage: 30 }),
    ];

    expect(selectAnalyzeResultAccess(chapters).orderedChapters.map(({ chapter_id }) => chapter_id)).toEqual([2, 1]);
  });

  it('uses numeric chapter id ascending as the final tie-breaker', () => {
    const chapters = [
      chapter(10, { percentage: 30, question_count: 20 }),
      chapter(2, { percentage: 30, question_count: 20 }),
    ];

    expect(selectAnalyzeResultAccess(chapters).orderedChapters.map(({ chapter_id }) => chapter_id)).toEqual([2, 10]);
  });

  it('returns safe empty and single-chapter results', () => {
    expect(selectAnalyzeResultAccess([])).toEqual({
      allChapters: [],
      freeChapter: null,
      lockedChapters: [],
      orderedChapters: [],
    });

    const onlyChapter = chapter(7);
    expect(selectAnalyzeResultAccess([onlyChapter])).toEqual({
      allChapters: [onlyChapter],
      freeChapter: onlyChapter,
      lockedChapters: [],
      orderedChapters: [onlyChapter],
    });
  });

  it('excludes chapters with zero lost points from ordered access', () => {
    const chapters = [
      chapter(1, { max_score: 10, score: 10 }),
      chapter(2, { max_score: 10, score: 9 }),
    ];

    expect(selectAnalyzeResultAccess(chapters).allChapters).toEqual(chapters);
    expect(selectAnalyzeResultAccess(chapters).orderedChapters.map(({ chapter_id }) => chapter_id)).toEqual([2]);
  });

  it('does not mutate the input array', () => {
    const first = chapter(1, { max_score: 10, score: 10 });
    const second = chapter(2, { max_score: 10, score: 5 });
    const chapters = [first, second];
    const snapshot = [...chapters];

    selectAnalyzeResultAccess(chapters);

    expect(chapters).toEqual(snapshot);
    expect(chapters).toEqual([first, second]);
  });
});
