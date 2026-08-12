import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  DocumentAttachmentIcon,
  File02Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import { MobilePageFrame } from '../../../ui';
import {
  getAnalyzeDesktopProgressSteps,
  type AnalyzeProgressSnapshot,
  type AnalyzeDesktopProgressStepState,
} from '../model/desktopProgress';

interface DesktopProgressStepTranslation {
  label: string;
  done: string;
  current: string;
  next: string;
}

export function AnalyzeDesktopProgress({
  progressSnapshot,
  file,
  onBack,
  sourceReferenceFillOverride,
}: {
  progressSnapshot: AnalyzeProgressSnapshot;
  file?: File | null;
  onBack?: () => void;
  sourceReferenceFillOverride?: number;
}) {
  const { t } = useTranslation();
  const steps = t('analyze.desktopProgress.steps', { returnObjects: true }) as DesktopProgressStepTranslation[];
  const stepStates = getAnalyzeDesktopProgressSteps(progressSnapshot);
  const clampedProgress = clampPercent(progressSnapshot.percent);
  const fillPercent = clampPercent(sourceReferenceFillOverride ?? clampedProgress);
  const mobileProgressCaption =
    t('analyze.mobileProgressCaption') === 'analyze.mobileProgressCaption'
      ? t('analyze.stages.parsing')
      : t('analyze.mobileProgressCaption');

  const desktopContent = (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-analyze-desktop-progress
      data-figma-node="970:4512"
      className="flex h-[573px] w-[640px] shrink-0 flex-col gap-6 rounded-[16px] bg-white p-12"
    >
      <div data-analyze-desktop-progress-main className="flex h-[392px] w-full shrink-0 flex-col gap-8">
        <div className="flex w-full shrink-0 flex-col gap-8">
          <div className="flex w-full flex-col gap-4">
            <div className="flex h-6 w-full items-start justify-between gap-4 whitespace-nowrap">
              <h2
                data-analyze-desktop-progress-title
                className="text-[24px] font-medium leading-6 text-[#161519]"
              >
                {t('analyze.desktopProgress.title')}
              </h2>
              <span
                data-analyze-desktop-progress-percent
                className="shrink-0 text-[24px] font-medium leading-6 text-[#6a37c3]"
              >
                {t('analyze.progressPercent', { percent: clampedProgress })}
              </span>
            </div>
            <p
              data-analyze-desktop-progress-description
              className="w-[386px] text-[16px] font-normal leading-4 text-[#6e6779]"
            >
              {t('analyze.desktopProgress.description')}
            </p>
          </div>

          <div
            role="progressbar"
            aria-label={t('analyze.desktopProgress.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampedProgress}
            aria-valuetext={t('analyze.progressPercent', { percent: clampedProgress })}
            data-analyze-desktop-progress-track
            className="h-2 w-full overflow-hidden rounded-[8px] bg-[rgba(106,55,195,0.25)]"
          >
            <div
              data-analyze-desktop-progress-fill
              className="h-full rounded-[8px] bg-[#6a37c3]"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <ol data-analyze-desktop-progress-steps className="flex h-[248px] w-full flex-col gap-2">
          {steps.map((step, index) => (
            <AnalyzeDesktopProgressStep
              key={step.label}
              step={step}
              state={stepStates[index] ?? 'next'}
              index={index}
            />
          ))}
        </ol>
      </div>

      <div data-analyze-desktop-progress-divider className="h-px w-full shrink-0 bg-[#f8f5fc]" />

      <div data-analyze-desktop-progress-file className="flex h-9 w-full shrink-0 items-center gap-6">
        <HugeiconsIcon
          icon={File02Icon}
          size={32}
          strokeWidth={1.5}
          aria-hidden="true"
          className="size-8 shrink-0 text-[#6a37c3]"
        />
        <div className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <p className="text-[14px] font-medium leading-[14px] text-[#865bcf]">
              {t('analyze.desktopProgress.fileLabel')}
            </p>
            <p data-analyze-desktop-progress-filename className="max-w-full truncate text-[18px] leading-[18px] text-[#161519]">
              {file?.name ?? t('analyze.desktopProgress.fileFallback')}
            </p>
          </div>
          {file && (
            <p data-analyze-desktop-progress-filesize className="shrink-0 text-[14px] leading-[14px] text-[#b1acb9]">
              {formatAnalyzeDesktopFileSize(file.size)}
            </p>
          )}
        </div>
      </div>
    </section>
  );

  const mobileContent = (
    <section data-analyze-mobile-progress>
      <div className="w-full rounded-[8px] bg-[#ffffff] p-8">
        <div
          className="relative mx-auto flex size-36 items-center justify-center rounded-full p-[8px]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clampedProgress}
          aria-valuetext={t('analyze.progressPercent', { percent: clampedProgress })}
          aria-label={t('analyze.progressTitle')}
        >
          <svg
            className="pointer-events-none absolute inset-0 size-full -rotate-90"
            viewBox="0 0 144 144"
            aria-hidden="true"
          >
            <circle cx="72" cy="72" r="68" fill="none" stroke="#ded2f1" strokeWidth="8" />
            {clampedProgress > 0 && (
              <circle
                cx="72"
                cy="72"
                r="68"
                fill="none"
                stroke="#6a37c3"
                strokeWidth="8"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={clampedProgress >= 100 ? '100' : `${clampedProgress} 100`}
              />
            )}
          </svg>
          <div className="flex size-full items-center justify-center rounded-full bg-[#ffffff]">
            <span className="text-[32px] font-medium leading-none text-[#000000]">{clampedProgress}%</span>
          </div>
        </div>
        <p className="mt-6 text-center text-[16px] leading-none text-[#524d5b]">
          {mobileProgressCaption}
        </p>
      </div>

      {file && (
        <div className="mt-3 flex w-full items-center gap-6 rounded-[8px] bg-[#ffffff] px-6 py-4">
          <HugeiconsIcon icon={DocumentAttachmentIcon} size={32} strokeWidth={1.5} className="shrink-0 text-[#6a37c3]" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium leading-3 text-[#865bcf]">{t('analyze.fileEyebrow')}</p>
            <p className="mt-1 truncate text-[16px] leading-4 text-[#161519]">{file.name}</p>
            <p className="mt-2 text-[12px] leading-3 text-[#b1acb9]">{formatAnalyzeFileSize(file.size)}</p>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <>
      <div className="hidden h-full w-full items-center justify-center md:flex">
        {desktopContent}
      </div>
      {onBack ? (
        <MobilePageFrame
          className="md:hidden"
          appBar={{
            title: t('analyze.mobileResultTitle'),
            headingLevel: 2,
            titleAlign: 'start',
            compactLayout: 'leading-only',
            tone: 'canvas',
            leading: (
              <button
                type="button"
                onClick={onBack}
                aria-label={t('analyze.mobileResultBack')}
                className="rounded-[8px] text-[#252329] outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} aria-hidden="true" />
              </button>
            ),
          }}
        >
          {mobileContent}
        </MobilePageFrame>
      ) : (
        <div className="md:hidden">{mobileContent}</div>
      )}
    </>
  );
}

function AnalyzeDesktopProgressStep({
  step,
  state,
  index,
}: {
  step: DesktopProgressStepTranslation;
  state: AnalyzeDesktopProgressStepState;
  index: number;
}) {
  const status = step[state];
  const isDone = state === 'done';
  const isCurrent = state === 'current';

  return (
    <li
      data-analyze-desktop-progress-step={index + 1}
      data-step-state={state}
      className={`flex h-14 w-full shrink-0 items-center justify-between p-4 ${isCurrent ? 'rounded-[8px] bg-[#f8f5fc]' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
            isDone
              ? 'bg-[#6a37c3] text-white'
              : isCurrent
                ? 'border border-[#c5b1e7]'
                : 'border border-[#efeaf8]'
          }`}
        >
          {isDone && <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />}
        </span>
        <span className={`truncate text-[18px] leading-[18px] ${state === 'next' ? 'text-[#6e6779]' : 'text-[#161519]'}`}>
          {step.label}
        </span>
      </div>
      <span
        className={`shrink-0 text-[16px] leading-4 ${
          isCurrent
            ? 'font-medium text-[#6a37c3]'
            : isDone
              ? 'text-[#8c8698]'
              : 'text-[#b1acb9]'
        }`}
      >
        {status}
      </span>
    </li>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatAnalyzeDesktopFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatAnalyzeFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
