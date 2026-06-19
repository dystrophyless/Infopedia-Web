export type ScoreStatusId = 'low' | 'review' | 'good' | 'excellent';

export interface ScoreStatus {
  id: ScoreStatusId;
  labelKey: string;
  textColor: string;
  backgroundColor: string;
  progressColor: string;
  borderColor: string;
  accentColor: string;
}

const SCORE_STATUSES: Record<ScoreStatusId, ScoreStatus> = {
  low: {
    id: 'low',
    labelKey: 'scoreStatus.low',
    textColor: '#b91c1c',
    backgroundColor: '#fee2e2',
    progressColor: '#dc2626',
    borderColor: '#fecaca',
    accentColor: '#ef4444',
  },
  review: {
    id: 'review',
    labelKey: 'scoreStatus.review',
    textColor: '#6f4f00',
    backgroundColor: '#fff8df',
    progressColor: '#d4a90f',
    borderColor: '#f0d985',
    accentColor: '#c99a06',
  },
  good: {
    id: 'good',
    labelKey: 'scoreStatus.good',
    textColor: '#3f6212',
    backgroundColor: '#ecfccb',
    progressColor: '#a3e635',
    borderColor: '#d9f99d',
    accentColor: '#84cc16',
  },
  excellent: {
    id: 'excellent',
    labelKey: 'scoreStatus.excellent',
    textColor: '#15803d',
    backgroundColor: '#dcfce7',
    progressColor: '#16a34a',
    borderColor: '#bbf7d0',
    accentColor: '#22c55e',
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
