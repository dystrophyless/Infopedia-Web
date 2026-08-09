import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  completeTestAttempt,
  createTestAttempt,
  getTestAttempt,
  submitTestAnswer,
  type TestCompletionSummary,
  type TestMode,
  type TestSession,
} from '../api/tests';
import {
  getTestRunnerMetrics,
  TestQuestionView,
  TestResultView,
  TestStatusView,
  useTestRunner,
} from '../features/tests';

export function TestQuestionPage() {
  const navigate = useNavigate();
  const { testMode } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const generationRef = useRef(0);
  const completionPromiseRef = useRef<Promise<TestCompletionSummary | null> | null>(null);
  const {
    state: runnerState,
    resetTestState,
    hydrateTestState,
    selectOption,
    submitAnswer,
    advanceQuestion,
    completeAttempt,
  } = useTestRunner();
  const chapterRef = searchParams.get('chapterRef') ?? searchParams.get('topicCode') ?? undefined;
  const attemptRef = searchParams.get('attemptRef') ?? undefined;
  const requestedMode: TestMode | 'default' =
    testMode === 'weak' || testMode === 'mock' || testMode === 'chapter' || testMode === 'random'
      ? testMode
      : 'default';

  useEffect(() => {
    let active = true;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    completionPromiseRef.current = null;
    setActionError(false);
    setSubmitting(false);

    setLoading(true);
    setLoadError(false);
    const sessionRequest = attemptRef && restartNonce === 0
      ? getTestAttempt(attemptRef)
      : createTestAttempt(requestedMode, chapterRef);
    sessionRequest
      .then((session) => {
        if (!active || generationRef.current !== generation) return;
        setTestSession(session);
        resetTestState();
        hydrateTestState(session.questions, session.answers ?? {}, session.currentQuestionIndex ?? 0);
        if (session.status === 'completed' && session.summary) {
          completeAttempt(session.summary);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active || generationRef.current !== generation) return;
        setTestSession(null);
        resetTestState();
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (generationRef.current === generation) generationRef.current += 1;
    };
  }, [attemptRef, chapterRef, completeAttempt, hydrateTestState, requestedMode, resetTestState, restartNonce]);

  const questions = testSession?.questions ?? [];
  const metrics = getTestRunnerMetrics(runnerState, questions, Date.now());
  const title = testSession?.title ?? t('tests.testTitleFallback', { defaultValue: 'Тест' });
  const onBack = () => navigate('/tests');
  const onRestart = () => {
    setRestartNonce((value) => value + 1);
  };

  const handlePrimaryAction = async () => {
    if (submitting || !testSession?.attemptRef || !metrics.currentQuestion) return;

    if (!runnerState.checkedOptionId) {
      const selectedOptionId = runnerState.selectedOptionId;
      if (!selectedOptionId) return;

      const generation = generationRef.current;
      setSubmitting(true);
      setActionError(false);
      try {
        const feedback = await submitTestAnswer(
          testSession.attemptRef,
          metrics.currentQuestion.id,
          selectedOptionId,
        );
        if (generationRef.current !== generation) return;
        submitAnswer(metrics.currentQuestion, feedback);
      } catch {
        if (generationRef.current === generation) setActionError(true);
      } finally {
        if (generationRef.current === generation) setSubmitting(false);
      }
      return;
    }

    if (runnerState.currentQuestionIndex < metrics.totalQuestions - 1) {
      advanceQuestion(metrics.totalQuestions);
      return;
    }

    if (completionPromiseRef.current) return;
    const generation = generationRef.current;
    const completionPromise = completeTestAttempt(testSession.attemptRef);
    completionPromiseRef.current = completionPromise;
    setSubmitting(true);
    setActionError(false);
    try {
      const summary = await completionPromise;
      if (generationRef.current !== generation) return;
      completeAttempt(summary);
    } catch {
      if (generationRef.current === generation) setActionError(true);
    } finally {
      if (generationRef.current === generation) {
        setSubmitting(false);
        completionPromiseRef.current = null;
      }
    }
  };

  if (loading) {
    return (
      <TestStatusView
        title={title}
        message={t('tests.loadingTest', { defaultValue: 'Загрузка теста' })}
        loading
        onBack={onBack}
      />
    );
  }

  if (loadError) {
    return (
      <TestStatusView
        title={title}
        message={t('tests.loadTestError', { defaultValue: 'Не удалось загрузить тест' })}
        actionLabel={t('common.retry', { defaultValue: 'Повторить' })}
        onBack={onBack}
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!metrics.currentQuestion) {
    return (
      <TestStatusView
        title={title}
        message={t('tests.emptyTest', { defaultValue: 'В этом тесте пока нет вопросов' })}
        onBack={onBack}
      />
    );
  }

  if (runnerState.resultVisible) {
    return (
      <TestResultView
        title={title}
        correctAnswerCount={metrics.correctAnswerCount}
        totalQuestions={metrics.totalQuestions}
        scorePercent={metrics.scorePercent}
        durationSeconds={metrics.durationSeconds}
        averagePaceSeconds={metrics.averagePaceSeconds}
        weakTopicResult={metrics.weakTopicResult}
        onBack={onBack}
        onRestart={onRestart}
      />
    );
  }

  const activeQuestion = metrics.currentQuestion;

  return (
    <TestQuestionView
      title={title}
      question={activeQuestion}
      currentQuestionIndex={runnerState.currentQuestionIndex}
      totalQuestions={metrics.totalQuestions}
      progressPercent={metrics.progressPercent}
      selectedOptionId={runnerState.selectedOptionId}
      checkedOptionId={runnerState.checkedOptionId}
      answerFeedback={runnerState.answerFeedback}
      checked={metrics.checked}
      checkDisabled={metrics.checkDisabled || submitting}
      actionError={actionError}
      onBack={onBack}
      onSelectOption={selectOption}
      onPrimaryAction={handlePrimaryAction}
    />
  );
}
