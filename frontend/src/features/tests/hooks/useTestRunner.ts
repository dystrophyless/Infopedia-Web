import { useCallback, useReducer } from 'react';
import type {
  TestAnswerFeedback,
  TestCompletionSummary,
  TestQuestion,
} from '../../../api/tests';
import { createTestRunnerState, reduceTestRunner } from '../model';

export function useTestRunner() {
  const [state, dispatch] = useReducer(
    reduceTestRunner,
    undefined,
    () => createTestRunnerState(Date.now()),
  );

  const resetTestState = useCallback(() => {
    dispatch({ type: 'reset', now: Date.now() });
  }, []);

  const hydrateTestState = useCallback((questions: TestQuestion[], answers: Record<string, TestAnswerFeedback>, currentQuestionIndex: number) => {
    dispatch({ type: 'hydrate', questions, answers, currentQuestionIndex, now: Date.now() });
  }, []);

  const selectOption = useCallback((optionId: string) => {
    dispatch({ type: 'select-option', optionId });
  }, []);

  const submitAnswer = useCallback((question: TestQuestion, feedback: TestAnswerFeedback) => {
    dispatch({
      type: 'answer-submitted',
      question,
      feedback,
      now: Date.now(),
    });
  }, []);

  const advanceQuestion = useCallback((totalQuestions: number) => {
    dispatch({ type: 'next-question', totalQuestions, now: Date.now() });
  }, []);

  const goToQuestion = useCallback((questions: TestQuestion[], questionIndex: number) => {
    dispatch({ type: 'go-to-question', questions, questionIndex });
  }, []);

  const previousQuestion = useCallback((questions: TestQuestion[]) => {
    dispatch({ type: 'go-to-question', questions, questionIndex: state.currentQuestionIndex - 1 });
  }, [state.currentQuestionIndex]);

  const completeAttempt = useCallback((summary: TestCompletionSummary | null) => {
    dispatch({ type: 'complete', summary, now: Date.now() });
  }, []);

  return {
    state,
    resetTestState,
    hydrateTestState,
    selectOption,
    submitAnswer,
    advanceQuestion,
    goToQuestion,
    previousQuestion,
    completeAttempt,
  };
}
