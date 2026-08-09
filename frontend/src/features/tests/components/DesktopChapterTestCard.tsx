import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  formatDelta,
  formatPercent,
  getChapterMetricVisibility,
  getAccuracyTone,
  getDeltaTone,
  isChapterLaunchAvailable,
  type TestsDashboardChapter,
} from '../model';

export interface DesktopChapterTestCardProps {
  chapter: TestsDashboardChapter;
  accuracyHint: string;
  noDataHint: string;
  deltaHint: string;
  noDataLabel: string;
  questionLabel: (count: number) => string;
}

const accuracyToneClasses = {
  positive: 'bg-[#a4e5c7] text-[#22915d]',
  accent: 'bg-[#c5b1e7] text-[#572d9f]',
  negative: 'bg-[#f69a93] text-[#9a2219]',
  neutral: 'bg-[#f8f5fc] text-[#8c8698]',
} as const;

const deltaToneClasses = {
  positive: 'text-[#6ed8a7]',
  negative: 'text-[#f25f54]',
  neutral: 'text-[#8c8698]',
} as const;

function MetricHint({ children, hint, className, metric, dataNoData }: { children: ReactNode; hint: string; className: string; metric?: 'accuracy' | 'delta'; dataNoData?: boolean }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="group relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`inline-flex items-center rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3] ${className}`}
        aria-describedby={tooltipId}
        {...(metric ? { 'data-chapter-metric': metric } : {})}
        {...(dataNoData ? { 'data-chapter-no-data': true } : {})}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-[8px] bg-[#252329] px-3 py-2 text-[12px] font-normal leading-3 text-white opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ opacity: open ? 1 : 0 }}
      >
        {hint}
      </span>
    </span>
  );
}

function ChapterContent({ chapter, questionLabel }: { chapter: TestsDashboardChapter; questionLabel: (count: number) => string }) {
  return (
    <>
      <span data-chapter-title className="w-full pr-2 text-[16px] font-medium leading-4 text-[#161519]">{chapter.title}</span>
      <span data-chapter-question-count className="mt-auto w-full text-[14px] font-normal leading-[14px] text-[#6e6779]">{questionLabel(chapter.questionCount)}</span>
    </>
  );
}

export function DesktopChapterTestCard({
  chapter,
  accuracyHint,
  noDataHint,
  deltaHint,
  noDataLabel,
  questionLabel,
}: DesktopChapterTestCardProps) {
  const accuracyTone = getAccuracyTone(chapter.accuracy);
  const deltaTone = getDeltaTone(chapter.deltaPoints);
  const metricVisibility = getChapterMetricVisibility(
    chapter.completedAttemptCount,
    chapter.accuracy,
    chapter.deltaPoints,
  );
  const available = isChapterLaunchAvailable(chapter);
  const cardClassName = `flex h-[196px] min-w-0 flex-col gap-6 rounded-[16px] bg-white p-6 text-left ${available ? 'transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-within:-translate-y-0.5' : ''}`;
  return (
    <article
      className={cardClassName}
      aria-disabled={available ? undefined : 'true'}
      data-chapter-card
      data-chapter-ref={chapter.chapterRef}
      data-chapter-available={available ? 'true' : 'false'}
    >
      <div className="flex w-full items-center justify-between">
        {metricVisibility.showNoData ? (
          <MetricHint
            hint={noDataHint}
            dataNoData
            className="bg-[#f8f5fc] px-4 py-1 text-[14px] font-medium leading-[14px] text-[#a585db]"
          >
            {noDataLabel}
          </MetricHint>
        ) : metricVisibility.showAccuracy ? <MetricHint
          hint={accuracyHint}
          metric="accuracy"
          className={`px-4 py-1 text-[14px] font-medium leading-[14px] ${accuracyToneClasses[accuracyTone]}`}
        >
          <span data-chapter-accuracy-value>{formatPercent(chapter.accuracy)}</span>
        </MetricHint> : null}
        {metricVisibility.showDelta ? <MetricHint
          metric="delta"
          hint={deltaHint}
          className={`gap-1.5 text-[12px] font-medium leading-[12px] ${deltaToneClasses[deltaTone]}`}
        >
          {chapter.deltaPoints === 0 ? null : (
            <span
              className={`block size-[20px] shrink-0 bg-current [mask-image:url('/figma/tests/trending-up.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%] [-webkit-mask-image:url('/figma/tests/trending-up.svg')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:100%_100%] ${chapter.deltaPoints !== null && chapter.deltaPoints > 0 ? '-scale-x-100' : ''}`}
              data-chapter-delta-icon
              aria-hidden="true"
            />
          )}
          <span data-chapter-delta-value>{formatDelta(chapter.deltaPoints)}</span>
        </MetricHint> : null}
      </div>
      {available ? (
        <Link
          to={`/tests/chapter?chapterRef=${encodeURIComponent(chapter.chapterRef)}`}
          className="flex h-[102px] w-full flex-col items-start rounded-[8px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
          data-chapter-content
          data-chapter-navigation
        >
          <ChapterContent chapter={chapter} questionLabel={questionLabel} />
        </Link>
      ) : (
        <div
          className="flex h-[102px] w-full flex-col items-start"
          data-chapter-content
          data-chapter-navigation="unavailable"
        >
          <ChapterContent chapter={chapter} questionLabel={questionLabel} />
        </div>
      )}
    </article>
  );
}
