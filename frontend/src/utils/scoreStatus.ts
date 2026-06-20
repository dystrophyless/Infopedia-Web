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
    textColor: '#92400e',
    backgroundColor: '#fef3c7',
    progressColor: '#eab308',
    borderColor: '#facc15',
    accentColor: '#ca8a04',
  },
  good: {
    id: 'good',
    labelKey: 'scoreStatus.good',
    textColor: '#166534',
    backgroundColor: '#dcfce7',
    progressColor: '#22c55e',
    borderColor: '#86efac',
    accentColor: '#16a34a',
  },
  excellent: {
    id: 'excellent',
    labelKey: 'scoreStatus.excellent',
    textColor: '#047857',
    backgroundColor: '#d1fae5',
    progressColor: '#059669',
    borderColor: '#6ee7b7',
    accentColor: '#10b981',
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
