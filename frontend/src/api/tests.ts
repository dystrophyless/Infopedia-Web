/* legacy implementation removed; all test data is server-owned. */


import { apiClient } from './client';

export type TestMode = 'random' | 'weak' | 'mock' | 'chapter';
export type TestTopicSummary = {
  id: string;
  title: string;
  questionCount: number;
  estimatedMinutes: number;
  chapterRef?: string;
  code?: string;
};
export type TestQuestionOption = { id: string; label: string; text: string };
export type TestQuestion = {
  id: string;
  prompt: string;
  options: TestQuestionOption[];
  topic: TestTopicSummary;
  explanation?: string;
};
export type TestAnswerFeedback = {
  questionId: string;
  optionId: string;
  correct: boolean;
  explanation?: string;
  correctOptionRef?: string;
  awardedWeight?: number;
};
export type TestCompletionSummary = {
  correctAnswerCount: number;
  totalQuestions: number;
  answeredQuestions: number;
  scorePercent: number;
  durationSeconds: number;
  averagePaceSeconds: number;
  previousScorePercent?: number | null;
  accuracyDeltaPoints?: number | null;
  weakTopicResult: {
    topicId: string;
    topicTitle: string;
    mistakeCount: number;
    questionCount: number;
    estimatedMinutes: number;
  } | null;
};
export type TestSession = {
  id: string;
  attemptRef: string;
  mode: TestMode;
  title: string;
  status: 'active' | 'completed';
  questions: TestQuestion[];
  answers?: Record<string, TestAnswerFeedback>;
  summary?: TestCompletionSummary | null;
  startedAt?: string;
  completedAt?: string | null;
  currentQuestionIndex?: number;
};
export type TestsModeAvailability = {
  mode: TestMode;
  available: boolean;
  disabledReason?: {
    code?: string;
    reason?: string;
    requiredQuestions?: number;
    availableQuestions?: number;
    message?: string;
  } | null;
};
export type TestsCatalogErrorKind = 'not-ready' | 'stale';
export class TestsCatalogError extends Error {
  readonly kind: TestsCatalogErrorKind;
  constructor(kind: TestsCatalogErrorKind) {
    super(kind === 'not-ready' ? 'Test catalog is not ready' : 'Test catalog is stale');
    this.name = 'TestsCatalogError';
    this.kind = kind;
  }
}
export function isTestsCatalogError(value: unknown, kind?: TestsCatalogErrorKind): value is TestsCatalogError {
  return value instanceof TestsCatalogError && (kind === undefined || value.kind === kind);
}
export type TestsDashboardChapter = {
  chapterRef: string;
  code: string;
  title: string;
  importanceRank: number;
  questionCount: number;
  completedAttemptCount: number | null;
  accuracy: number | null;
  deltaPoints: number | null;
};
export type TestsDashboardRecent = {
  attemptRef: string;
  mode: TestMode;
  title: string;
  completedAt: string;
  accuracy: number;
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  skippedQuestionCount: number;
};
export type TestsDashboard = {
  completedAttemptCount: number | null;
  overallAccuracy: number | null;
  overallDeltaPoints: number | null;
  deltaWindowDays: number;
  recentTests: TestsDashboardRecent[];
  chapters: TestsDashboardChapter[];
  modeAvailability: TestsModeAvailability[];
};

const TEST_MODE_TITLES: Record<'ru' | 'kk', Record<TestMode, string>> = {
  ru: {
    random: 'Случайный тест',
    weak: 'Тест по слабым темам',
    mock: 'Пробный тест',
    chapter: 'Тест по разделу',
  },
  kk: {
    random: 'Кездейсоқ тест',
    weak: 'Әлсіз тақырыптар бойынша тест',
    mock: 'Сынақ тесті',
    chapter: 'Бөлім бойынша тест',
  },
};

export function normalizeTestLocale(locale: string | undefined): 'ru' | 'kk' {
  return locale?.toLowerCase() === 'kk' ? 'kk' : 'ru';
}

export function getTestModeTitle(mode: TestMode, locale = 'ru'): string {
  return TEST_MODE_TITLES[normalizeTestLocale(locale)][mode];
}

