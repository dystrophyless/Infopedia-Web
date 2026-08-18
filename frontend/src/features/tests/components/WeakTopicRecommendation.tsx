import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon, RepeatIcon } from '@hugeicons/core-free-icons';
import type { WeakTopicResult } from '../model';

export interface WeakTopicRecommendationProps {
  weakTopic: WeakTopicResult;
}

export function WeakTopicRecommendation({ weakTopic }: WeakTopicRecommendationProps) {
  const { t } = useTranslation();

  return (
    <>
      <section className="mt-6 flex items-center gap-6 rounded-[8px] bg-white px-6 py-4">
        <HugeiconsIcon icon={RepeatIcon} size={24} strokeWidth={1.7} className="shrink-0 text-[#6a37c3]" aria-hidden />
        <div className="min-w-0">
          <p className="text-[12px] font-medium leading-3 text-[#6a37c3]">
            {t('tests.weakTopicLabel', { defaultValue: 'Слабая тема' })}
          </p>
          <p className="mt-1 truncate text-[16px] font-normal leading-4 text-[#161519]">
            {weakTopic.topicTitle}
          </p>
          <p className="mt-2 text-[12px] font-normal leading-3 text-[#6b6573]">
            {t('tests.weakTopicMistakesDynamic', {
              count: weakTopic.mistakeCount,
              defaultValue: '{{count}} ошибки по этому разделу',
            })}
          </p>
        </div>
      </section>

      <button type="button" className="mt-2 flex w-full items-center gap-6 rounded-[8px] bg-white px-6 py-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium leading-4 text-[#6a37c3]">
            {t('tests.sectionRetakeTitle', { defaultValue: 'Тест по этому разделу' })}
          </span>
          <span className="mt-2 block text-[14px] font-normal leading-[14px] text-[#524d5b]">
            {t('tests.sectionRetakeDynamicDescription', {
              count: weakTopic.questionCount,
              minutes: weakTopic.estimatedMinutes,
              defaultValue: '{{count}} вопросов, {{minutes}} минут',
            })}
          </span>
        </span>
        <HugeiconsIcon icon={ArrowRight02Icon} size={24} strokeWidth={1.8} className="shrink-0 text-[#6a37c3]" aria-hidden />
      </button>
    </>
  );
}
