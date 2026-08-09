import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  DocumentAttachmentIcon,
  File02Icon,
} from '@hugeicons/core-free-icons';
import {
  ANALYZE_DESKTOP_INSTRUCTIONS,
  ANALYZE_DESKTOP_TRACK_STEPS,
} from '../model/desktopInstructions';

export function AnalyzeDesktopUploadGuide({
  file,
  initialStep = 1,
  onFileChange,
  onSubmit,
  submitting,
}: {
  file: File | null;
  initialStep?: number;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(initialStep);
  const instruction = ANALYZE_DESKTOP_INSTRUCTIONS[activeStep - 1] ?? ANALYZE_DESKTOP_INSTRUCTIONS[0];
  const instructionIndex = instruction.number - 1;

  return (
    <section
      aria-label={t('analyze.desktopGuide.title')}
      data-analyze-desktop-composition
    >
      <div
        className="flex h-[82px] w-[990px] items-center justify-between rounded-[16px] bg-[#ffffff] px-6 py-4"
        data-analyze-desktop-track
      >
        {ANALYZE_DESKTOP_TRACK_STEPS.map((trackStep, index) => (
          <div key={trackStep} className="contents">
            <div
              className={`flex shrink-0 items-center gap-4 ${index === 0 ? 'w-[275px]' : index === 1 ? 'w-[220px]' : 'w-[286px]'}`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#efeaf8] text-[24px] font-medium leading-[24px] text-[#865bcf]">
                {trackStep}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium leading-[16px] text-[#000000]">
                  {t(`analyze.desktopGuide.track.${index}.title`)}
                </span>
                <span className="mt-1 block text-[14px] leading-[14px] text-[#6e6779]">
                  {t(`analyze.desktopGuide.track.${index}.body`)}
                </span>
              </span>
            </div>
            {index < ANALYZE_DESKTOP_TRACK_STEPS.length - 1 && (
              <span className="h-0.5 w-6 shrink-0 rounded-[2px] bg-[#161519]" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-[697px] w-[990px] items-start gap-4" data-analyze-desktop-body>
        <article
          className="flex h-[697px] w-[600px] shrink-0 flex-col rounded-[16px] bg-[#ffffff] px-6 pb-8 pt-6"
          data-analyze-desktop-guide
        >
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[20px] font-medium leading-[20px] text-[#000000]">
                {t('analyze.desktopGuide.title')}
              </h2>
              <span className="flex shrink-0 items-center gap-2 text-[14px] leading-[14px] text-[#8c8698]">
                <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.5} aria-hidden="true" />
                {t('analyze.desktopGuide.duration')}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-[14px] text-[#6e6779]">
              <span className="block">{t('analyze.desktopGuide.descriptionFirst')}</span>
              <span className="block">{t('analyze.desktopGuide.descriptionSecond')}</span>
            </p>
          </div>

          <div className="my-6 h-px w-full shrink-0 bg-[#f6f5f7]" aria-hidden="true" />

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-4" data-analyze-desktop-active-step={instruction.number}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#39363f] text-[20px] font-medium leading-[20px] text-[#ffffff]">
                {instruction.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium leading-[16px] text-[#000000]">
                  {t(`analyze.desktopGuide.steps.${instructionIndex}.title`)}
                </span>
                <span className="mt-2 block text-[14px] leading-[14px] text-[#6e6779]">
                  {t(`analyze.desktopGuide.steps.${instructionIndex}.body`)}
                </span>
              </span>
            </div>

            <div
              className="mt-8 flex h-[400px] w-[552px] shrink-0 flex-col overflow-hidden rounded-[8px]"
              data-analyze-desktop-browser
              data-source-node-id={instruction.sourceNodeId}
            >
              <div className="flex h-[66px] shrink-0 items-center gap-6 rounded-t-[8px] border border-[#eae9ec] px-6 py-4">
                <img
                  src="/figma/analyze-desktop/browser-controls.svg"
                  alt=""
                  width={40}
                  height={8}
                  className="h-2 w-10 shrink-0"
                />
                <span className="flex h-8 min-w-0 flex-1 items-center rounded-[4px] bg-[#eae9ec] px-4 text-[14px] leading-[14px] text-[#6e6779]">
                  app.testcenter.kz
                </span>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-b-[8px] border border-t-0 border-[#eae9ec] bg-[#ffffff] px-8 py-6">
                <img
                  key={instruction.imageSrc}
                  src={instruction.imageSrc}
                  alt={t(`analyze.desktopGuide.steps.${instructionIndex}.imageAlt`)}
                  width={instruction.imageWidth}
                  height={instruction.imageHeight}
                  className="max-h-full max-w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex h-10 shrink-0 items-center justify-between">
            {instruction.number === 1 ? (
              <a
                href={instruction.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center rounded-[8px] bg-[#39363f] px-6 text-[16px] font-medium leading-[16px] text-[#ffffff]"
              >
                {t('analyze.desktopGuide.openTestcenter')}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep((step) => Math.max(1, step - 1))}
                className="flex h-10 items-center gap-2.5 rounded-[8px] text-[16px] font-medium leading-[16px] text-[#39363f]"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
                {t('analyze.desktopGuide.previous')}
              </button>
            )}

            {instruction.number < ANALYZE_DESKTOP_INSTRUCTIONS.length && (
              <button
                type="button"
                onClick={() => setActiveStep((step) => Math.min(ANALYZE_DESKTOP_INSTRUCTIONS.length, step + 1))}
                className="flex h-10 items-center gap-2.5 rounded-[8px] text-[16px] font-medium leading-[16px] text-[#39363f]"
              >
                {t('analyze.desktopGuide.next')}
                <HugeiconsIcon icon={ArrowRight01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
        </article>

        <div className="flex h-[697px] w-[374px] shrink-0 flex-col gap-4">
          <form
            className="flex h-[421px] w-full shrink-0 flex-col rounded-[16px] bg-[#ffffff] px-6 pb-8 pt-6"
            onSubmit={onSubmit}
            data-analyze-desktop-upload
          >
            <div>
              <h2 className="w-fit whitespace-nowrap text-[20px] font-medium leading-[20px] text-[#000000]" data-analyze-desktop-upload-title>
                {t('analyze.desktopGuide.uploadTitle')}
              </h2>
              <p className="mt-2 h-7 break-words text-[14px] leading-[14px] text-[#6e6779]" data-analyze-desktop-upload-description>
                {t('analyze.desktopGuide.uploadBodyFirst')} {t('analyze.desktopGuide.uploadBodySecond')}
              </p>
            </div>
            <div className="my-6 h-px w-full shrink-0 bg-[#f6f5f7]" aria-hidden="true" data-analyze-desktop-upload-divider />
            <label
              htmlFor="analyze-file-desktop"
              className={`flex h-[196px] w-[326px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed bg-[#f8f5fc] p-4 text-center ${file ? 'border-[#6a37c3]' : 'border-[#c5b1e7]'}`}
              data-analyze-desktop-dropzone
            >
              <input
                id="analyze-file-desktop"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={submitting}
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="flex h-[98px] w-56 flex-col items-center gap-4" data-analyze-desktop-selected>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#6a37c3] text-[#ffffff]" data-analyze-desktop-selected-icon>
                    <HugeiconsIcon icon={File02Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="flex h-[34px] w-56 flex-col items-center gap-2 text-center" data-analyze-desktop-selected-text>
                    <span className="w-full truncate text-[14px] font-medium leading-[14px] text-[#161519]" data-analyze-desktop-selected-filename>
                      {file.name}
                    </span>
                    <span className="w-[215px] whitespace-nowrap text-[12px] leading-[12px] text-[#6e6779]" data-analyze-desktop-selected-helper>
                      {t('analyze.selectedFileHint')}
                    </span>
                  </span>
                </span>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-full bg-[#ffffff] text-[#6a37c3]">
                    <HugeiconsIcon icon={DocumentAttachmentIcon} size={24} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-[14px] font-medium leading-[14px] text-[#161519]">
                    {t('analyze.uploadHint')}
                  </span>
                  <span className="mt-2 text-[12px] leading-[12px] text-[#6e6779]">
                    {t('analyze.desktopGuide.uploadHint')}
                  </span>
                </>
              )}
            </label>
            <button
              type="submit"
              disabled={!file || submitting}
              className={`mt-6 flex h-10 w-[326px] shrink-0 items-center justify-center rounded-[8px] px-6 text-[16px] font-medium leading-[16px] ${file && !submitting ? 'bg-[#6a37c3] text-[#ffffff]' : 'bg-[#efeaf8] text-[#c5b1e7] disabled:cursor-not-allowed'}`}
              data-analyze-desktop-submit
            >
              {t('analyze.submit')} →
            </button>
          </form>

          <section
            className="h-[260px] w-full rounded-[16px] bg-[#ffffff] px-6 pb-8 pt-6"
            data-analyze-desktop-benefits
          >
            <h2 className="text-[20px] font-medium leading-[20px] text-[#000000]">
              {t('analyze.desktopGuide.benefitsTitle')}
            </h2>
            <div className="mt-6 grid gap-6 px-2">
              {[0, 1].map((benefitIndex) => (
                <article key={benefitIndex}>
                  <h3 className="text-[16px] font-normal leading-[16px] text-[#000000]">
                    {t(`analyze.desktopGuide.benefits.${benefitIndex}.title`)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[14px] text-[#b1acb9]">
                    <span className="block">{t(`analyze.desktopGuide.benefits.${benefitIndex}.bodyFirst`)}</span>
                    <span className="block">{t(`analyze.desktopGuide.benefits.${benefitIndex}.bodySecond`)}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
