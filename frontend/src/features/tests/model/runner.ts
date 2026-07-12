import type { TestQuestion } from '../../../api/tests';

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
  answerRecords: TestAnswerRecord[];
  resultVisible: boolean;
  startedAt: number;
  completedAt: number | null;
};

export type TestRunnerPhase = 'select' | 'check' | 'locked-feedback' | 'result';

export type TestRunnerAction =
  | { type: 'reset'; now: number }
  | { type: 'select-option'; optionId: string }
  | {
      type: 'primary-action';
      question: TestQuestion;
      totalQuestions: number;
      now: number;
    };

export function createTestRunnerState(now: number): TestRunnerState {
  return {
    currentQuestionIndex: 0,
    selectedOptionId: null,
    checkedOptionId: null,
    answerRecords: [],
    resultVisible: false,
    startedAt: now,
    completedAt: null,
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
): TestAnswerRecord {
  return {
    questionId: question.id,
    selectedOptionId,
    correct: selectedOptionId === question.correctOptionId,
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

  if (action.type === 'select-option') {
    if (state.resultVisible || state.checkedOptionId !== null) return state;
    return { ...state, selectedOptionId: action.optionId };
  }

  if (state.resultVisible || state.selectedOptionId === null) return state;

  if (state.checkedOptionId === null) {
    return {
      ...state,
      checkedOptionId: state.selectedOptionId,
      answerRecords: [
        ...state.answerRecords,
        createAnswerRecord(action.question, state.selectedOptionId),
      ],
    };
  }

  if (state.currentQuestionIndex < action.totalQuestions - 1) {
    return {
      ...state,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      selectedOptionId: null,
      checkedOptionId: null,
    };
  }

  return {
    ...state,
    selectedOptionId: null,
    checkedOptionId: null,
    completedAt: action.now,
    resultVisible: true,
  };
}