type UnknownRecord = Record<string, unknown>;
const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
const firstString = (record: UnknownRecord, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
};
const firstNumber = (record: UnknownRecord, ...keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};
const firstBoolean = (record: UnknownRecord, ...keys: string[]): boolean | null => {
  for (const key of keys) if (typeof record[key] === 'boolean') return record[key] as boolean;
  return null;
};
const normalizeMode = (value: unknown): TestMode =>
  value === 'weak' || value === 'mock' || value === 'chapter' ? value : 'random';
const normalizeTopic = (value: unknown): TestTopicSummary => {
  const record = asRecord(value);
  return {
    id: firstString(record, 'id', 'chapter_ref', 'chapterRef', 'ref', 'code'),
    chapterRef: firstString(record, 'chapter_ref', 'chapterRef', 'ref') || undefined,
    code: firstString(record, 'code') || undefined,
    title: firstString(record, 'title', 'name'),
    questionCount: firstNumber(record, 'question_count', 'questionCount', 'count') ?? 0,
    estimatedMinutes: firstNumber(record, 'estimated_minutes', 'estimatedMinutes') ?? 0,
  };
};
const normalizeQuestion = (value: unknown): TestQuestion => {
  const record = asRecord(value);
  const options = Array.isArray(record.options)
    ? record.options.map((option) => {
        const item = asRecord(option);
        return {
          id: firstString(item, 'option_ref', 'optionRef', 'ref', 'id'),
          label: firstString(item, 'label', 'key'),
          text: firstString(item, 'text', 'label_text', 'value'),
        };
      })
    : [];
  return {
    id: firstString(record, 'question_ref', 'questionRef', 'ref', 'id'),
    prompt: firstString(record, 'prompt', 'question', 'text'),
    options,
    topic: normalizeTopic(record.chapter ?? record.topic ?? record),
    explanation: firstString(record, 'explanation') || undefined,
  };
};
const normalizeFeedback = (value: unknown, fallback: { questionId: string; optionId: string }): TestAnswerFeedback => {
  const record = asRecord(value);
  const nested = asRecord(record.answer);
  const source = Object.keys(nested).length ? { ...record, ...nested } : record;
  return {
    questionId: firstString(source, 'question_ref', 'questionRef', 'question_id', 'questionId') || fallback.questionId,
    optionId: firstString(source, 'option_ref', 'optionRef', 'option_id', 'optionId', 'selected_option_ref') || fallback.optionId,
    correct: firstBoolean(source, 'correct', 'is_correct', 'isCorrect') ?? false,
    explanation: firstString(source, 'explanation', 'feedback_text', 'feedbackText') || undefined,
    correctOptionRef: firstString(source, 'correct_option_ref', 'correctOptionRef') || undefined,
    awardedWeight: firstNumber(source, 'awarded_weight', 'awardedWeight') ?? undefined,
  };
};
const normalizeSummary = (value: unknown): TestCompletionSummary | null => {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;
  const weakRecord = asRecord(record.weak_topic ?? record.weakTopic);
  return {
    correctAnswerCount: firstNumber(record, 'correct_answer_count', 'correct_count', 'correctAnswerCount', 'correct_answers') ?? 0,
    totalQuestions: firstNumber(record, 'total_questions', 'totalQuestions') ?? 0,
    answeredQuestions: firstNumber(record, 'answered_questions', 'answeredQuestions') ?? 0,
    scorePercent: firstNumber(record, 'accuracy', 'score_percent', 'scorePercent') ?? 0,
    durationSeconds: firstNumber(record, 'duration_seconds', 'durationSeconds') ?? 0,
    averagePaceSeconds: firstNumber(record, 'average_pace_seconds', 'averagePaceSeconds') ?? 0,
    previousScorePercent: firstNumber(record, 'previous_score_percent', 'previousScorePercent'),
    accuracyDeltaPoints: firstNumber(record, 'accuracy_delta_points', 'accuracyDeltaPoints'),
    weakTopicResult: Object.keys(weakRecord).length
      ? {
          topicId: firstString(weakRecord, 'topic_id', 'topicId', 'chapter_ref', 'chapterRef'),
          topicTitle: firstString(weakRecord, 'topic_title', 'topicTitle', 'title'),
          mistakeCount: firstNumber(weakRecord, 'mistake_count', 'mistakeCount') ?? 0,
          questionCount: firstNumber(weakRecord, 'question_count', 'questionCount') ?? 0,
          estimatedMinutes: firstNumber(weakRecord, 'estimated_minutes', 'estimatedMinutes') ?? 0,
        }
      : null,
  };
};

