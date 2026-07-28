import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  HelpCircleIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MobileAppBar, Progress } from '../../../ui';

export type PracticeTopicStatus = 'completed' | 'active' | 'pending';
export type PracticeByTopicState = 'loading' | 'unavailable' | 'ready';

export interface PracticeTopic {
  id: string;
  title: string;
  status: PracticeTopicStatus;
}

export interface PracticeByTopicData {
  state: PracticeByTopicState;
  chapterTitle: string;
  score: number;
  maxScore: number;
  lostPoints: number;
  questionCount: number;
  weightedQuestionCount: number | null;
  completedPercent: number | null;
  topics: PracticeTopic[];
}

export interface PracticeByTopicViewProps {
  data: PracticeByTopicData;
  onBack: () => void;
  onTopicStart: (topic: PracticeTopic) => void;
}

export function PracticeByTopicView({ data, onBack, onTopicStart }: PracticeByTopicViewProps) {
  const { t } = useTranslation();
  const title = data.chapterTitle || t('practiceByTopic.appBarTitle', { defaultValue: 'Практика по разделу' });
  const isReady = data.state === 'ready';

  return (
    <div className="min-h-[var(--mobile-page-available-height,100dvh)] bg-[#efebf6] pb-8 text-[#252329] md:min-h-[calc(100dvh-80px)] md:pt-10">
      <div className="mx-auto w-full max-w-[430px]">
        <MobileAppBar
          title={t('practiceByTopic.appBarTitle', { defaultValue: 'Практика по разделу' })}
          titleAlign="start"
          size="compact"
          compactLayout="leading-only"
          safeArea={false}
          leading={
            <button
              type="button"
              onClick={onBack}
              aria-label={t('practiceByTopic.back', { defaultValue: 'Назад' })}
              className="flex size-6 items-center justify-center text-[#252329] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.8} aria-hidden />
            </button>
          }
          className="mt-16 h-14 min-h-14 px-4 md:mt-0 [&>h1]:!text-[16px] [&>h1]:!leading-4 [&>h2]:!text-[16px] [&>h2]:!leading-4"
        />

        <main className="mt-4 px-6" aria-labelledby="practice-by-topic-title">
          {!isReady ? (
            <section className="flex flex-col gap-2 rounded-[8px] bg-white p-6" role="status" aria-live="polite">
              <h1 id="practice-by-topic-title" className="text-[16px] font-medium leading-4 text-[#161519]">
                {title}
              </h1>
              <p className="text-[14px] font-normal leading-[14px] text-[#8c8698]">
                {t(
                  data.state === 'loading' ? 'practiceByTopic.loading' : 'practiceByTopic.unavailable',
                  {
                    defaultValue:
                      data.state === 'loading'
                        ? 'Загрузка данных для практики'
                        : 'Данные для практики недоступны',
                  },
                )}
              </p>
            </section>
          ) : (
            <section className="flex flex-col gap-4 rounded-[8px] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 id="practice-by-topic-title" className="break-words text-[16px] font-medium leading-[16px] text-[#161519]">
                    {title}
                  </h1>
                  <p className="mt-1 text-[12px] font-normal leading-[12px] text-[#8c8698]">
                    {t('practiceByTopic.scoreSummary', {
                      defaultValue: '{{score}} из {{maxScore}} баллов - {{percentage}}%',
                      score: data.score,
                      maxScore: data.maxScore,
                      percentage: data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0,
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-right text-[12px] font-normal leading-[12px] text-[#bc251a]">
                  {t('practiceByTopic.lostPoints', {
                    defaultValue: 'Потеряно {{count}} балла',
                    count: data.lostPoints,
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-[8px] bg-[#ded2f1] px-3 py-1.5 text-[12px] font-normal leading-[12px] text-[#44237d]">
                  {t('practiceByTopic.questionCount', {
                    defaultValue: '{{count}} вопроса',
                    count: data.questionCount,
                  })}
                </span>
                {data.weightedQuestionCount !== null && data.weightedQuestionCount > 0 && (
                  <WeightedQuestionChip count={data.weightedQuestionCount} />
                )}
              </div>

              {data.completedPercent !== null ? (
                <>
                  <div className="h-px w-full bg-[#f6f5f7]" aria-hidden="true" />
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium leading-[14px] text-[#6a37c3]">
                      {t('practiceByTopic.completed', {
                        defaultValue: '{{percent}}% раздела завершено',
                        percent: data.completedPercent,
                      })}
                    </p>
                    <Progress
                      value={data.completedPercent}
                      aria-label={t('practiceByTopic.progressLabel', { defaultValue: 'Прогресс раздела' })}
                      size="md"
                      trackClassName="!rounded-[8px] !bg-[rgba(106,55,195,0.25)]"
                      indicatorClassName="!rounded-[8px] !bg-[#6a37c3]"
                    />
                  </div>
                </>
              ) : (
                <p className="text-[14px] font-normal leading-[14px] text-[#8c8698]">
                  {t('practiceByTopic.progressUnavailable', { defaultValue: 'Прогресс выполнения пока недоступен' })}
                </p>
              )}
            </section>
          )}

          {isReady && (
            <div className="mt-4 flex flex-col gap-2">
              {data.topics.map((topic) => {
                const isActive = topic.status === 'active';
                const isCompleted = topic.status === 'completed';

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => isActive && onTopicStart(topic)}
                    disabled={!isActive}
                    className={`flex w-full items-center gap-4 rounded-[8px] bg-white px-6 py-4 text-left outline-none ${
                      isCompleted ? 'border border-[#22915d]' : isActive ? 'border border-[#6a37c3]' : 'border border-transparent'
                    } ${isActive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2' : 'cursor-default'}`}
                    aria-label={isActive ? t('practiceByTopic.startTopic', { defaultValue: 'Начать тест по теме {{topic}}', topic: topic.title }) : topic.title}
                  >
                    <HugeiconsIcon
                      icon={isCompleted ? CheckmarkCircle02Icon : isActive ? PlayIcon : CircleIcon}
                      size={24}
                      strokeWidth={1.7}
                      className={isCompleted ? 'shrink-0 text-[#22915d]' : isActive ? 'shrink-0 text-[#6a37c3]' : 'shrink-0 text-[#8c8698]'}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 break-words text-[14px] font-normal leading-[14px] text-[#39363f]">
                      {isActive && (
                        <span className="mb-1 block text-[12px] font-medium leading-[12px] text-[#6a37c3]">
                          {t('practiceByTopic.startHint', { defaultValue: 'Нажмите, чтобы пройти тест' })}
                        </span>
                      )}
                      {topic.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WeightedQuestionChip({ count }: { count: number }) {
  const { t } = useTranslation();
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 24, top: 0, width: 300 });
  const updateTooltipPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = Math.min(300, Math.max(0, window.innerWidth - 48));
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, 24),
      Math.max(24, window.innerWidth - 24 - width),
    );
    setTooltipPosition({ left, top: rect.bottom + 8, width });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateTooltipPosition);
    return () => window.removeEventListener('resize', updateTooltipPosition);
  }, [updateTooltipPosition]);

  return (
    <span className="relative inline-flex max-w-full items-center rounded-[8px] bg-[#ded2f1] px-3 py-1.5 text-[12px] font-normal leading-[12px] text-[#a585db]">
      <button
        type="button"
        ref={buttonRef}
        onMouseEnter={updateTooltipPosition}
        onFocus={updateTooltipPosition}
        aria-describedby={tooltipId}
        aria-label={t('practiceByTopic.weightedQuestionHelpLabel', { defaultValue: 'Подробнее о вопросах на 2 балла' })}
        className="group inline-flex max-w-full items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
      >
        <span className="min-w-0 break-words">
          {t('practiceByTopic.weightedQuestionCount', {
            defaultValue: '{{count}} вопроса на 2 балла',
            count,
          })}
        </span>
        <HugeiconsIcon icon={HelpCircleIcon} size={12} strokeWidth={1.6} aria-hidden />
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-30 rounded-[8px] bg-[#252329] px-3 py-2.5 text-left text-[12px] font-normal leading-[12px] text-white opacity-0 shadow-[0_14px_34px_rgba(58,28,110,0.16)] transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 max-md:shadow-none"
          style={{ left: tooltipPosition.left, top: tooltipPosition.top, width: tooltipPosition.width }}
        >
          {t('practiceByTopic.weightedQuestionTooltip', {
            defaultValue: 'В разделе были вопросы с несколькими вариантами ответов или вопросы с сопоставлением вариантов, которые весят 2 балла.',
          })}
        </span>
      </button>
    </span>
  );
}
