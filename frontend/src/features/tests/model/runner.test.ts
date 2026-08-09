import { describe, expect, it } from 'vitest';
import type {
  TestAnswerFeedback,
  TestCompletionSummary,
  TestQuestion,
} from '../../../api/tests';
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
  explanation: 'Explanation',
  topic: {
    id: 'topic-1',
    title: 'Topic one',
    questionCount: 10,
    estimatedMinutes: 5,
  },
});

const feedback = (questionId: string, optionId: string, correct: boolean): TestAnswerFeedback => ({
  questionId,
  optionId,
  correct,
  correctOptionRef: 'b',
  explanation: 'Server explanation',
});

const summary: TestCompletionSummary = {
  correctAnswerCount: 1,
  totalQuestions: 2,
  answeredQuestions: 2,
  scorePercent: 50,
  durationSeconds: 3,
  averagePaceSeconds: 2,
  weakTopicResult: null,
};

describe('test runner state transitions', () => {
  it('moves through server feedback, next question, and server completion phases', () => {
    const initial = createTestRunnerState(1_000);
    expect(getTestRunnerPhase(initial)).toBe('select');

    const selected = reduceTestRunner(initial, { type: 'select-option', optionId: 'a' });
    expect(getTestRunnerPhase(selected)).toBe('check');
    expect(selected.selectedOptionId).toBe('a');

    const checked = reduceTestRunner(selected, {
      type: 'answer-submitted',
      question: question(),
      feedback: feedback('question-1', 'a', false),
      now: 2_000,
    });
    expect(getTestRunnerPhase(checked)).toBe('locked-feedback');
    expect(checked.answerFeedback).toMatchObject({ correct: false, correctOptionRef: 'b' });
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
      type: 'next-question',
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
      type: 'answer-submitted',
      question: question('question-2'),
      feedback: feedback('question-2', 'b', true),
      now: 3_000,
    });
    const finalNext = reduceTestRunner(secondChecked, {
      type: 'next-question',
      totalQuestions: 2,
      now: 3_500,
    });
    expect(finalNext).toBe(secondChecked);

    const result = reduceTestRunner(secondChecked, {
      type: 'complete',
      summary,
      now: 4_000,
    });

    expect(getTestRunnerPhase(result)).toBe('result');
    expect(result).toMatchObject({
      currentQuestionIndex: 1,
      selectedOptionId: null,
      checkedOptionId: null,
      answerFeedback: null,
      resultVisible: true,
      completedAt: 4_000,
      completionSummary: summary,
    });
    expect(result.answerRecords.map(({ correct }) => correct)).toEqual([false, true]);
  });

  it('ignores server feedback without a selection and resets every field', () => {
    const initial = createTestRunnerState(1_000);
    expect(
      reduceTestRunner(initial, {
        type: 'answer-submitted',
        question: question(),
        feedback: feedback('question-1', 'a', false),
        now: 2_000,
      }),
    ).toBe(initial);

    const selected = reduceTestRunner(initial, { type: 'select-option', optionId: 'b' });
    const checked = reduceTestRunner(selected, {
      type: 'answer-submitted',
      question: question(),
      feedback: feedback('question-1', 'b', true),
      now: 2_000,
    });
    const reset = reduceTestRunner(checked, { type: 'reset', now: 9_000 });

    expect(reset).toEqual(createTestRunnerState(9_000));
  });

  it('hydrates persisted server answers and resumes at the server cursor', () => {
    const initial = createTestRunnerState(1_000);
    const hydrated = reduceTestRunner(initial, {
      type: 'hydrate',
      questions: [question('q1'), question('q2')],
      answers: {
        q1: { questionId: 'q1', optionId: 'b', correct: true, correctOptionRef: 'b', explanation: 'Server explanation' },
      },
      currentQuestionIndex: 1,
      now: 5_000,
    });
    expect(hydrated.currentQuestionIndex).toBe(1);
    expect(hydrated.answerRecords).toHaveLength(1);
    expect(hydrated.answerRecords[0]).toMatchObject({ questionId: 'q1', correct: true });
    expect(hydrated.selectedOptionId).toBeNull();
    expect(hydrated.checkedOptionId).toBeNull();
  });

  it('restores feedback on an answered cursor so a reload can complete the attempt', () => {
    const hydrated = reduceTestRunner(createTestRunnerState(1_000), {
      type: 'hydrate',
      questions: [question('q1'), question('q2')],
      answers: {
        q1: { questionId: 'q1', optionId: 'a', correct: false },
        q2: { questionId: 'q2', optionId: 'b', correct: true },
      },
      currentQuestionIndex: 1,
      now: 5_000,
    });
    expect(hydrated.selectedOptionId).toBe('b');
    expect(hydrated.checkedOptionId).toBe('b');
    expect(hydrated.answerFeedback).toMatchObject({ questionId: 'q2', correct: true });
  });
});
