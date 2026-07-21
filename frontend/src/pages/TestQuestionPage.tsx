import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTestSession, type TestSession } from '../api/tests';
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
  const {
    state: runnerState,
    resetTestState,
    selectOption,
    runPrimaryAction,
  } = useTestRunner();
  const topicCode = searchParams.get('topicCode') ?? undefined;

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError(false);
    getTestSession(testMode ?? 'default', topicCode)
      .then((session) => {
        if (!active) return;
        setTestSession(session);
        resetTestState();
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setTestSession(null);
        resetTestState();
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [resetTestState, testMode, topicCode]);

  const questions = testSession?.questions ?? [];
  const metrics = getTestRunnerMetrics(runnerState, questions, Date.now());
  const title = testSession?.title ?? t('tests.testTitleFallback', { defaultValue: 'Тест' });
  const onBack = () => navigate('/tests');

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
        onRestart={resetTestState}
      />
    );
  }

  const activeQuestion = metrics.currentQuestion;
  const handlePrimaryAction = () => {
    if (metrics.checkDisabled || !runnerState.selectedOptionId) return;
    runPrimaryAction(activeQuestion, metrics.totalQuestions);
  };

  return (
    <TestQuestionView
      title={title}
      question={activeQuestion}
      currentQuestionIndex={runnerState.currentQuestionIndex}
      totalQuestions={metrics.totalQuestions}
      progressPercent={metrics.progressPercent}
      selectedOptionId={runnerState.selectedOptionId}
      checkedOptionId={runnerState.checkedOptionId}
      checked={metrics.checked}
      checkDisabled={metrics.checkDisabled}
      onBack={onBack}
      onSelectOption={selectOption}
      onPrimaryAction={handlePrimaryAction}
    />
  );
}
