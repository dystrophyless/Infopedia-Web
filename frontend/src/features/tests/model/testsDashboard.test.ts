import { describe, expect, it } from 'vitest';
import {
  filterDashboardChapters,
  formatRecentTestDateTime,
  getChapterMetricVisibility,
  getDashboardMetricVisibility,
  getVisibleDashboardChapters,
  isChapterLaunchAvailable,
  sortDashboardChapters,
  type TestsDashboardChapter,
} from './testsDashboard';

const chapters: TestsDashboardChapter[] = [
  { chapterRef: 'chapter-c', code: 'c', title: 'C', importanceRank: 3, questionCount: 4, completedAttemptCount: 0, accuracy: null, deltaPoints: null },
  { chapterRef: 'chapter-a', code: 'a', title: 'A', importanceRank: 1, questionCount: 2, completedAttemptCount: 1, accuracy: 60, deltaPoints: -1 },
  { chapterRef: 'chapter-b', code: 'b', title: 'B', importanceRank: 2, questionCount: 8, completedAttemptCount: 2, accuracy: 40, deltaPoints: 2 },
  { chapterRef: 'chapter-d', code: 'd', title: 'D', importanceRank: 4, questionCount: 8, completedAttemptCount: null, accuracy: 80, deltaPoints: null },
];

describe('tests dashboard chapter model', () => {
  it('formats a recent completion with local date and time in both supported locales', () => {
    const completedAt = '2026-08-24T18:30:00';
    expect(formatRecentTestDateTime(completedAt, 'ru')).toBe('24 авг. 2026 г., 18:30');
    expect(formatRecentTestDateTime(completedAt, 'kk')).toBe('2026 ж. 24 там., 18:30');
  });
  it('sorts by importance, accuracy, and count with stable null/id tie breakers', () => {
    expect(sortDashboardChapters(chapters, 'importance').map((item) => item.code)).toEqual(['a', 'b', 'c', 'd']);
    expect(sortDashboardChapters(chapters, 'accuracy').map((item) => item.code)).toEqual(['b', 'a', 'd', 'c']);
    expect(sortDashboardChapters(chapters, 'count').map((item) => item.code)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('exposes the desktop sort menu in importance, count, accuracy order', async () => {
    const source = await import('fs/promises').then((fs) => fs.readFile(new URL('../components/DesktopTestsHubView.tsx', import.meta.url), 'utf8'));
    expect(source).toMatch(/\['importance', 'count', 'accuracy'\]/);
  });

  it('treats only measured sub-50 accuracy as weak and keeps null chapters out', () => {
    expect(filterDashboardChapters(chapters, 'all').map((item) => item.code)).toEqual(['c', 'a', 'b', 'd']);
    expect(filterDashboardChapters(chapters, 'weak').map((item) => item.code)).toEqual(['b']);
  });

  it('reveals six cards by default and all cards when expanded', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...chapters[index % chapters.length],
      chapterRef: `chapter-${index}`,
      code: `code-${index}`,
    }));
    expect(getVisibleDashboardChapters(many, false)).toHaveLength(6);
    expect(getVisibleDashboardChapters(many, true)).toHaveLength(8);
  });

  it('keeps zero-question chapters unavailable for launch', () => {
    expect(isChapterLaunchAvailable({ ...chapters[0], questionCount: 0 })).toBe(false);
    expect(isChapterLaunchAvailable(chapters[0])).toBe(true);
  });

  it('uses authoritative global counts for the zero, one, multiple, and missing-count matrix', () => {
    expect(getDashboardMetricVisibility(0, 75, 3)).toEqual({ showEmpty: true, showAccuracy: false, showDelta: false });
    expect(getDashboardMetricVisibility(1, 75, 3)).toEqual({ showEmpty: false, showAccuracy: true, showDelta: false });
    expect(getDashboardMetricVisibility(2, 75, 3)).toEqual({ showEmpty: false, showAccuracy: true, showDelta: true });
    expect(getDashboardMetricVisibility(null, null, null)).toEqual({ showEmpty: true, showAccuracy: false, showDelta: false });
    expect(getDashboardMetricVisibility(null, 75, 3)).toEqual({ showEmpty: false, showAccuracy: true, showDelta: false });
    expect(getDashboardMetricVisibility(null, null, 3)).toEqual({ showEmpty: true, showAccuracy: false, showDelta: false });
    expect(getDashboardMetricVisibility(2, null, 3)).toEqual({ showEmpty: false, showAccuracy: false, showDelta: true });
    expect(getDashboardMetricVisibility(2, 75, null)).toEqual({ showEmpty: false, showAccuracy: true, showDelta: false });
  });

  it('uses authoritative chapter counts and hides a non-null delta after one attempt', () => {
    expect(getChapterMetricVisibility(0, 75, 3)).toEqual({ showNoData: true, showAccuracy: false, showDelta: false });
    expect(getChapterMetricVisibility(1, 75, 3)).toEqual({ showNoData: false, showAccuracy: true, showDelta: false });
    expect(getChapterMetricVisibility(2, 75, 3)).toEqual({ showNoData: false, showAccuracy: true, showDelta: true });
    expect(getChapterMetricVisibility(null, null, null)).toEqual({ showNoData: true, showAccuracy: false, showDelta: false });
    expect(getChapterMetricVisibility(null, 75, 3)).toEqual({ showNoData: false, showAccuracy: true, showDelta: false });
    expect(getChapterMetricVisibility(null, null, 3)).toEqual({ showNoData: true, showAccuracy: false, showDelta: false });
  });
});
