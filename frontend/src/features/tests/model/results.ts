import type { TestQuestion } from '../../../api/tests';
import type { TestAnswerRecord, TestRunnerState } from './runner';

export type WeakTopicResult = {
  topicId: string;
  topicTitle: string;
  mistakeCount: number;
  questionCount: number;
  estimatedMinutes: number;
};

export type TestRunnerMetrics = {
  currentQuestion: TestQuestion | undefined;
  totalQuestions: number;
  correctAnswerCount: number;
  progressPercent: number;
  scorePercent: number;
  selectedOption: TestQuestion['options'][number] | undefined;
  checked: boolean;
  checkDisabled: boolean;
  durationSeconds: number;
  averagePaceSeconds: number;
  weakTopicResult: WeakTopicResult | null;
};

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} минут`;
}

export function formatAverageSeconds(seconds: number): string {
  return `${Math.max(0, seconds)} секунд`;
}

export function buildWeakTopicResult(
  answerRecords: TestAnswerRecord[],
  questions: TestQuestion[],
): WeakTopicResult | null {
  const mistakesByTopic = new Map<string, WeakTopicResult>();

  for (const record of answerRecords) {
    if (record.correct) continue;

    const current = mistakesByTopic.get(record.topicId);
    mistakesByTopic.set(record.topicId, {
      topicId: record.topicId,
      topicTitle: record.topicTitle,
      mistakeCount: (current?.mistakeCount ?? 0) + 1,
      questionCount: record.questionCount,
      estimatedMinutes: record.estimatedMinutes,
    });
  }

  const [weakestTopic] = Array.from(mistakesByTopic.values()).sort(
    (left, right) => right.mistakeCount - left.mistakeCount,
  );

  if (weakestTopic) return weakestTopic;

  const firstTopic = questions[0]?.topic;
  if (!firstTopic) return null;

  return {
    topicId: firstTopic.id,
    topicTitle: firstTopic.title,
    mistakeCount: 0,
    questionCount: firstTopic.questionCount,
    estimatedMinutes: firstTopic.estimatedMinutes,
  };
}

export function getTestRunnerMetrics(
  state: TestRunnerState,
  questions: TestQuestion[],
  now: number,
): TestRunnerMetrics {
  const currentQuestion = questions[state.currentQuestionIndex];
  const totalQuestions = questions.length;
  const correctAnswerCount = state.answerRecords.filter((record) => record.correct).length;
  const progressPercent =
    totalQuestions > 0 ? ((state.currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const scorePercent =
    totalQuestions > 0 ? (correctAnswerCount / totalQuestions) * 100 : 0;
  const selectedOption = currentQuestion?.options.find(
    (option) => option.id === state.selectedOptionId,
  );
  const checked = state.checkedOptionId !== null;
  const checkDisabled = !selectedOption && !checked;
  const resultFinishedAt = state.completedAt ?? now;
  const durationSeconds = Math.max(1, Math.round((resultFinishedAt - state.startedAt) / 1000));
  const averagePaceSeconds =
    totalQuestions > 0 ? Math.max(1, Math.round(durationSeconds / totalQuestions)) : 0;
  const weakTopicResult = state.resultVisible
    ? buildWeakTopicResult(state.answerRecords, questions)
    : null;

  return {
    currentQuestion,
    totalQuestions,
    correctAnswerCount,
    progressPercent,
    scorePercent,
    selectedOption,
    checked,
    checkDisabled,
    durationSeconds,
    averagePaceSeconds,
    weakTopicResult,
  };
}
