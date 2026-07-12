import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Button, MobileAppBar, Progress, StatCard } from '../../../ui';
import { formatAverageSeconds, formatDuration, type WeakTopicResult } from '../model';
import { WeakTopicRecommendation } from './WeakTopicRecommendation';

export interface TestResultViewProps {
  title: string;
  correctAnswerCount: number;
  totalQuestions: number;
  scorePercent: number;
  durationSeconds: number;
  averagePaceSeconds: number;
  weakTopicResult: WeakTopicResult | null;
  onBack: () => void;
  onRestart: () => void;
}

export function TestResultView({
  title,
  correctAnswerCount,
  totalQuestions,
  scorePercent,
  durationSeconds,
  averagePaceSeconds,
  weakTopicResult,
  onBack,
  onRestart,
}: TestResultViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 md:flex md:justify-center max-md:min-h-[calc(100dvh-88px-env(safe-area-inset-bottom,0px))] max-md:px-6 max-md:pb-12 max-md:pt-[calc(64px+env(safe-area-inset-top,0px))]">
      <main className="mx-auto flex w-full max-w-[382px] flex-col md:min-h-[720px] max-md:min-h-[calc(100dvh-200px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]">
        <MobileAppBar
          title={title}
          titleAlign="start"
          safeArea={false}
          className="h-10 min-h-10 p-0 text-[#252329]"
          leading={(
            <button type="button" className="flex size-6 items-center justify-center text-[#252329]" aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })} onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
          )}
        />

        <h2 className="mt-8 text-[20px] font-medium leading-5 text-[#572d9f]">
          {t('tests.resultTitle', { defaultValue: 'Результаты' })}
        </h2>

        <section className="mt-8 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc]">
          <p className="text-[12px] font-medium leading-3 text-[#f8f5fc]">
            {t('tests.resultCardTitle', { defaultValue: 'Результат теста' })}
          </p>
          <div className="mt-2 flex items-start gap-2 text-white">
            <p className="text-[32px] font-medium leading-8">{correctAnswerCount}/{totalQuestions}</p>
            <p className="pt-2 text-[16px] font-medium leading-4">
              {t('tests.correctAnswersLabel', { defaultValue: 'правильных ответов' })}
            </p>
          </div>
          <Progress
            value={scorePercent}
            aria-label={t('tests.resultCardTitle', { defaultValue: 'Результат теста' })}
            className="mt-4 bg-[rgba(248,245,252,0.25)] [&>span]:bg-[#f8f5fc]"
          />
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatCard
            label={t('tests.resultTimeLabel', { defaultValue: 'Время' })}
            value={formatDuration(durationSeconds)}
            description={t('tests.resultTimeDescription', { defaultValue: 'потрачено что бы закончить тест' })}
            className="gap-0 rounded-[8px] border-0 bg-white p-4 [&_span]:text-[#6a37c3] [&_p]:text-[#6b6573]"
          />
          <StatCard
            label={t('tests.resultPaceLabel', { defaultValue: 'Ваш темп' })}
            value={formatAverageSeconds(averagePaceSeconds)}
            description={t('tests.resultPaceDescription', { defaultValue: 'в среднем потрачено на один вопрос' })}
            className="gap-0 rounded-[8px] border-0 bg-white p-4 [&_span]:text-[#6a37c3] [&_p]:text-[#6b6573]"
          />
        </div>

        <h2 className="mt-12 text-[20px] font-medium leading-5 text-[#572d9f]">
          {t('tests.repeatTitle', { defaultValue: 'Повторите' })}
        </h2>
        {weakTopicResult && <WeakTopicRecommendation weakTopic={weakTopicResult} />}

        <div className="mt-auto pt-8">
          <Button fullWidth size="lg" className="h-12 rounded-[8px] bg-[#6a37c3] px-6 text-[16px] leading-4 text-[#f8f5fc] hover:bg-[#572d9f]" onClick={onRestart}>
            {t('tests.retryTestButton', { defaultValue: 'Попробовать ещё' })}
          </Button>
        </div>
      </main>
    </div>
  );
}
