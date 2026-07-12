import { useCallback, useReducer } from 'react';
import type { TestQuestion } from '../../../api/tests';
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

  const selectOption = useCallback((optionId: string) => {
    dispatch({ type: 'select-option', optionId });
  }, []);

  const runPrimaryAction = useCallback((question: TestQuestion, totalQuestions: number) => {
    dispatch({
      type: 'primary-action',
      question,
      totalQuestions,
      now: Date.now(),
    });
  }, []);

  return {
    state,
    resetTestState,
    selectOption,
    runPrimaryAction,
  };
}
