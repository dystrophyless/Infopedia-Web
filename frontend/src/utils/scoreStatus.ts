export type ScoreStatusId = 'low' | 'review' | 'good' | 'excellent';

export interface ScoreStatus {
  id: ScoreStatusId;
  labelKey: string;
  textClass: string;
  surfaceClass: string;
  progressClass: string;
  borderClass: string;
  accentClass: string;
}

const SCORE_STATUSES: Record<ScoreStatusId, ScoreStatus> = {
  low: {
    id: 'low',
    labelKey: 'scoreStatus.low',
    textClass: 'text-status-low-foreground',
    surfaceClass: 'bg-status-low-surface',
    progressClass: 'bg-status-low-progress',
    borderClass: 'border-status-low-border',
    accentClass: 'text-status-low-accent',
  },
  review: {
    id: 'review',
    labelKey: 'scoreStatus.review',
    textClass: 'text-status-review-foreground',
    surfaceClass: 'bg-status-review-surface',
    progressClass: 'bg-status-review-progress',
    borderClass: 'border-status-review-border',
    accentClass: 'text-status-review-accent',
  },
  good: {
    id: 'good',
    labelKey: 'scoreStatus.good',
    textClass: 'text-status-good-foreground',
    surfaceClass: 'bg-status-good-surface',
    progressClass: 'bg-status-good-progress',
    borderClass: 'border-status-good-border',
    accentClass: 'text-status-good-accent',
  },
  excellent: {
    id: 'excellent',
    labelKey: 'scoreStatus.excellent',
    textClass: 'text-status-excellent-foreground',
    surfaceClass: 'bg-status-excellent-surface',
    progressClass: 'bg-status-excellent-progress',
    borderClass: 'border-status-excellent-border',
    accentClass: 'text-status-excellent-accent',
  },
};

export function getScoreStatus(percent: number): ScoreStatus {
  const normalizedPercent = Math.max(0, Math.min(100, percent));

  if (normalizedPercent < 40) return SCORE_STATUSES.low;
  if (normalizedPercent <= 70) return SCORE_STATUSES.review;
  if (normalizedPercent < 85) return SCORE_STATUSES.good;
  return SCORE_STATUSES.excellent;
}

export function clampScorePercent(percent: number) {
  return Math.max(0, Math.min(100, percent));
}