const normalizeSession = (value: unknown, locale = 'ru'): TestSession => {
  const record = asRecord(value);
  const questions = Array.isArray(record.questions) ? record.questions.map(normalizeQuestion) : [];
  const rawAnswers = asRecord(record.answers);
  const answers = Object.fromEntries(
    Object.entries(rawAnswers).map(([questionId, answer]) => [questionId, normalizeFeedback(answer, { questionId, optionId: '' })]),
  );
  return {
    id: firstString(record, 'id', 'attempt_id', 'attemptId', 'attempt_ref', 'attemptRef'),
    attemptRef: firstString(record, 'attempt_ref', 'attemptRef', 'ref', 'id'),
    mode: normalizeMode(record.mode),
    title: getTestModeTitle(normalizeMode(record.mode), locale),
    status: record.status === 'completed' || Boolean(record.completed_at ?? record.completedAt) ? 'completed' : 'active',
    questions,
    answers: Object.keys(answers).length ? answers : undefined,
    summary: normalizeSummary(record.summary ?? record.result),
    startedAt: firstString(record, 'started_at', 'startedAt') || undefined,
    completedAt: firstString(record, 'completed_at', 'completedAt') || null,
    currentQuestionIndex: firstNumber(record, 'current_question_index', 'currentQuestionIndex') ?? 0,
  };
};

const normalizeDashboard = (value: unknown, locale = 'ru'): TestsDashboard => {
  const record = asRecord(value);
  const chapters = Array.isArray(record.chapters)
    ? record.chapters.map((item) => {
        const chapter = asRecord(item);
        return {
          chapterRef: firstString(chapter, 'chapter_ref', 'chapterRef', 'ref', 'id'),
          code: firstString(chapter, 'code'),
          title: firstString(chapter, 'title', 'name'),
          importanceRank: firstNumber(chapter, 'importance_rank', 'importanceRank', 'rank') ?? 0,
          questionCount: firstNumber(chapter, 'question_count', 'questionCount', 'count') ?? 0,
          completedAttemptCount: firstNumber(chapter, 'completed_attempt_count', 'completedAttemptCount'),
          accuracy: firstNumber(chapter, 'accuracy'),
          deltaPoints: firstNumber(chapter, 'delta_points', 'deltaPoints', 'delta'),
        } satisfies TestsDashboardChapter;
      })
    : [];
  const rawRecent = record.recent_tests ?? record.recentTests;
  const recentTests = Array.isArray(rawRecent)
    ? rawRecent.map((item) => {
        const recent = asRecord(item);
        return {
          attemptRef: firstString(recent, 'id', 'attempt_ref', 'attemptRef'),
          mode: normalizeMode(recent.mode),
          title: getTestModeTitle(normalizeMode(recent.mode), locale),
          completedAt: firstString(recent, 'completed_at', 'completedAt'),
          accuracy: firstNumber(recent, 'accuracy', 'score_percent', 'scorePercent') ?? 0,
          correctAnswerCount: firstNumber(recent, 'correct_answer_count', 'correctAnswerCount') ?? 0,
          incorrectAnswerCount: firstNumber(recent, 'incorrect_answer_count', 'incorrectAnswerCount') ?? 0,
          skippedQuestionCount: firstNumber(recent, 'skipped_question_count', 'skippedQuestionCount') ?? 0,
        } satisfies TestsDashboardRecent;
      })
    : [];
  const rawAvailability = record.mode_availability ?? record.modeAvailability;
  const modeAvailability = Array.isArray(rawAvailability)
    ? rawAvailability.map((item) => {
        const itemRecord = asRecord(item);
        const reason = asRecord(itemRecord.disabled_reason ?? itemRecord.disabledReason);
        const requiredQuestions = firstNumber(itemRecord, 'required_questions', 'requiredQuestions') ?? firstNumber(reason, 'required_questions', 'requiredQuestions');
        const availableQuestions = firstNumber(itemRecord, 'available_questions', 'availableQuestions') ?? firstNumber(reason, 'available_questions', 'availableQuestions');
        return {
          mode: normalizeMode(itemRecord.mode),
          available: itemRecord.available === true,
          disabledReason: Object.keys(reason).length
            ? {
                code: firstString(reason, 'code') || undefined,
                reason: firstString(reason, 'reason') || undefined,
                requiredQuestions: requiredQuestions ?? undefined,
                availableQuestions: availableQuestions ?? undefined,
                message: firstString(reason, 'message') || undefined,
              }
            : requiredQuestions !== null || availableQuestions !== null
              ? { requiredQuestions: requiredQuestions ?? undefined, availableQuestions: availableQuestions ?? undefined }
              : null,
        } satisfies TestsModeAvailability;
      })
    : [];
  return {
    completedAttemptCount: firstNumber(record, 'completed_attempt_count', 'completedAttemptCount'),
    overallAccuracy: firstNumber(record, 'overall_accuracy', 'overallAccuracy', 'accuracy'),
    overallDeltaPoints: firstNumber(record, 'overall_delta_points', 'overallDeltaPoints', 'delta_points', 'delta'),
    deltaWindowDays: firstNumber(record, 'delta_window_days', 'deltaWindowDays') ?? 7,
    recentTests,
    chapters,
    modeAvailability,
  };
};

