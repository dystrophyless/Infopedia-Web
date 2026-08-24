import type { TestsDashboardChapter } from '../../../api/tests';

export type DashboardSort = 'importance' | 'accuracy' | 'count';
export type DashboardFilter = 'all' | 'weak';
export type { TestsDashboardChapter };

export type DashboardMetricVisibility = {
  showEmpty: boolean;
  showAccuracy: boolean;
  showDelta: boolean;
};

export type ChapterMetricVisibility = {
  showNoData: boolean;
  showAccuracy: boolean;
  showDelta: boolean;
};

export function getDashboardMetricVisibility(
  completedAttemptCount: number | null,
  accuracy: number | null,
  delta: number | null,
): DashboardMetricVisibility {
  const showEmpty = completedAttemptCount === 0 || (completedAttemptCount === null && accuracy === null);
  return {
    showEmpty,
    showAccuracy: !showEmpty && accuracy !== null,
    showDelta: completedAttemptCount !== null && completedAttemptCount >= 2 && delta !== null,
  };
}

export function getChapterMetricVisibility(
  completedAttemptCount: number | null,
  accuracy: number | null,
  delta: number | null,
): ChapterMetricVisibility {
  const showNoData = completedAttemptCount === 0 || (completedAttemptCount === null && accuracy === null);
  return {
    showNoData,
    showAccuracy: !showNoData && accuracy !== null,
    showDelta: completedAttemptCount !== null && completedAttemptCount >= 2 && delta !== null,
  };
}

export function isChapterLaunchAvailable(chapter: TestsDashboardChapter): boolean {
  // `questionCount` is the server-provided aggregate; chapter eligibility has
  // no separate API boolean, so only a positive authoritative count can launch.
  return Number.isFinite(chapter.questionCount) && chapter.questionCount > 0;
}

function compareNullable(left: number | null, right: number | null, direction: 'asc' | 'desc'): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === 'asc' ? left - right : right - left;
}

function stableTieBreak(left: TestsDashboardChapter, right: TestsDashboardChapter): number {
  return (left.code || left.chapterRef).localeCompare(right.code || right.chapterRef);
}

export function sortDashboardChapters(
  chapters: TestsDashboardChapter[],
  sort: DashboardSort,
): TestsDashboardChapter[] {
  return [...chapters].sort((left, right) => {
    if (sort === 'accuracy') {
      const result = compareNullable(left.accuracy, right.accuracy, 'asc');
      return result || stableTieBreak(left, right);
    }
    if (sort === 'count') {
      const result = compareNullable(left.questionCount, right.questionCount, 'desc');
      return result || stableTieBreak(left, right);
    }
    return left.importanceRank - right.importanceRank || stableTieBreak(left, right);
  });
}

export function filterDashboardChapters(
  chapters: TestsDashboardChapter[],
  filter: DashboardFilter,
): TestsDashboardChapter[] {
  if (filter === 'all') return [...chapters];
  return chapters.filter((chapter) => chapter.accuracy !== null && chapter.accuracy < 50);
}

export function getVisibleDashboardChapters(
  chapters: TestsDashboardChapter[],
  expanded: boolean,
): TestsDashboardChapter[] {
  return expanded ? chapters : chapters.slice(0, 6);
}

export function getAccuracyTone(accuracy: number | null): 'positive' | 'accent' | 'negative' | 'neutral' {
  if (accuracy === null) return 'neutral';
  if (accuracy >= 70) return 'positive';
  if (accuracy >= 50) return 'accent';
  return 'negative';
}

export function getDeltaTone(delta: number | null): 'positive' | 'negative' | 'neutral' {
  if (delta === null || delta === 0) return 'neutral';
  return delta > 0 ? 'positive' : 'negative';
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

export function formatDelta(value: number | null): string {
  if (value === null) return '—';
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function formatRecentTestDateTime(completedAt: string, locale: 'ru' | 'kk'): string {
  return new Intl.DateTimeFormat(locale === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(completedAt));
}
