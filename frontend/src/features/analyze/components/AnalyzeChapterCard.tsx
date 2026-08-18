import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import type { AnalyzeChapterResult } from '../../../types';
import { getAnalyzeChapterCardData } from '../model/analyzeChapterCard';

export interface AnalyzeChapterCardProps {
  chapter: AnalyzeChapterResult;
  locked: boolean;
  mode: 'summary' | 'detail';
  selected?: boolean;
  onSelect?: (chapterId: number) => void;
  /** A practice URL supplied only for the selected free chapter by the caller. */
  practiceTo?: string;
}

export function AnalyzeChapterCard({
  chapter,
  locked,
  mode,
  selected = false,
  onSelect,
  practiceTo,
}: AnalyzeChapterCardProps) {
  const { i18n, t } = useTranslation();
  const data = getAnalyzeChapterCardData(chapter, locked);
  const formattedGrades = new Intl.ListFormat(i18n.language.startsWith('kk') ? 'kk' : 'ru', {
    type: 'conjunction',
  }).format(data.materialGrades.map(String));

  if (mode === 'summary') {
    const summaryContent = (
      <>
        <div className="min-w-0 text-left">
          <h3 className="break-words text-[16px] font-medium leading-none text-[#252329]">
            {data.title}
          </h3>
          <p className="mt-1 break-words text-[12px] leading-none text-[#858188]">
            {t('analyze.mobileChapterScoreSummary', {
              score: data.score,
              maxScore: data.maxScore,
              percentage: data.percentage,
            })}
          </p>
        </div>
        <p className="shrink-0 text-right text-[12px] leading-none text-[#dc2626]">
          {t('analyze.mobileChapterLost', { count: data.lostPoints })}
        </p>
      </>
    );

    if (onSelect) {
      return (
        <button
          type="button"
          onClick={() => onSelect(data.chapterId)}
          aria-pressed={selected}
          className={`flex min-w-0 w-full items-start justify-between gap-4 rounded-[8px] bg-[#ffffff] p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6] ${selected ? 'ring-2 ring-[#6a37c3]' : ''}`}
        >
          {summaryContent}
        </button>
      );
    }

    return (
      <article className="flex min-w-0 items-start justify-between gap-4 rounded-[8px] bg-[#ffffff] p-6">
        {summaryContent}
      </article>
    );
  }

  const previewLabelKeys = [
    'analyze.mobileHiddenTopicPreview1',
    'analyze.mobileHiddenTopicPreview2',
    'analyze.mobileHiddenTopicPreview3',
    'analyze.mobileHiddenTopicPreview4',
    'analyze.mobileHiddenTopicPreview5',
    'analyze.mobileHiddenTopicPreview6',
    'analyze.mobileHiddenTopicPreview7',
  ];
  const fakePreviewRows = Array.from(
    { length: data.topicCount },
    (_, previewIndex) => {
      const previewBaseLabel = t(previewLabelKeys[previewIndex % previewLabelKeys.length]);
      const label = previewIndex < previewLabelKeys.length
        ? previewBaseLabel
        : `${previewBaseLabel} ${t('analyze.mobileHiddenTopicPreviewIndex', { index: previewIndex + 1 })}`;

      return { id: `fake-preview-${previewIndex}`, label };
    },
  );

  return (
    <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words text-[16px] font-medium leading-none text-[#252329]">
            {data.title}
          </h3>
          <p className="mt-1 break-words text-[12px] leading-none text-[#858188]">
            {t('analyze.mobileChapterScoreSummary', {
              score: data.score,
              maxScore: data.maxScore,
              percentage: data.percentage,
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-normal text-[12px] leading-none text-[#dc2626]">
            {t('analyze.mobileChapterLost', { count: data.lostPoints })}
          </p>
        </div>
      </div>

      <div className="my-5 h-px bg-[#e9e4ef]" aria-hidden="true" />

      <div className="min-w-0 px-2">
        <h4 className="break-words text-[14px] font-medium leading-none text-[#6a37c3]">
          {t('analyze.mobileTopicsTitle')}
        </h4>
        <p className="mt-1 break-words text-[12px] leading-none text-[#a585db]">
          {data.materialGrades.length > 0
            ? t('analyze.mobileTopicsHelper', { grades: formattedGrades })
            : t('analyze.mobileTopicsFallbackHelper')}
        </p>

        {locked ? (
          <div className="relative mt-4 min-h-[64px] rounded-[8px]" aria-hidden="true">
            <div className="grid gap-2">
              {fakePreviewRows.map((previewRow) => (
                <div key={previewRow.id} className="flex min-h-4 min-w-0 items-center gap-2 blur-[4px] opacity-100" aria-hidden="true">
                  <HugeiconsIcon icon={BookOpen01Icon} size={16} strokeWidth={1.7} className="shrink-0 text-[#6e6779]" aria-hidden="true" />
                  <span className="block min-w-0 w-full flex-1 break-words text-[12px] leading-3 text-[#6e6779]">
                    {previewRow.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <p className="text-[14px] font-medium leading-none text-[#161519]">
                {t('analyze.mobileHiddenTopics', { count: data.topicCount })}
              </p>
              <p className="mt-1 text-[12px] leading-none text-[#6e6779]">
                {t('analyze.mobilePremiumMessage')}
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2">
            {data.topics.length > 0 ? data.topics.map((topic) => (
              <li key={topic.name} className="flex min-w-0 items-center gap-2 text-[12px] leading-3 text-[#858188]">
                <HugeiconsIcon icon={BookOpen01Icon} size={16} strokeWidth={1.7} className="shrink-0 text-[#6e6779]" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words text-[12px] leading-3">{topic.title}</span>
              </li>
            )) : (
              <li className="text-[12px] leading-none text-[#858188]">{t('analyze.mobileNoTopics')}</li>
            )}
          </ul>
        )}
      </div>

      {locked ? (
        <Link
          to="/profile"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] border border-[#6a37c3] px-4 text-[16px] font-medium leading-none text-[#6a37c3] outline-none transition-colors hover:bg-[#f4effb] focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {t('analyze.mobilePremiumCta')}
        </Link>
      ) : practiceTo ? (
        <Link
          to={practiceTo}
          className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-none text-[#ffffff] outline-none transition-colors hover:bg-[#572d9f] focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {t('analyze.mobilePracticeCta')}
        </Link>
      ) : null}
    </article>
  );
}
