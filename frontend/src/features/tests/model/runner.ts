import type { TestQuestion } from '../../../api/tests';
import type { TestAnswerFeedback, TestCompletionSummary } from '../../../api/tests';

export type TestAnswerRecord = {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  topicId: string;
  topicTitle: string;
  questionCount: number;
  estimatedMinutes: number;
};

export type TestRunnerState = {
  currentQuestionIndex: number;
  selectedOptionId: string | null;
  checkedOptionId: string | null;
  answerFeedback: TestAnswerFeedback | null;
  answerRecords: TestAnswerRecord[];
  resultVisible: boolean;
  startedAt: number;
  completedAt: number | null;
  completionSummary: TestCompletionSummary | null;
};

export type TestRunnerPhase = 'select' | 'check' | 'locked-feedback' | 'result';

export type TestRunnerAction =
  | { type: 'reset'; now: number }
  | {
      type: 'hydrate';
      questions: TestQuestion[];
      answers: Record<string, TestAnswerFeedback>;
      currentQuestionIndex: number;
      now: number;
    }
  | { type: 'select-option'; optionId: string }
  | {
      type: 'answer-submitted';
      question: TestQuestion;
      feedback: TestAnswerFeedback;
      now: number;
    }
  | { type: 'next-question'; totalQuestions: number; now: number }
  | { type: 'complete'; summary: TestCompletionSummary | null; now: number };

export function createTestRunnerState(now: number): TestRunnerState {
  return {
    currentQuestionIndex: 0,
    selectedOptionId: null,
    checkedOptionId: null,
    answerFeedback: null,
    answerRecords: [],
    resultVisible: false,
    startedAt: now,
    completedAt: null,
    completionSummary: null,
  };
}

export function getTestRunnerPhase(state: TestRunnerState): TestRunnerPhase {
  if (state.resultVisible) return 'result';
  if (state.checkedOptionId !== null) return 'locked-feedback';
  if (state.selectedOptionId !== null) return 'check';
  return 'select';
}

export function createAnswerRecord(
  question: TestQuestion,
  selectedOptionId: string,
  feedback: TestAnswerFeedback,
): TestAnswerRecord {
  return {
    questionId: question.id,
    selectedOptionId,
    correct: feedback.correct,
    topicId: question.topic.id,
    topicTitle: question.topic.title,
    questionCount: question.topic.questionCount,
    estimatedMinutes: question.topic.estimatedMinutes,
  };
}

export function reduceTestRunner(
  state: TestRunnerState,
  action: TestRunnerAction,
): TestRunnerState {
  if (action.type === 'reset') {
    return createTestRunnerState(action.now);
  }

  if (action.type === 'hydrate') {
    const answerRecords = action.questions.flatMap((question) => {
      const feedback = action.answers[question.id] ?? Object.values(action.answers).find((item) => item.questionId === question.id);
      return feedback ? [createAnswerRecord(question, feedback.optionId, feedback)] : [];
    });
    const currentQuestion = action.questions[action.currentQuestionIndex];
    const currentFeedback = currentQuestion
      ? action.answers[currentQuestion.id] ?? Object.values(action.answers).find((item) => item.questionId === currentQuestion.id)
      : undefined;
    return {
      ...createTestRunnerState(action.now),
      currentQuestionIndex: Math.max(0, Math.min(action.currentQuestionIndex, Math.max(0, action.questions.length - 1))),
      selectedOptionId: currentFeedback?.optionId ?? null,
      checkedOptionId: currentFeedback?.optionId ?? null,
      answerFeedback: currentFeedback ?? null,
      answerRecords,
    };
  }

  if (action.type === 'select-option') {
    if (state.resultVisible || state.checkedOptionId !== null) return state;
    return { ...state, selectedOptionId: action.optionId };
  }

  if (action.type === 'answer-submitted') {
    if (state.resultVisible || state.selectedOptionId === null || state.checkedOptionId !== null) return state;
    return {
      ...state,
      checkedOptionId: action.feedback.optionId,
      answerFeedback: action.feedback,
      answerRecords: [...state.answerRecords, createAnswerRecord(action.question, state.selectedOptionId, action.feedback)],
    };
  }

  if (action.type === 'next-question') {
    if (state.resultVisible || state.checkedOptionId === null) return state;
    // The server owns completion and score calculation.  The last question is
    // completed through the `complete` action after the API confirms it; never
    // reveal a local result merely because the client reached the final index.
    if (state.currentQuestionIndex >= action.totalQuestions - 1) return state;
    return {
      ...state,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      selectedOptionId: null,
      checkedOptionId: null,
      answerFeedback: null,
    };
  }

  if (action.type === 'complete') {
    return {
      ...state,
      selectedOptionId: null,
      checkedOptionId: null,
      answerFeedback: null,
      completedAt: action.now,
      completionSummary: action.summary,
      resultVisible: true,
    };
  }

  return state;
}
