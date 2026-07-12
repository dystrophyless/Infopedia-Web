import { describe, expect, it } from 'vitest';
import type { TestQuestion } from '../../../api/tests';
import {
  buildWeakTopicResult,
  formatAverageSeconds,
  formatDuration,
  getTestRunnerMetrics,
} from './results';
import type { TestAnswerRecord, TestRunnerState } from './runner';

const question = (id: string, topicId: string, topicTitle: string): TestQuestion => ({
  id,
  prompt: id,
  options: [
    { id: 'a', label: 'A', text: 'Wrong' },
    { id: 'b', label: 'B', text: 'Correct' },
  ],
  correctOptionId: 'b',
  explanation: 'Explanation',
  topic: {
    id: topicId,
    title: topicTitle,
    questionCount: 8,
    estimatedMinutes: 4,
  },
});

const answer = (
  questionId: string,
  topicId: string,
  topicTitle: string,
  correct: boolean,
): TestAnswerRecord => ({
  questionId,
  selectedOptionId: correct ? 'b' : 'a',
  correct,
  topicId,
  topicTitle,
  questionCount: 8,
  estimatedMinutes: 4,
});

describe('test result helpers', () => {
  it('preserves duration and average pace copy formatting', () => {
    expect(formatDuration(65)).toBe('1:05 минут');
    expect(formatDuration(-5)).toBe('0:00 минут');
    expect(formatAverageSeconds(12)).toBe('12 секунд');
    expect(formatAverageSeconds(-3)).toBe('0 секунд');
  });

  it('selects the topic with most mistakes and falls back to the first topic on a perfect result', () => {
    const questions = [
      question('q1', 'topic-a', 'Topic A'),
      question('q2', 'topic-b', 'Topic B'),
    ];
    const records = [
      answer('q1', 'topic-a', 'Topic A', false),
      answer('q2', 'topic-b', 'Topic B', false),
      answer('q3', 'topic-b', 'Topic B', false),
    ];

    expect(buildWeakTopicResult(records, questions)).toEqual({
      topicId: 'topic-b',
      topicTitle: 'Topic B',
      mistakeCount: 2,
      questionCount: 8,
      estimatedMinutes: 4,
    });
    expect(buildWeakTopicResult([answer('q1', 'topic-a', 'Topic A', true)], questions)).toEqual({
      topicId: 'topic-a',
      topicTitle: 'Topic A',
      mistakeCount: 0,
      questionCount: 8,
      estimatedMinutes: 4,
    });
    expect(buildWeakTopicResult([], [])).toBeNull();
  });

  it('derives question, score, progress, timing, and locked-state metrics without mutating state', () => {
    const questions = [
      question('q1', 'topic-a', 'Topic A'),
      question('q2', 'topic-b', 'Topic B'),
    ];
    const state: TestRunnerState = {
      currentQuestionIndex: 1,
      selectedOptionId: 'a',
      checkedOptionId: 'a',
      answerRecords: [
        answer('q1', 'topic-a', 'Topic A', true),
        answer('q2', 'topic-b', 'Topic B', false),
      ],
      resultVisible: true,
      startedAt: 1_000,
      completedAt: 5_000,
    };

    expect(getTestRunnerMetrics(state, questions, 99_000)).toMatchObject({
      currentQuestion: questions[1],
      totalQuestions: 2,
      correctAnswerCount: 1,
      progressPercent: 100,
      scorePercent: 50,
      selectedOption: questions[1].options[0],
      checked: true,
      checkDisabled: false,
      durationSeconds: 4,
      averagePaceSeconds: 2,
      weakTopicResult: {
        topicId: 'topic-b',
        mistakeCount: 1,
      },
    });
    expect(state.completedAt).toBe(5_000);
  });
});
