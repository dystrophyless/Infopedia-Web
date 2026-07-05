import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight02Icon, RepeatIcon } from '@hugeicons/core-free-icons';
import { getTestSession, type TestQuestion, type TestSession } from '../api/tests';

type OptionTone = 'neutral' | 'selected' | 'correct' | 'incorrect';

type TestAnswerRecord = {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  topicId: string;
  topicTitle: string;
  questionCount: number;
  estimatedMinutes: number;
};

type WeakTopicResult = {
  topicId: string;
  topicTitle: string;
  mistakeCount: number;
  questionCount: number;
  estimatedMinutes: number;
};

function getOptionRowClass(tone: OptionTone): string {
  if (tone === 'correct') return 'border-[#29ae70] bg-white';
  if (tone === 'incorrect') return 'border-[#bc251a] bg-white';

  const selected = tone === 'selected';
  return selected ? 'border-[#6a37c3] bg-white' : 'border-[#ded2f1] bg-white';
}

function getOptionBorderResetClass(tone: OptionTone): string {
  if (tone === 'correct') return 'test-answer-option-correct';
  if (tone === 'incorrect') return 'test-answer-option-incorrect';
  if (tone === 'selected') return 'test-answer-option-selected';
  return 'test-answer-option-neutral';
}

function getOptionMarkerClass(tone: OptionTone): string {
  if (tone === 'correct') return 'bg-[#29ae70] text-[#f8f5fc]';
  if (tone === 'incorrect') return 'bg-[#bc251a] text-white';

  const selected = tone === 'selected';
  return selected ? 'bg-[#6a37c3] text-[#f8f5fc]' : 'bg-[#ded2f1] text-[#a585db]';
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} минут`;
}

function formatAverageSeconds(seconds: number): string {
  return `${Math.max(0, seconds)} секунд`;
}

function buildWeakTopicResult(
  answerRecords: TestAnswerRecord[],
  questions: TestQuestion[],
): WeakTopicResult | null {
  const mistakesByTopic = new Map<string, WeakTopicResult>();

  for (const record of answerRecords) {
    if (record.correct) continue;

    const current = mistakesByTopic.get(record.topicId);
    mistakesByTopic.set(record.topicId, {
      topicId: record.topicId,
      topicTitle: record.topicTitle,
      mistakeCount: (current?.mistakeCount ?? 0) + 1,
      questionCount: record.questionCount,
      estimatedMinutes: record.estimatedMinutes,
    });
  }

  const [weakestTopic] = Array.from(mistakesByTopic.values()).sort(
    (left, right) => right.mistakeCount - left.mistakeCount,
  );

  if (weakestTopic) return weakestTopic;

  const firstTopic = questions[0]?.topic;
  if (!firstTopic) return null;

  return {
    topicId: firstTopic.id,
    topicTitle: firstTopic.title,
    mistakeCount: 0,
    questionCount: firstTopic.questionCount,
    estimatedMinutes: firstTopic.estimatedMinutes,
  };
}

export function TestQuestionPage() {
  const navigate = useNavigate();
  const { testMode } = useParams();
  const { t } = useTranslation();
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [checkedOptionId, setCheckedOptionId] = useState<string | null>(null);
  const [answerRecords, setAnswerRecords] = useState<TestAnswerRecord[]>([]);
  const [resultVisible, setResultVisible] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  function resetTestState() {
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setCheckedOptionId(null);
    setAnswerRecords([]);
    setResultVisible(false);
    setStartedAt(Date.now());
    setCompletedAt(null);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError(false);

    getTestSession(testMode ?? 'default')
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
  }, [testMode]);

  const questions = testSession?.questions ?? [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const correctAnswerCount = answerRecords.filter((record) => record.correct).length;
  const progressPercent =
    totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const scorePercent = totalQuestions > 0 ? (correctAnswerCount / totalQuestions) * 100 : 0;
  const selectedOption = currentQuestion?.options.find((option) => option.id === selectedOptionId);
  const checked = checkedOptionId !== null;
  const checkDisabled = !selectedOption && !checked;
  const title = testSession?.title ?? t('tests.testTitleFallback', { defaultValue: 'Тест' });
  const resultFinishedAt = completedAt ?? Date.now();
  const durationSeconds = Math.max(1, Math.round((resultFinishedAt - startedAt) / 1000));
  const averagePaceSeconds =
    totalQuestions > 0 ? Math.max(1, Math.round(durationSeconds / totalQuestions)) : 0;
  const weakTopicResult = resultVisible ? buildWeakTopicResult(answerRecords, questions) : null;

  function renderStatusPage(message: string, actionLabel?: string) {
    return (
      <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 md:flex md:justify-center max-md:min-h-[calc(100dvh-88px-env(safe-area-inset-bottom,0px))] max-md:px-6 max-md:pb-12 max-md:pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <main className="mx-auto flex w-full max-w-[382px] flex-col md:min-h-[720px] max-md:min-h-[calc(100dvh-200px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]">
          <header className="flex h-10 items-center gap-4 text-[#252329]">
            <button
              type="button"
              className="flex size-6 items-center justify-center text-[#252329]"
              aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })}
              onClick={() => navigate('/tests')}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
            <h1 className="text-[16px] font-medium leading-4 text-[#252329]">{title}</h1>
          </header>

          <section className="mt-8 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc]">
            <p className="text-[16px] font-medium leading-4">{message}</p>
          </section>

          {actionLabel && (
            <div className="mt-auto pt-8">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 text-center text-[16px] font-medium leading-4 text-[#f8f5fc] transition-colors hover:bg-[#572d9f]"
                onClick={() => window.location.reload()}
              >
                {actionLabel}
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  function restartTest() {
    resetTestState();
  }

  function renderTestResult() {
    return (
      <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 md:flex md:justify-center max-md:min-h-[calc(100dvh-88px-env(safe-area-inset-bottom,0px))] max-md:px-6 max-md:pb-12 max-md:pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <main className="mx-auto flex w-full max-w-[382px] flex-col md:min-h-[720px] max-md:min-h-[calc(100dvh-200px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]">
          <header className="flex h-10 items-center gap-4 text-[#252329]">
            <button
              type="button"
              className="flex size-6 items-center justify-center text-[#252329]"
              aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })}
              onClick={() => navigate('/tests')}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
            <h1 className="text-[16px] font-medium leading-4 text-[#252329]">{title}</h1>
          </header>

          <h2 className="mt-8 text-[20px] font-medium leading-5 text-[#572d9f]">
            {t('tests.resultTitle', { defaultValue: 'Результаты' })}
          </h2>

          <section className="mt-8 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc]">
            <p className="text-[12px] font-medium leading-3 text-[#c5b1e7]">
              {t('tests.resultCardTitle', { defaultValue: 'Результат теста' })}
            </p>
            <div className="mt-2 flex items-start gap-2 text-white">
              <p className="text-[32px] font-medium leading-8">
                {correctAnswerCount}/{totalQuestions}
              </p>
              <p className="pt-2 text-[16px] font-medium leading-4">
                {t('tests.correctAnswersLabel', { defaultValue: 'правильных ответов' })}
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-[8px] bg-[rgba(248,245,252,0.25)]">
              <div
                className="h-full rounded-[8px] bg-[#f8f5fc]"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ResultStatCard
              label={t('tests.resultTimeLabel', { defaultValue: 'Время' })}
              value={formatDuration(durationSeconds)}
              description={t('tests.resultTimeDescription', {
                defaultValue: 'потрачено что бы закончить тест',
              })}
            />
            <ResultStatCard
              label={t('tests.resultPaceLabel', { defaultValue: 'Ваш темп' })}
              value={formatAverageSeconds(averagePaceSeconds)}
              description={t('tests.resultPaceDescription', {
                defaultValue: 'в среднем потрачено на один вопрос',
              })}
            />
          </div>

          <h2 className="mt-12 text-[20px] font-medium leading-5 text-[#572d9f]">
            {t('tests.repeatTitle', { defaultValue: 'Повторите' })}
          </h2>

          {weakTopicResult && (
            <>
              <section className="mt-6 flex items-center gap-6 rounded-[8px] bg-white px-6 py-4">
                <HugeiconsIcon
                  icon={RepeatIcon}
                  size={24}
                  strokeWidth={1.7}
                  className="shrink-0 text-[#6a37c3]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-3 text-[#865bcf]">
                    {t('tests.weakTopicLabel', { defaultValue: 'Слабая тема' })}
                  </p>
                  <p className="mt-1 truncate text-[16px] font-normal leading-4 text-[#161519]">
                    {weakTopicResult?.topicTitle}
                  </p>
                  <p className="mt-2 text-[12px] font-normal leading-3 text-[#b1acb9]">
                    {t('tests.weakTopicMistakesDynamic', {
                      count: weakTopicResult?.mistakeCount,
                      defaultValue: '{{count}} ошибки по этому разделу',
                    })}
                  </p>
                </div>
              </section>

              <button
                type="button"
                className="mt-2 flex w-full items-center gap-6 rounded-[8px] bg-white px-6 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium leading-4 text-[#6a37c3]">
                    {t('tests.sectionRetakeTitle', { defaultValue: 'Тест по этому разделу' })}
                  </span>
                  <span className="mt-2 block text-[14px] font-normal leading-[14px] text-[#524d5b]">
                    {t('tests.sectionRetakeDynamicDescription', {
                      count: weakTopicResult?.questionCount,
                      minutes: weakTopicResult?.estimatedMinutes,
                      defaultValue: '{{count}} вопросов, {{minutes}} минут',
                    })}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight02Icon}
                  size={24}
                  strokeWidth={1.8}
                  className="shrink-0 text-[#6a37c3]"
                  aria-hidden
                />
              </button>
            </>
          )}

          <div className="mt-auto pt-8">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 text-center text-[16px] font-medium leading-4 text-[#f8f5fc] transition-colors hover:bg-[#572d9f]"
              onClick={restartTest}
            >
              {t('tests.retryTestButton', { defaultValue: 'Попробовать ещё' })}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return renderStatusPage(t('tests.loadingTest', { defaultValue: 'Загрузка теста' }));
  }

  if (loadError) {
    return renderStatusPage(
      t('tests.loadTestError', { defaultValue: 'Не удалось загрузить тест' }),
      t('common.retry', { defaultValue: 'Повторить' }),
    );
  }

  if (!currentQuestion) {
    return renderStatusPage(t('tests.emptyTest', { defaultValue: 'В этом тесте пока нет вопросов' }));
  }

  if (resultVisible) return renderTestResult();

  const activeQuestion = currentQuestion;

  function getOptionTone(option: TestQuestion['options'][number]): OptionTone {
    if (checked) {
      if (option.id === activeQuestion.correctOptionId) return 'correct';
      if (option.id === checkedOptionId) return 'incorrect';
      return 'neutral';
    }

    if (option.id === selectedOptionId) return 'selected';
    return 'neutral';
  }

  function handlePrimaryAction() {
    if (checkDisabled || !selectedOptionId) return;

    if (!checked) {
      const correct = selectedOptionId === activeQuestion.correctOptionId;
      setAnswerRecords((records) => [
        ...records,
        {
          questionId: activeQuestion.id,
          selectedOptionId,
          correct,
          topicId: activeQuestion.topic.id,
          topicTitle: activeQuestion.topic.title,
          questionCount: activeQuestion.topic.questionCount,
          estimatedMinutes: activeQuestion.topic.estimatedMinutes,
        },
      ]);
      setCheckedOptionId(selectedOptionId);
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      setSelectedOptionId(null);
      setCheckedOptionId(null);
    } else {
      setSelectedOptionId(null);
      setCheckedOptionId(null);
      setCompletedAt(Date.now());
      setResultVisible(true);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 md:flex md:justify-center max-md:min-h-[calc(100dvh-88px-env(safe-area-inset-bottom,0px))] max-md:px-6 max-md:pb-12 max-md:pt-[calc(64px+env(safe-area-inset-top,0px))]">
      <main className="test-question-content mx-auto flex w-full max-w-[382px] flex-col md:min-h-[720px] max-md:min-h-[calc(100dvh-200px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]">
        <header className="test-question-mobile-header flex h-14 w-full items-center gap-4 px-4 text-[#252329] max-md:-mx-6 max-md:w-[calc(100%+48px)] md:px-0">
          <button
            type="button"
            className="flex size-6 items-center justify-center text-[#252329]"
            aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })}
            onClick={() => navigate('/tests')}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
          </button>
          <h1 className="text-[16px] font-medium leading-4 text-[#252329]">{title}</h1>
        </header>

        <div
          className="test-question-progress mt-4 h-2 overflow-hidden rounded-[8px] bg-[rgba(106,55,195,0.25)]"
          aria-label={t('tests.questionProgress', {
            defaultValue: 'Прогресс теста',
          })}
        >
          <div
            className="h-full rounded-[8px] bg-[#6a37c3]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <section className="mt-6 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc]">
          <p className="text-[12px] font-medium leading-3 text-[#c5b1e7]">
            {t('tests.questionCounter', {
              current: currentQuestionIndex + 1,
              total: totalQuestions,
              defaultValue: 'Вопрос {{current}} из {{total}}',
            })}
          </p>
          <p className="mt-2 text-[16px] font-medium leading-4">{activeQuestion.prompt}</p>
        </section>

        <fieldset className="mt-6 flex flex-col gap-2">
          <legend className="sr-only">
            {t('tests.answerOptions', { defaultValue: 'Варианты ответа' })}
          </legend>

          {activeQuestion.options.map((option) => {
            const selected = option.id === selectedOptionId;
            const optionTone = getOptionTone(option);

            return (
              <button
                key={option.id}
                type="button"
                className={`test-answer-option flex h-12 w-full items-center overflow-hidden rounded-[8px] border text-left transition-colors ${getOptionRowClass(optionTone)} ${getOptionBorderResetClass(optionTone)}`}
                aria-pressed={selected}
                aria-disabled={checked}
                onClick={() => {
                  if (checked) return;
                  setSelectedOptionId(option.id);
                }}
              >
                <span
                  className={`flex h-full w-12 shrink-0 items-center justify-center text-[16px] font-medium leading-4 ${getOptionMarkerClass(optionTone)}`}
                >
                  {option.label}
                </span>
                <span className="min-w-0 flex-1 truncate px-4 text-[14px] font-normal leading-[14px] text-[#161519]">
                  {option.text}
                </span>
              </button>
            );
          })}
        </fieldset>

        {checked && (
          <section className="mt-8 rounded-[8px] bg-[#a4e5c7] px-6 py-4">
            <h2 className="text-[12px] font-medium leading-3 text-[#22915d]">
              {t('tests.explanationTitle', { defaultValue: 'Объяснение' })}
            </h2>
            <p className="mt-2 max-w-[280px] text-[14px] font-medium leading-[14px] text-[#1a6140]">
              {activeQuestion.explanation}
            </p>
          </section>
        )}

        <div className="mt-auto pt-8">
          <button
            type="button"
            className={`flex h-12 w-full items-center justify-center rounded-[8px] px-6 text-center text-[16px] font-medium leading-4 transition-colors ${
              checkDisabled
                ? 'bg-[#ded2f1] text-[#a585db]'
                : 'bg-[#6a37c3] text-[#f8f5fc] hover:bg-[#572d9f]'
            }`}
            disabled={checkDisabled}
            onClick={handlePrimaryAction}
          >
            {checked
              ? t('tests.nextQuestionButton', { defaultValue: 'Далее' })
              : t('tests.checkAnswerButton', { defaultValue: 'Проверить' })}
          </button>
        </div>
      </main>
    </div>
  );
}

function ResultStatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[8px] bg-white p-4">
      <p className="text-[12px] font-medium leading-3 text-[#865bcf]">{label}</p>
      <p className="mt-1 text-[16px] font-normal leading-4 text-black">{value}</p>
      <p className="mt-3 text-[12px] font-normal leading-3 text-[#b1acb9]">{description}</p>
    </article>
  );
}
