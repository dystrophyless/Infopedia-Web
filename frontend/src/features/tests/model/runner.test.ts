import { describe, expect, it } from 'vitest';
import type { TestQuestion } from '../../../api/tests';
import {
  createTestRunnerState,
  getTestRunnerPhase,
  reduceTestRunner,
} from './runner';

const question = (id = 'question-1'): TestQuestion => ({
  id,
  prompt: 'Question',
  options: [
    { id: 'a', label: 'A', text: 'Wrong' },
    { id: 'b', label: 'B', text: 'Correct' },
  ],
  correctOptionId: 'b',
  explanation: 'Explanation',
  topic: {
    id: 'topic-1',
    title: 'Topic one',
    questionCount: 10,
    estimatedMinutes: 5,
  },
});

describe('test runner state transitions', () => {
  it('moves through select, check, locked feedback, next question, and result phases', () => {
    const initial = createTestRunnerState(1_000);
    expect(getTestRunnerPhase(initial)).toBe('select');

    const selected = reduceTestRunner(initial, { type: 'select-option', optionId: 'a' });
    expect(getTestRunnerPhase(selected)).toBe('check');
    expect(selected.selectedOptionId).toBe('a');

    const checked = reduceTestRunner(selected, {
      type: 'primary-action',
      question: question(),
      totalQuestions: 2,
      now: 2_000,
    });
    expect(getTestRunnerPhase(checked)).toBe('locked-feedback');
    expect(checked.answerRecords).toEqual([
      {
        questionId: 'question-1',
        selectedOptionId: 'a',
        correct: false,
        topicId: 'topic-1',
        topicTitle: 'Topic one',
        questionCount: 10,
        estimatedMinutes: 5,
      },
    ]);

    expect(
      reduceTestRunner(checked, { type: 'select-option', optionId: 'b' }),
    ).toBe(checked);

    const nextQuestion = reduceTestRunner(checked, {
      type: 'primary-action',
      question: question(),
      totalQuestions: 2,
      now: 2_500,
    });
    expect(nextQuestion).toMatchObject({
      currentQuestionIndex: 1,
      selectedOptionId: null,
      checkedOptionId: null,
      resultVisible: false,
    });
    expect(nextQuestion.answerRecords).toHaveLength(1);

    const secondSelected = reduceTestRunner(nextQuestion, {
      type: 'select-option',
      optionId: 'b',
    });
    const secondChecked = reduceTestRunner(secondSelected, {
      type: 'primary-action',
      question: question('question-2'),
      totalQuestions: 2,
      now: 3_000,
    });
    const result = reduceTestRunner(secondChecked, {
      type: 'primary-action',
      question: question('question-2'),
      totalQuestions: 2,
      now: 4_000,
    });

    expect(getTestRunnerPhase(result)).toBe('result');
    expect(result).toMatchObject({
      currentQuestionIndex: 1,
      selectedOptionId: null,
      checkedOptionId: null,
      resultVisible: true,
      completedAt: 4_000,
    });
    expect(result.answerRecords.map(({ correct }) => correct)).toEqual([false, true]);
  });

  it('ignores a primary action without a selection and resets every field', () => {
    const initial = createTestRunnerState(1_000);
    expect(
      reduceTestRunner(initial, {
        type: 'primary-action',
        question: question(),
        totalQuestions: 1,
        now: 2_000,
      }),
    ).toBe(initial);

    const selected = reduceTestRunner(initial, { type: 'select-option', optionId: 'b' });
    const checked = reduceTestRunner(selected, {
      type: 'primary-action',
      question: question(),
      totalQuestions: 1,
      now: 2_000,
    });
    const reset = reduceTestRunner(checked, { type: 'reset', now: 9_000 });

    expect(reset).toEqual(createTestRunnerState(9_000));
  });
});