export const normalizeTestSession = normalizeSession;
export const normalizeTestsDashboard = normalizeDashboard;
export const normalizeTestAnswerFeedback = normalizeFeedback;
export const normalizeTestCompletion = (value: unknown): TestCompletionSummary | null => {
  const record = asRecord(value);
  return normalizeSummary(record.summary ?? record.result ?? value);
};

export async function getTestsDashboard(locale = 'ru'): Promise<TestsDashboard> {
  try {
    const { data } = await apiClient.get('/api/tests/dashboard', { params: { locale } });
    return normalizeDashboard(data, locale);
  } catch (error) {
    const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response;
    const payload = asRecord(response?.data);
    const code = firstString(payload, 'code') || firstString(asRecord(payload.detail), 'code');
    if (response?.status === 503 && (code === 'TEST_CATALOG_NOT_READY' || code === 'TEST_CATALOG_STALE')) {
      throw new TestsCatalogError(code === 'TEST_CATALOG_NOT_READY' ? 'not-ready' : 'stale');
    }
    throw error;
  }
}

export function createTestAttempt(mode: TestMode | 'default', chapterRef?: string): Promise<TestSession>;
export function createTestAttempt(mode: TestMode | 'default', chapterRef?: string, locale?: string): Promise<TestSession>;
export async function createTestAttempt(mode: TestMode | 'default', chapterRef?: string, locale?: string): Promise<TestSession> {
  const normalizedMode: TestMode = mode === 'default' ? 'random' : mode;
  const payload: { mode: TestMode; chapter_ref?: string } = { mode: normalizedMode };
  if (chapterRef) payload.chapter_ref = chapterRef;
  const { data } = locale
    ? await apiClient.post('/api/tests/attempts', payload, { params: { locale } })
    : await apiClient.post('/api/tests/attempts', payload);
  return normalizeSession(data, locale);
}

export async function getTestAttempt(attemptRef: string, locale?: string): Promise<TestSession> {
  const { data } = locale
    ? await apiClient.get('/api/tests/attempts/' + encodeURIComponent(attemptRef), { params: { locale } })
    : await apiClient.get('/api/tests/attempts/' + encodeURIComponent(attemptRef));
  return normalizeSession(data, locale);
}

export async function submitTestAnswer(attemptRef: string, questionRef: string, optionRef: string): Promise<TestAnswerFeedback> {
  const path = '/api/tests/attempts/' + encodeURIComponent(attemptRef) + '/questions/' + encodeURIComponent(questionRef) + '/answer';
  const { data } = await apiClient.post(path, { option_ref: optionRef });
  return normalizeFeedback(data, { questionId: questionRef, optionId: optionRef });
}

export async function completeTestAttempt(attemptRef: string): Promise<TestCompletionSummary | null> {
  const { data } = await apiClient.post('/api/tests/attempts/' + encodeURIComponent(attemptRef) + '/complete');
  return normalizeTestCompletion(data);
}
