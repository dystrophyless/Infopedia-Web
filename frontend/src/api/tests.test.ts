import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import {
  completeTestAttempt,
  createTestAttempt,
  getTestAttempt,
  getTestsDashboard,
  normalizeTestCompletion,
  normalizeTestSession,
  submitTestAnswer,
  isTestsCatalogError,
  normalizeTestsDashboard,
} from './tests';

describe('tests API adapter', () => {
  it('uses the server-authoritative dashboard and attempt route map', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { chapters: [], recentTests: [] } } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { attemptRef: 'attempt-1' } } as never);

    await getTestsDashboard('ru');
    await createTestAttempt('default', 'chapter-1');
    await getTestAttempt('attempt-1');
    await submitTestAnswer('attempt-1', 'question-1', 'option-1');
    await completeTestAttempt('attempt-1');

    expect(get).toHaveBeenNthCalledWith(1, '/api/tests/dashboard', { params: { locale: 'ru' } });
    expect(get).toHaveBeenNthCalledWith(2, '/api/tests/attempts/attempt-1');
    expect(post).toHaveBeenNthCalledWith(1, '/api/tests/attempts', { mode: 'random', chapter_ref: 'chapter-1' });
    expect(post).toHaveBeenNthCalledWith(2, '/api/tests/attempts/attempt-1/questions/question-1/answer', { option_ref: 'option-1' });
    expect(post).toHaveBeenNthCalledWith(3, '/api/tests/attempts/attempt-1/complete');

    get.mockRestore();
    post.mockRestore();
  });

  it('normalizes the backend snake_case completion count without local recomputation', () => {
    expect(normalizeTestCompletion({
      correct_answer_count: 14,
      total_questions: 20,
      answered_questions: 20,
      score_percent: 70,
      duration_seconds: 91,
      average_pace_seconds: 5,
      weak_topic: null,
      previous_score_percent: 65,
      accuracy_delta_points: 5,
    })).toMatchObject({
      correctAnswerCount: 14,
      scorePercent: 70,
      durationSeconds: 91,
      previousScorePercent: 65,
      accuracyDeltaPoints: 5,
    });
  });

  it('keeps missing and malformed accuracy comparison values unavailable while preserving zero', () => {
    expect(normalizeTestCompletion({ score_percent: 70 })?.accuracyDeltaPoints).toBeNull();
    expect(normalizeTestCompletion({ score_percent: 70, accuracy_delta_points: '5' })?.accuracyDeltaPoints).toBeNull();
    expect(normalizeTestCompletion({ score_percent: 70, accuracyDeltaPoints: 0 })?.accuracyDeltaPoints).toBe(0);
  });

  it('preserves additive availability counts from the dashboard payload', () => {
    expect(normalizeTestsDashboard({ mode_availability: [{ mode: 'random', available: false, required_questions: 20, available_questions: 3 }] }).modeAvailability[0]).toMatchObject({
      disabledReason: { requiredQuestions: 20, availableQuestions: 3 },
    });
  });

  it('preserves zero completed-attempt counts and fails closed when legacy payloads omit them', () => {
    expect(normalizeTestsDashboard({
      completed_attempt_count: 0,
      chapters: [{ chapter_ref: 'chapter-1', completed_attempt_count: 0 }],
    })).toMatchObject({
      completedAttemptCount: 0,
      chapters: [{ completedAttemptCount: 0 }],
    });
    expect(normalizeTestsDashboard({ chapters: [{ chapter_ref: 'chapter-legacy' }] })).toMatchObject({
      completedAttemptCount: null,
      chapters: [{ completedAttemptCount: null }],
    });
  });

  it('fails closed when a mode availability row omits its boolean decision', () => {
    expect(normalizeTestsDashboard({ mode_availability: [{ mode: 'random' }] }).modeAvailability[0].available).toBe(false);
  });

  it('derives session and recent titles from mode and requested locale', () => {
    expect(normalizeTestSession({ mode: 'random', title: 'Random test' }, 'ru').title).toBe('Случайный тест');
    expect(normalizeTestSession({ mode: 'weak', title: 'historical English' }, 'kk').title).toBe('Әлсіз тақырыптар бойынша тест');
    expect(normalizeTestsDashboard({ recent_tests: [{ id: 'a', mode: 'chapter', title: 'historical English' }] }, 'ru').recentTests[0].title).toBe('Тест по разделу');
  });

  it('passes the requested KK locale to create and get attempt calls', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { mode: 'random' } } as never);
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { mode: 'chapter' } } as never);

    await createTestAttempt('random', undefined, 'kk');
    await getTestAttempt('attempt-kk', 'kk');

    expect(post).toHaveBeenCalledWith('/api/tests/attempts', { mode: 'random' }, { params: { locale: 'kk' } });
    expect(get).toHaveBeenCalledWith('/api/tests/attempts/attempt-kk', { params: { locale: 'kk' } });
    post.mockRestore();
    get.mockRestore();
  });

  it('classifies catalog readiness 503 responses distinctly for retry UI', async () => {
    const get = vi.spyOn(apiClient, 'get').mockRejectedValue({
      response: { status: 503, data: { code: 'TEST_CATALOG_NOT_READY' } },
    });
    await expect(getTestsDashboard()).rejects.toSatisfy((error: unknown) => isTestsCatalogError(error, 'not-ready'));
    get.mockRejectedValue({ response: { status: 503, data: { code: 'TEST_CATALOG_STALE' } } });
    await expect(getTestsDashboard()).rejects.toSatisfy((error: unknown) => isTestsCatalogError(error, 'stale'));
    get.mockRestore();
  });
});
