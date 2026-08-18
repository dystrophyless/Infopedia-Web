import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  DocumentAttachmentIcon,
  File02Icon,
  UserAiIcon,
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
  const uploadHint = t('analyze.uploadDropHint');
  const uploadHintMatch = uploadHint.match(/^(.*\s)(\S+)$/);

  return (
    <section
      aria-label={t('analyze.desktopGuide.title')}
      className="mx-auto w-full max-md:px-6 max-[359px]:px-4 md:w-full min-[1440px]:w-[990px]"
      data-analyze-adaptive-upload
      data-analyze-desktop-composition
    >
      <div
        className="hidden min-h-[82px] w-full items-center justify-between gap-3 rounded-[16px] bg-[#ffffff] px-6 py-4 md:flex min-[1440px]:h-[82px] min-[1440px]:w-[990px]"
        data-analyze-desktop-track
      >
        {ANALYZE_DESKTOP_TRACK_STEPS.map((trackStep, index) => (
          <div key={trackStep} className="contents">
            <div
              className={`flex min-w-0 flex-1 items-center gap-3 min-[1440px]:shrink-0 min-[1440px]:flex-none min-[1440px]:gap-4 ${index === 0 ? 'min-[1440px]:w-[275px]' : index === 1 ? 'min-[1440px]:w-[220px]' : 'min-[1440px]:w-[286px]'}`}
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

      <div className="md:mt-4 md:flex md:w-full md:flex-col md:gap-4 min-[1440px]:h-[697px] min-[1440px]:w-[990px] min-[1440px]:flex-row" data-analyze-desktop-body>
        <article
          id="analyze-upload-tutorial"
          className="hidden w-full flex-col rounded-[16px] bg-[#ffffff] px-6 pb-8 pt-6 md:flex min-[1440px]:h-[697px] min-[1440px]:w-[600px] min-[1440px]:shrink-0"
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
              className="mt-8 flex h-[400px] w-full shrink-0 flex-col overflow-hidden rounded-[8px] min-[1440px]:w-[552px]"
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

          <div className="mt-6 flex min-h-10 shrink-0 items-center justify-between">
            {instruction.number === 1 ? (
              <a
                href={instruction.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-center rounded-[8px] bg-[#39363f] px-6 text-[16px] font-medium leading-[16px] text-[#ffffff] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 min-[1440px]:h-10 min-[1440px]:min-h-10"
              >
                {t('analyze.desktopGuide.openTestcenter')}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep((step) => Math.max(1, step - 1))}
                className="flex min-h-11 items-center gap-2.5 rounded-[8px] text-[16px] font-medium leading-[16px] text-[#39363f] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 min-[1440px]:h-10 min-[1440px]:min-h-10"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
                {t('analyze.desktopGuide.previous')}
              </button>
            )}

            {instruction.number < ANALYZE_DESKTOP_INSTRUCTIONS.length && (
              <button
                type="button"
                onClick={() => setActiveStep((step) => Math.min(ANALYZE_DESKTOP_INSTRUCTIONS.length, step + 1))}
                className="flex min-h-11 items-center gap-2.5 rounded-[8px] text-[16px] font-medium leading-[16px] text-[#39363f] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 min-[1440px]:h-10 min-[1440px]:min-h-10"
              >
                {t('analyze.desktopGuide.next')}
                <HugeiconsIcon icon={ArrowRight01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
        </article>

        <div className="w-full md:grid md:grid-cols-2 md:gap-4 min-[1440px]:flex min-[1440px]:h-[697px] min-[1440px]:w-[374px] min-[1440px]:shrink-0 min-[1440px]:grid-cols-none min-[1440px]:flex-col">
          <form
            className="flex w-full flex-col bg-transparent pt-8 md:rounded-[16px] md:bg-[#ffffff] md:px-6 md:pb-8 md:pt-6 min-[1440px]:h-[421px] min-[1440px]:shrink-0"
            onSubmit={onSubmit}
            aria-busy={submitting}
            data-analyze-desktop-upload
          >
            <p className="mb-6 text-[20px] font-medium leading-none text-[#572d9f] md:hidden">{t('analyze.uploadTitle')}</p>
            <div className="hidden md:block">
              <h2 className="w-fit whitespace-nowrap text-[20px] font-medium leading-[20px] text-[#000000]" data-analyze-desktop-upload-title>
                {t('analyze.desktopGuide.uploadTitle')}
              </h2>
              <p className="mt-2 h-7 break-words text-[14px] leading-[14px] text-[#6e6779]" data-analyze-desktop-upload-description>
                {t('analyze.desktopGuide.uploadBodyFirst')} {t('analyze.desktopGuide.uploadBodySecond')}
              </p>
            </div>
            <div className="my-6 hidden h-px w-full shrink-0 bg-[#f6f5f7] md:block" aria-hidden="true" data-analyze-desktop-upload-divider />
            <label
              htmlFor="analyze-file"
              className={`group flex h-[214px] w-full shrink-0 cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed bg-[#ffffff] px-12 py-12 text-center outline-none focus-within:ring-2 focus-within:ring-[#6a37c3] focus-within:ring-offset-2 md:h-[196px] md:border md:bg-[#f8f5fc] md:p-4 min-[1440px]:w-[326px] ${file ? 'border-[#6a37c3]' : 'border-[#a585db] md:border-[#c5b1e7]'}`}
              data-analyze-desktop-dropzone
            >
              <input
                id="analyze-file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={submitting}
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="flex min-w-0 flex-col items-center md:h-[98px] md:w-56 md:gap-4" data-analyze-desktop-selected>
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#6a37c3] text-[#ffffff] md:size-12" data-analyze-desktop-selected-icon>
                    <HugeiconsIcon icon={DocumentAttachmentIcon} size={32} strokeWidth={1.5} className="md:hidden" aria-hidden="true" />
                    <HugeiconsIcon icon={File02Icon} size={24} strokeWidth={1.5} className="hidden md:block" aria-hidden="true" />
                  </span>
                  <span className="mt-4 flex min-w-0 max-w-full flex-col items-center text-center md:mt-0 md:h-[34px] md:w-56 md:gap-2" data-analyze-desktop-selected-text>
                    <span className="max-w-full truncate text-[16px] font-medium leading-[16px] text-[#161519] md:w-full md:text-[14px] md:leading-[14px]" data-analyze-desktop-selected-filename>
                      {file.name}
                    </span>
                    <span className="mt-2 max-w-full text-[14px] leading-[14px] text-[#a585db] md:mt-0 md:w-[215px] md:whitespace-nowrap md:text-[12px] md:leading-[12px] md:text-[#6e6779]" data-analyze-desktop-selected-helper>
                      {t('analyze.selectedFileHint')}
                    </span>
                  </span>
                </span>
              ) : (
                <>
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#ded2f1] text-[#572d9f] md:size-12 md:bg-[#ffffff] md:text-[#6a37c3]">
                    <HugeiconsIcon icon={File02Icon} size={32} strokeWidth={1.5} className="md:hidden" aria-hidden="true" />
                    <HugeiconsIcon icon={DocumentAttachmentIcon} size={24} strokeWidth={1.5} className="hidden md:block" aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-[16px] font-medium leading-[16px] text-[#161519] md:text-[14px] md:leading-[14px]">
                    {t('analyze.uploadHint')}
                  </span>
                  <span className="mt-2 text-[14px] leading-[14px] text-[#a585db] md:text-[12px] md:leading-[12px] md:text-[#6e6779]">
                    <span className="md:hidden">
                      {uploadHintMatch?.[1] ?? uploadHint}{uploadHintMatch && (
                        <a
                          href="https://app.testcenter.kz"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[4px] text-[#6a37c3] underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#6a37c3]"
                        >
                          {uploadHintMatch[2]}
                        </a>
                      )}
                    </span>
                    <span className="hidden md:inline">{t('analyze.desktopGuide.uploadHint')}</span>
                  </span>
                </>
              )}
            </label>
            <button
              type="submit"
              disabled={!file || submitting}
              className={`mt-6 flex h-12 w-full shrink-0 items-center justify-center rounded-[8px] px-6 text-[16px] font-medium leading-[16px] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 md:h-10 min-[1440px]:w-[326px] ${file && !submitting ? 'bg-[#6a37c3] text-[#ffffff]' : 'bg-[#ded2f1] text-[#a585db] disabled:cursor-not-allowed md:bg-[#efeaf8] md:text-[#c5b1e7]'}`}
              data-analyze-desktop-submit
            >
              {submitting ? t('common.loading') : `${t('analyze.submit')} →`}
            </button>
          </form>

          <DesktopBenefits />
        </div>
      </div>

      <MobileBenefits />
    </section>
  );
}

function DesktopBenefits() {
  const { t } = useTranslation();

  return (
    <section
      className="hidden w-full rounded-[16px] bg-[#ffffff] px-6 pb-8 pt-6 md:block min-[1440px]:h-[260px]"
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
  );
}

function MobileBenefits() {
  const { t } = useTranslation();

  return (
    <section className="mt-12 pb-8 md:hidden" data-analyze-mobile-benefits>
      <h2 className="text-[20px] font-medium leading-none text-[#572d9f]">
        {t('analyze.benefitsTitle')}
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 min-[360px]:gap-2">
        <MobileBenefitCard eyebrow={t('analyze.benefitWeakEyebrow')} title={t('analyze.benefitWeakTitle')} body={t('analyze.benefitWeakBody')} />
        <MobileBenefitCard eyebrow={t('analyze.benefitBooksEyebrow')} title={t('analyze.benefitBooksTitle')} body={t('analyze.benefitBooksBody')} />
        <MobileBenefitCard featured eyebrow={t('analyze.benefitPersonalEyebrow')} title={t('analyze.benefitPersonalTitle')} body={t('analyze.benefitPersonalBody')} />
      </div>
    </section>
  );
}

function MobileBenefitCard({
  featured = false,
  eyebrow,
  title,
  body,
}: {
  featured?: boolean;
  eyebrow: string;
  title: string;
  body: string;
}) {
  const content = (
    <div>
      <p className="text-[12px] font-medium leading-3 text-[#865bcf]">{eyebrow}</p>
      <h3 className="mt-1 text-[16px] font-normal leading-4 text-[#161519]">{title}</h3>
      <p className="mt-2 text-[12px] leading-3 text-[#b1acb9]">{body}</p>
    </div>
  );

  if (featured) {
    return (
      <article className="flex min-h-[96px] items-center gap-6 rounded-[8px] bg-[#ffffff] px-6 py-4 max-[359px]:gap-4 max-[359px]:px-4 min-[360px]:col-span-2">
        <HugeiconsIcon icon={UserAiIcon} size={32} strokeWidth={1.5} className="shrink-0 text-[#6a37c3]" aria-hidden="true" />
        {content}
      </article>
    );
  }

  return <article className="min-h-[96px] rounded-[8px] bg-[#ffffff] p-4 min-[360px]:px-6">{content}</article>;
}
