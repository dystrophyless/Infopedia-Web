import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  DocumentAttachmentIcon,
  StarIcon,
  UserAiIcon,
} from '@hugeicons/core-free-icons';
import {
  buildAnalyzeSseUrl,
  createAnalyzeTask,
  getAnalyzeTask,
  getLatestAnalyzeResult,
} from '../api/analyze';
import { useSSE } from '../hooks/useSSE';
import { getApiErrorMessage, getTaskErrorMessage } from '../utils/apiError';
import { clampScorePercent, getScoreStatus } from '../utils/scoreStatus';
import type { AnalyzeBookCoverage, AnalyzeChapterResult, AnalyzeTask } from '../types';
import { selectAnalyzeResultAccess, type AnalyzeResultAccess } from '../features/analyze/model/resultAccess';
import {
  Button,
  EmptyState,
  MobileAppBar,
  PageContainer,
  PageHeader,
  Progress,
  SegmentedControl,
  Skeleton,
  StatCard,
  StatusPanel,
  Surface,
} from '../ui';

const MAX_ANALYZE_UPLOAD_BYTES = 2 * 1024 * 1024;
const PDF_CONTENT_TYPES = new Set(['application/pdf', 'application/x-pdf']);
const POLL_INTERVAL_MS = 2500;
const TERMINAL_STATUSES = new Set(['success', 'failure']);
const BOOKS_COLLAPSED_LIMIT = 3;
const SMOOTH_PROGRESS_INTERVAL_MS = 450;
const SMOOTH_PROGRESS_MAX = 100;
const ANALYZE_STAGE_ALIASES: Record<string, string> = {
  llmwhisperer_accepted: 'extraction_accepted',
  llmwhisperer_processing: 'extraction_processing',
  llmwhisperer_processed: 'extraction_completed',
};
const ANALYZE_PAGE_CLASS = 'mx-auto w-full max-w-[1180px] overflow-x-hidden px-6 py-14 max-md:px-4';
const ANALYZE_RESULTS_PAGE_CLASS = 'mx-auto w-full max-w-[1180px] overflow-x-hidden px-6 py-14 max-md:max-w-none max-md:bg-[#efebf6] max-md:px-0 max-md:py-0';
const ANALYZE_PROCESSING_PAGE_CLASS = `${ANALYZE_PAGE_CLASS} max-md:pt-[88px] max-md:px-6`;
const ANALYZE_UPLOAD_PAGE_CLASS = 'mx-auto flex h-[calc(100dvh-80px)] w-full max-w-[1180px] flex-col overflow-hidden px-6 py-14 max-lg:h-auto max-lg:min-h-[calc(100dvh-80px)] max-lg:overflow-visible max-md:bg-[#efebf6] max-md:px-6';
const ANALYZE_HEADER_CLASS = 'mb-8 flex flex-wrap items-end justify-between gap-5';
const ANALYZE_UPLOAD_HEADER_CLASS = 'mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4 max-md:mb-0 max-md:[&>div>div>h1]:text-[24px] max-md:[&>div>div>h1]:leading-none max-md:[&>div>div>h1]:text-[#000000]';
const ANALYZE_PROCESSING_HEADER_CLASS = 'mb-8 flex flex-wrap items-end justify-between gap-5 max-md:mb-6 max-md:[&>div>div>div]:hidden max-md:[&>div>div>p]:hidden max-md:[&>div>div>h1]:text-[24px] max-md:[&>div>div>h1]:leading-none max-md:[&>div>div>h1]:text-[#000000]';

type AnalyzeSortDirection = 'weakFirst' | 'strongFirst';

export function Analyze() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLatestView = searchParams.get('view') === 'latest';
  const [file, setFile] = useState<File | null>(null);
  const [createdTask, setCreatedTask] = useState<AnalyzeTask | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pollTask, setPollTask] = useState<AnalyzeTask | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [sortDirection, setSortDirection] = useState<AnalyzeSortDirection>('weakFirst');
  const [latestResults, setLatestResults] = useState<AnalyzeChapterResult[] | null | undefined>(undefined);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [latestRetryKey, setLatestRetryKey] = useState(0);

  const sseUrl = !isLatestView && taskId ? buildAnalyzeSseUrl(taskId) : null;
  const {
    messages,
    result: sseResult,
    error: sseError,
  } = useSSE<AnalyzeTask>(sseUrl);

  useEffect(() => {
    if (!isLatestView) {
      setLatestResults(undefined);
      setLatestError(null);
      return;
    }

    let active = true;
    setLatestResults(undefined);
    setLatestError(null);

    getLatestAnalyzeResult(i18n.language)
      .then((results) => {
        if (!active) return;
        const normalizedResults = Array.isArray(results) && results.length > 0 ? results : [];
        setLatestResults(normalizedResults);
        if (normalizedResults.length === 0) {
          setSearchParams((params) => {
            params.delete('view');
            return params;
          }, { replace: true });
        }
      })
      .catch((err) => {
        if (!active) return;
        setLatestResults(null);
        setLatestError(getApiErrorMessage(err, t('common.error')));
      });

    return () => {
      active = false;
    };
  }, [i18n.language, isLatestView, latestRetryKey, setSearchParams, t]);

  // A latest-result deep link is an independent read-only flow. Ignore any
  // task/SSE/poll state left over from a previous upload while it is active.
  const currentTask = isLatestView ? undefined : sseResult ?? pollTask ?? messages.at(-1) ?? createdTask;
  const hasLatestResult = isLatestView && Array.isArray(latestResults) && latestResults.length > 0;
  const hasLatestError = isLatestView && latestResults === null && latestError !== null;
  const isLatestLoading = isLatestView && latestResults === undefined && latestError === null;
  const isTerminal = currentTask ? TERMINAL_STATUSES.has(currentTask.status) : hasLatestResult || hasLatestError;
  const isProcessing = !isLatestView && (submitting || Boolean(taskId && !isTerminal && !pollError));
  const showUploadForm = !isLatestView && !isTerminal && !isProcessing;
  const failureMessage = isLatestView
    ? null
    : submitError ??
      pollError ??
      (currentTask?.status === 'failure' ? getTaskErrorMessage(currentTask.error) : null) ??
      (sseError && !polling ? sseError : null);
  const successResults = currentTask?.status === 'success'
    ? currentTask.result ?? []
    : hasLatestResult
      ? latestResults
      : [];
  const uniqueSuccessResults = useMemo(
    () => getUniqueAnalyzeChapterResults(successResults),
    [successResults],
  );
  const sortedResults = useMemo(
    () => sortChaptersByPercentage(uniqueSuccessResults, sortDirection),
    [uniqueSuccessResults, sortDirection],
  );
  const summary = useMemo(() => getAnalyzeSummary(uniqueSuccessResults), [uniqueSuccessResults]);
  const resultAccess = useMemo(
    () => selectAnalyzeResultAccess(uniqueSuccessResults),
    [uniqueSuccessResults],
  );
  const isMobileResult = !isProcessing && (currentTask?.status === 'success' || hasLatestResult);

  function retryLatest() {
    setLatestResults(undefined);
    setLatestError(null);
    setLatestRetryKey((value) => value + 1);
  }

  useEffect(() => {
    if (isLatestView || !taskId || !sseError || sseResult) return;

    const activeTaskId = taskId;
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      setPolling(true);
      setPollError(null);
      timer = undefined;

      try {
        const task = await getAnalyzeTask(activeTaskId);
        if (cancelled) return;

        setPollTask(task);

        if (!TERMINAL_STATUSES.has(task.status)) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        setPolling(false);
      } catch (err) {
        if (!cancelled) {
          setPollError(getApiErrorMessage(err, t('common.error')));
          setPolling(false);
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      setPolling(false);
    };
  }, [isLatestView, sseError, sseResult, taskId, t]);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setSubmitError(null);
    setPollError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateAnalyzeFile(file, t);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError(null);
    setPollError(null);
    setCreatedTask(null);
    setPollTask(null);
    setTaskId(null);
    setSubmitting(true);

    try {
      const task = await createAnalyzeTask(file as File, i18n.language);
      setCreatedTask(task);
      setTaskId(task.task_id);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, t('common.error')));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFile(null);
    setCreatedTask(null);
    setTaskId(null);
    setSubmitError(null);
    setPollError(null);
    setPollTask(null);
    setSortDirection('weakFirst');
    if (isLatestView) {
      navigate({ pathname: '/analyze', search: '' }, { replace: true });
    }
  }

  function handleMobileResultBack() {
    if (isLatestView) {
      navigate('/profile', { replace: true });
      return;
    }

    reset();
  }

  return (
    <PageContainer
      width="full"
      gutter="none"
      className={showUploadForm ? ANALYZE_UPLOAD_PAGE_CLASS : isProcessing ? ANALYZE_PROCESSING_PAGE_CLASS : isMobileResult ? ANALYZE_RESULTS_PAGE_CLASS : ANALYZE_PAGE_CLASS}
    >
      {!isLatestLoading && (
        <PageHeader
          className={`${showUploadForm ? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing ? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS} ${isMobileResult ? 'max-md:hidden' : ''}`}
          eyebrow={!showUploadForm ? t('analyze.eyebrow') : undefined}
          eyebrowClassName={isProcessing ? 'max-md:hidden' : undefined}
          title={t('analyze.title')}
          description={!showUploadForm ? t('analyze.description') : undefined}
          descriptionClassName={isProcessing ? 'max-md:hidden' : undefined}
          trailing={isTerminal && !hasLatestError ? <Button onClick={reset}>{t('analyze.newUpload')}</Button> : undefined}
        />
      )}

      {showUploadForm && (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col rounded-surface border border-border bg-surface p-5 shadow-feature max-lg:flex-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none">
          <p className="mt-8 hidden text-[20px] font-medium leading-none text-[#572d9f] max-md:block">{t('analyze.uploadTitle')}</p>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 max-lg:grid-cols-1 max-md:mt-6">
            <div className="flex min-h-0 min-w-0 flex-col justify-between rounded-[8px] bg-bg px-4 py-4 max-md:hidden">
              <div>
                <h2 className="text-[21px] font-medium leading-none text-primary">
                  {t('analyze.uploadInstructionTitle')}
                </h2>
                <p className="mt-1.5 text-[14px] leading-none text-text-body">
                  {t('analyze.description')}
                </p>
              </div>

              <ol className="mt-5 grid gap-3">
                <InstructionStep
                  number="1"
                  title={t('analyze.uploadStep1Title')}
                  body={t('analyze.uploadStep1Body')}
                />
                <InstructionStep
                  number="2"
                  title={t('analyze.uploadStep2Title')}
                  body={t('analyze.uploadStep2Body')}
                />
                <InstructionStep
                  number="3"
                  title={t('analyze.uploadStep3Title')}
                  body={t('analyze.uploadStep3Body')}
                />
              </ol>
            </div>

            <label
              htmlFor="analyze-file"
              className="group flex h-full min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-border bg-bg px-6 py-8 text-center transition-colors hover:border-accent hover:bg-surface focus-within:border-accent max-md:h-[214px] max-md:min-h-0 max-md:rounded-[8px] max-md:border-[2px] max-md:border-[#a585db] max-md:bg-[#ffffff] max-md:px-12 max-md:py-12"
            >
              <input
                id="analyze-file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={submitting || Boolean(taskId)}
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <span className={`flex size-14 items-center justify-center rounded-full transition-colors ${file ? 'size-16 bg-[#6a37c3] text-[#ffffff]' : 'bg-bg text-primary group-hover:bg-surface max-md:size-16 max-md:!bg-[#ded2f1] max-md:hover:!bg-[#ded2f1] max-md:focus-within:!bg-[#ded2f1] max-md:text-[#572d9f]'}`}>
                <HugeiconsIcon icon={DocumentAttachmentIcon} size={32} strokeWidth={1.5} />
              </span>
              <span className="mt-4 text-[24px] font-medium leading-none text-primary max-md:text-[16px] max-md:leading-none max-md:text-[#161519]">
                {file ? file.name : t('analyze.uploadHint')}
              </span>
              <span className="mt-1.5 text-[15px] leading-none text-text-body max-md:mt-2 max-md:text-[14px] max-md:leading-[14px] max-md:text-[#a585db]">
                {file ? (
                  t('analyze.selectedFileHint')
                ) : (
                  <>
                    {t('analyze.uploadDropHint').replace(/\s+\S+$/, '')}{' '}
                    <span className="text-[#6a37c3]">{t('analyze.uploadDropHint').match(/\S+$/)}</span>
                  </>
                )}
              </span>
              <span className="mt-2 hidden max-w-[420px] text-[14px] leading-none text-muted md:block">{t('analyze.uploadTitle')}</span>
            </label>
          </div>

          {file && !taskId && (
            <div className="mt-4 hidden md:flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-bg px-4 py-3">
              <span className="min-w-0 truncate text-[15px] leading-none text-primary">{file.name}</span>
              <Button
                onClick={() => handleFileChange(null)}
                aria-label={t('analyze.clearFile')}
                variant="ghost"
                size="sm"
                className="size-9 shrink-0 px-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
              </Button>
            </div>
          )}

          {failureMessage && <StatusPanel className="mt-4" tone="danger" announce="assertive" title={failureMessage} headingLevel={3} />}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[580px] text-[14px] leading-none text-muted max-md:hidden">
              {t('analyze.privacyNote')}
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={!file || submitting || Boolean(taskId)}
              loading={submitting}
              className={`max-sm:w-full max-md:h-12 max-md:rounded-[8px] ${file ? 'max-md:bg-[#6a37c3] max-md:text-[#ffffff]' : 'max-md:bg-[#ded2f1] max-md:text-[#a585db]'} disabled:opacity-100`}
            >
              {submitting ? (
                t('common.loading')
              ) : (
                <>
                  <span className="max-md:hidden">{t('analyze.submit')}</span>
                  <span className="hidden max-md:inline">{t('analyze.submit')} →</span>
                </>
              )}
            </Button>
          </div>

          <div className="mt-12 hidden max-md:block">
            <h2 className="text-[20px] font-medium leading-none text-[#572d9f]">
              {t('analyze.benefitsTitle')}
            </h2>
            <AnalyzeBenefitCards />
          </div>
        </form>
      )}

      {isLatestLoading && <AnalyzeLatestResultSkeleton onBack={handleMobileResultBack} />}

      {isProcessing && (
        <AnalyzeProgress
          currentTask={currentTask}
          file={file}
        />
      )}

      {!isProcessing && currentTask?.status === 'failure' && (
        <AnalyzeFailure message={failureMessage ?? t('common.error')} onReset={reset} />
      )}

      {!isProcessing && hasLatestError && (
        <AnalyzeFailure message={latestError ?? t('common.error')} onReset={retryLatest} />
      )}

      {!isProcessing && !hasLatestError && (currentTask?.status === 'success' || hasLatestResult) && (
        <>
          <div className="hidden md:block">
            <AnalyzeResults
              results={sortedResults}
              summary={summary}
              sortDirection={sortDirection}
              onSortDirectionChange={setSortDirection}
            />
          </div>
          <div className="md:hidden">
            <AnalyzeMobileResults
              access={resultAccess}
              onBack={handleMobileResultBack}
              onTitleClick={isLatestView ? handleMobileResultBack : undefined}
            />
          </div>
        </>
      )}
    </PageContainer>
  );
}

export function AnalyzeLatestResultSkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>

      <section className="hidden md:block mt-8" aria-hidden="true">
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Skeleton shape="text" className="h-4 w-40" />
          <Skeleton className="h-10 w-56" />
        </div>

        <div className="mt-6 grid gap-4">
          <AnalyzeLatestResultDesktopChapterSkeleton />
          <AnalyzeLatestResultDesktopChapterSkeleton />
          <AnalyzeLatestResultDesktopChapterSkeleton />
        </div>
      </section>

      <section className="w-full overflow-x-hidden bg-[#efebf6] text-[#161519] md:hidden max-md:-mx-4 max-md:-mt-14 max-md:w-[calc(100%+2rem)]">
        <MobileAppBar
          title={(
            <button
              type="button"
              onClick={onBack}
              aria-label={t('analyze.mobileResultTitle')}
              className="w-full truncate border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
            >
              {t('analyze.mobileResultTitle')}
            </button>
          )}
          headingLevel={2}
          titleAlign="start"
          safeArea
          className="mt-16 h-16 min-h-16 px-4 text-[#252329] [&>h2]:text-[16px] [&>h2]:leading-4 [&>h2]:text-[#252329]"
          leading={(
            <button
              type="button"
              onClick={onBack}
              aria-label={t('analyze.mobileResultBack')}
              className="flex size-10 items-center justify-center rounded-[8px] text-[#252329] outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} aria-hidden="true" />
            </button>
          )}
        />

        <div className="mx-auto w-full max-w-[430px] px-6 pb-8" aria-hidden="true">
          <Skeleton shape="text" className="mt-6 h-5 w-40" />

          <article className="mt-6 rounded-[8px] bg-[#ffffff] px-6 py-4">
            <div className="flex items-center gap-6">
              <Skeleton shape="circle" className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton shape="text" className="h-3 w-24" />
                <Skeleton shape="text" className="mt-2 h-8 w-20" />
              </div>
            </div>
          </article>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <AnalyzeLatestResultMobileSummarySkeleton />
            <AnalyzeLatestResultMobileSummarySkeleton />
          </div>

          <Skeleton shape="text" className="mt-8 h-5 w-48" />

          <div className="mt-4 grid gap-3">
            <AnalyzeLatestResultMobileChapterSkeleton />
            <AnalyzeLatestResultMobileChapterSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalyzeLatestResultDesktopChapterSkeleton() {
  return (
    <article className="rounded-surface border border-border bg-surface p-6" aria-hidden="true">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton shape="text" className="h-5 w-64 max-w-full" />
          <Skeleton shape="text" className="mt-3 h-4 w-44 max-w-full" />
        </div>
        <Skeleton shape="text" className="h-4 w-20" />
      </div>
      <Skeleton className="mt-6 h-2 w-full" />
      <div className="mt-6 grid gap-3">
        <Skeleton shape="text" className="h-4 w-3/4" />
        <Skeleton shape="text" className="h-4 w-2/3" />
      </div>
    </article>
  );
}

function AnalyzeLatestResultMobileSummarySkeleton() {
  return (
    <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-4" aria-hidden="true">
      <Skeleton shape="text" className="h-3 w-24 max-w-full" />
      <Skeleton shape="text" className="mt-2 h-4 w-28 max-w-full" />
      <Skeleton shape="text" className="mt-3 h-3 w-20 max-w-full" />
    </article>
  );
}

function AnalyzeLatestResultMobileChapterSkeleton() {
  return (
    <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-6" aria-hidden="true">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton shape="text" className="h-4 w-44 max-w-full" />
          <Skeleton shape="text" className="mt-2 h-3 w-32 max-w-full" />
        </div>
        <Skeleton shape="text" className="h-3 w-16" />
      </div>
      <Skeleton className="my-5 h-px w-full" />
      <Skeleton shape="text" className="h-4 w-28 max-w-full" />
      <Skeleton shape="text" className="mt-2 h-3 w-40 max-w-full" />
      <div className="mt-4 grid gap-2">
        <Skeleton shape="text" className="h-3 w-4/5" />
        <Skeleton shape="text" className="h-3 w-3/5" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>
    </article>
  );
}

function AnalyzeBenefitCards() {
  const { t } = useTranslation();

  return (
    <div className="mt-6 grid grid-cols-2 gap-2">
      <AnalyzeBenefitCard eyebrow={t('analyze.benefitWeakEyebrow')} title={t('analyze.benefitWeakTitle')} body={t('analyze.benefitWeakBody')} />
      <AnalyzeBenefitCard eyebrow={t('analyze.benefitBooksEyebrow')} title={t('analyze.benefitBooksTitle')} body={t('analyze.benefitBooksBody')} />
      <AnalyzeBenefitCard icon={UserAiIcon} eyebrow={t('analyze.benefitPersonalEyebrow')} title={t('analyze.benefitPersonalTitle')} body={t('analyze.benefitPersonalBody')} />
    </div>
  );
}

function AnalyzeBenefitCard({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon?: typeof UserAiIcon;
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

  if (icon) {
    return (
      <article className="col-span-2 flex h-24 items-center gap-6 rounded-[8px] bg-[#ffffff] px-6 py-4">
        <img src="/figma-user-ai.svg" alt="" width={32} height={32} className="shrink-0" />
        {content}
      </article>
    );
  }

  return <article className="h-24 rounded-[8px] bg-[#ffffff] p-4">{content}</article>;
}

function InstructionStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
        <span className="flex size-9 items-center justify-center rounded-[8px] bg-surface text-[15px] font-medium leading-none text-primary">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block min-w-0 break-words text-[15px] font-medium leading-none text-text">
          {title}
        </span>
        <span className="mt-1 block min-w-0 break-words text-[13px] leading-none text-muted">
          {body}
        </span>
      </span>
    </li>
  );
}

export function AnalyzeProgress({
  currentTask,
  file,
  progressOverride,
}: {
  currentTask: AnalyzeTask | null | undefined;
  file?: File | null;
  progressOverride?: number;
}) {
  const { t } = useTranslation();
  const currentStage = currentTask?.stage ?? currentTask?.status ?? 'pending';
  const liveProgressPercent = useSmoothAnalyzeProgress();
  const sourceProgressPercent = progressOverride ?? liveProgressPercent;
  const progressPercent = Number.isFinite(sourceProgressPercent)
    ? Math.min(100, Math.max(0, sourceProgressPercent))
    : 0;
  const mobileProgressCaption =
    t('analyze.mobileProgressCaption') === 'analyze.mobileProgressCaption'
      ? t('analyze.stages.parsing')
      : t('analyze.mobileProgressCaption');

  return (
    <section className="mt-6 overflow-hidden rounded-[8px] border border-border bg-surface shadow-feature max-md:mt-12 max-md:overflow-visible max-md:rounded-[8px] max-md:border-0 max-md:bg-transparent max-md:shadow-none">
      <div className="h-1 bg-bg max-md:hidden" aria-hidden>
        <div className="h-full w-1/3 animate-[analyze-scan_1.8s_ease-in-out_infinite] bg-accent" />
      </div>

      <div className="p-8 max-md:p-5 max-md:hidden">
        <div className="max-w-[760px]">
          <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
            {t('analyze.progressCurrentStage')}
          </p>
          <h2 className="mt-3 text-[30px] font-medium leading-none text-primary max-md:text-[24px] max-md:leading-none">
            {t('analyze.progressTitle')}
          </h2>
          <p className="mt-3 text-[15px] leading-none text-text-body">
            {t('analyze.progressSubtitle')}
          </p>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between gap-4 text-[14px] font-medium leading-none text-primary">
            <span>{getStageLabel(currentStage, t)}</span>
            <span>{t('analyze.progressPercent', { percent: progressPercent })}</span>
          </div>
          <Progress
            value={progressPercent}
            size="lg"
            aria-label={t('analyze.progressTitle')}
            valueText={t('analyze.progressPercent', { percent: progressPercent })}
          />
        </div>
      </div>

      <div className="hidden max-md:block">
        <div className="w-full rounded-[8px] bg-[#ffffff] p-8 max-md:w-full max-md:rounded-[8px] max-md:bg-[#ffffff] max-md:p-8">
          <div
            className="relative mx-auto flex size-36 items-center justify-center rounded-full p-[8px]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label={t('analyze.progressTitle')}
          >
            <svg
              className="pointer-events-none absolute inset-0 size-full -rotate-90"
              viewBox="0 0 144 144"
              aria-hidden="true"
            >
                <circle cx="72" cy="72" r="68" fill="none" stroke="#ded2f1" strokeWidth="8" />
              {progressPercent > 0 && (
                <circle
                  cx="72"
                  cy="72"
                    r="68"
                  fill="none"
                  stroke="#6a37c3"
                    strokeWidth="8"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={progressPercent >= 100 ? '100' : `${progressPercent} 100`}
                />
              )}
            </svg>
            <div className="flex size-full items-center justify-center rounded-full bg-[#ffffff]">
              <span className="text-[32px] font-medium leading-none text-[#000000]">{progressPercent}%</span>
            </div>
          </div>
          <p className="mt-6 text-center text-[16px] leading-none text-[#524d5b]">
            {mobileProgressCaption}
          </p>
        </div>

        {file && (
          <div className="mt-8 flex w-full items-center gap-4 rounded-[8px] bg-[#ffffff] px-6 py-4 max-md:mt-3 max-md:gap-6">
              <HugeiconsIcon icon={DocumentAttachmentIcon} size={32} strokeWidth={1.5} className="shrink-0 text-[#6a37c3]" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-3 text-[#865bcf]">{t('analyze.fileEyebrow')}</p>
              <p className="mt-1 truncate text-[16px] leading-4 text-[#161519]">{file.name}</p>
              <p className="mt-2 text-[12px] leading-3 text-[#b1acb9]">{formatAnalyzeFileSize(file.size)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function AnalyzeFailure({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Surface tone="plain" variant="mobile-flat" className="mt-6 border border-danger/40 p-8 shadow-feature">
      <EmptyState
        icon={<HugeiconsIcon icon={AlertCircleIcon} size={30} strokeWidth={1.6} />}
        title={t('analyze.errorTitle')}
        description={message}
        action={<Button onClick={onReset}>{t('common.tryAgain')}</Button>}
      />
    </Surface>
  );
}

export function AnalyzeResults({
  results,
  summary,
  sortDirection,
  onSortDirectionChange,
}: {
  results: AnalyzeChapterResult[];
  summary: AnalyzeSummary;
  sortDirection: AnalyzeSortDirection;
  onSortDirectionChange: (direction: AnalyzeSortDirection) => void;
}) {
  const { t } = useTranslation();
  const summaryStatus = getScoreStatus(summary.percentage);

  if (results.length === 0) {
    return (
      <Surface tone="plain" variant="mobile-flat" className="mt-8 border border-border p-8 shadow-feature">
        <EmptyState title={t('analyze.noResults')} />
      </Surface>
    );
  }

  return (
    <div className="mt-8">
      <section className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <SummaryStat label={t('analyze.summaryScore')} value={`${summary.score}/${summary.maxScore}`} />
        <SummaryStat
          label={t('analyze.summaryPercent')}
          value={`${summary.percentage}%`}
          status={summaryStatus}
        />
        <SummaryStat label={t('analyze.summaryChapters')} value={String(summary.chapterCount)} />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-medium leading-none text-primary">{t('analyze.sortLabel')}</p>
        <SegmentedControl
          name="analyze-sort-direction"
          label={t('analyze.sortLabel')}
          labelHidden
          value={sortDirection}
          onValueChange={onSortDirectionChange}
          options={[
            { value: 'weakFirst', label: t('analyze.sortWeakFirst') },
            { value: 'strongFirst', label: t('analyze.sortStrongFirst') },
          ]}
        />
      </div>

      <section className="mt-6 grid gap-4">
        {results.map((chapter) => (
          <ChapterCard key={getAnalyzeChapterKey(chapter)} chapter={chapter} />
        ))}
      </section>
    </div>
  );
}

export function AnalyzeMobileResults({
  access,
  onBack,
  onTitleClick,
}: {
  access: AnalyzeResultAccess;
  onBack: () => void;
  onTitleClick?: () => void;
}) {
  const { t } = useTranslation();
  const totalScore = access.allChapters.reduce((sum, chapter) => sum + chapter.score, 0);
  const totalMaxScore = access.allChapters.reduce((sum, chapter) => sum + chapter.max_score, 0);
  const lostPoints = Math.max(0, totalMaxScore - totalScore);

  return (
    <section className="w-full overflow-x-hidden bg-[#efebf6] text-[#161519]">
      <MobileAppBar
        title={onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            aria-label={t('analyze.mobileResultTitle')}
            className="w-full truncate border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
          >
            {t('analyze.mobileResultTitle')}
          </button>
        ) : t('analyze.mobileResultTitle')}
        headingLevel={2}
        titleAlign="start"
        safeArea
        className="mt-16 h-16 min-h-16 px-4 text-[#252329] [&>h2]:text-[16px] [&>h2]:leading-4 [&>h2]:text-[#252329]"
        leading={(
          <button
            type="button"
            onClick={onBack}
            aria-label={t('analyze.mobileResultBack')}
            className="flex size-10 items-center justify-center rounded-[8px] text-[#252329] outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
      />

      <div className="mx-auto w-full max-w-[430px] px-6 pb-8">
      <h1 className="pt-6 text-[20px] font-medium leading-none text-[#572d9f]">
          {t('analyze.mobileResultHeading')}
        </h1>

        {access.orderedChapters.length === 0 ? (
          <Surface tone="plain" variant="mobile-flat" className="mt-6 rounded-[8px] p-6 shadow-none">
            <EmptyState title={t('analyze.noResults')} />
          </Surface>
        ) : (
          <>
            <article className="mt-6 rounded-[8px] bg-[#ffffff] px-6 py-4">
              <div className="flex items-center gap-6">
                <HugeiconsIcon icon={StarIcon} size={32} strokeWidth={1.7} className="shrink-0 text-[#6a37c3]" aria-hidden="true" />
                <div className="min-w-0">
            <p className="text-[12px] font-medium leading-none text-[#6a37c3]">{t('analyze.mobileScoreLabel')}</p>
            <p className="mt-1 flex items-baseline font-medium leading-none">
              <span className="text-[32px] leading-none text-[#252329]">{totalScore}</span>
            <span className="ml-1 text-[20px] leading-none text-[#858188]">/{totalMaxScore}</span>
                  </p>
                </div>
              </div>
            </article>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-4">
              <p className="break-words text-[12px] font-medium leading-none text-[#6a37c3]">
                  {t('analyze.mobileLostPointsLabel')}
                </p>
              <p className="mt-1 break-words text-[16px] font-normal leading-none text-[#252329]">
                  {t('analyze.mobileLostPointsValue', { count: lostPoints })}
                </p>
              <p className="mt-2 break-words text-[12px] leading-none text-[#858188]">
                  {t('analyze.mobileLostPointsHelper')}
                </p>
              </article>
              <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-4">
              <p className="break-words text-[12px] font-medium leading-none text-[#6a37c3]">
                  {t('analyze.mobileFreeSummaryLabel')}
                </p>
              <p className="mt-1 break-words text-[16px] font-normal leading-none text-[#252329]">
                  {t('analyze.mobileFreeSummaryValue', { count: access.freeChapter ? 1 : 0 })}
                </p>
              <p className="mt-2 break-words text-[12px] leading-none text-[#858188]">
                  {t('analyze.mobileFreeSummaryHelper')}
                </p>
              </article>
            </div>

            <h2 className="mt-8 text-[20px] font-medium leading-none text-[#572d9f]">
              {t('analyze.mobileWeakSectionTitle')}
            </h2>

            <div className="mt-4 grid gap-3">
              {access.freeChapter && (
                <AnalyzeMobileChapterCard chapter={access.freeChapter} locked={false} />
              )}
              {access.lockedChapters.map((chapter) => (
                <AnalyzeMobileChapterCard key={getAnalyzeChapterKey(chapter)} chapter={chapter} locked />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function AnalyzeMobileChapterCard({
  chapter,
  locked,
}: {
  chapter: AnalyzeChapterResult;
  locked: boolean;
}) {
  const { i18n, t } = useTranslation();
  const lostPoints = Math.max(0, chapter.max_score - chapter.score);
  const topics = locked ? [] : chapter.topic_codes ?? [];
  const topicCount = locked
    ? chapter.topic_count ?? 0
    : chapter.topic_count ?? chapter.books.reduce((sum, book) => sum + book.topic_count, 0);
  const materialGrades = Array.from(new Set(chapter.material_grades ?? [])).sort(
    (left, right) => left - right,
  );
  const formattedGrades = new Intl.ListFormat(i18n.language.startsWith('kk') ? 'kk' : 'ru', {
    type: 'conjunction',
  }).format(materialGrades.map(String));
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
    { length: topicCount },
    (_, previewIndex) => {
      const previewBaseLabel = t(previewLabelKeys[previewIndex % previewLabelKeys.length]);
      const label = previewIndex < previewLabelKeys.length
        ? previewBaseLabel
        : `${previewBaseLabel} ${t('analyze.mobileHiddenTopicPreviewIndex', { index: previewIndex + 1 })}`;

      return {
        id: `fake-preview-${previewIndex}`,
        label,
      };
    },
  );

  return (
    <article className="min-w-0 rounded-[8px] bg-[#ffffff] p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words text-[16px] font-medium leading-none text-[#252329]">
            {chapter.title}
          </h3>
          <p className="mt-1 break-words text-[12px] leading-none text-[#858188]">
            {t('analyze.mobileChapterScoreSummary', {
              score: chapter.score,
              maxScore: chapter.max_score,
              percentage: chapter.percentage,
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-normal text-[12px] leading-none text-[#dc2626]">
            {t('analyze.mobileChapterLost', { count: lostPoints })}
          </p>
        </div>
      </div>

      <div className="my-5 h-px bg-[#e9e4ef]" aria-hidden="true" />

      <div className="min-w-0 px-2">
        <h4 className="break-words text-[14px] font-medium leading-none text-[#6a37c3]">
          {t('analyze.mobileTopicsTitle')}
        </h4>
        <p className="mt-1 break-words text-[12px] leading-none text-[#a585db]">
          {materialGrades.length > 0
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
                {t('analyze.mobileHiddenTopics', { count: topicCount })}
              </p>
              <p className="mt-1 text-[12px] leading-none text-[#6e6779]">
                {t('analyze.mobilePremiumMessage')}
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2">
            {topics.length > 0 ? topics.map((topic) => (
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
      ) : (
        <Link
          to={`/practice-by-topic?chapterId=${encodeURIComponent(String(chapter.chapter_id))}`}
          className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-none text-[#ffffff] outline-none transition-colors hover:bg-[#572d9f] focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {t('analyze.mobilePracticeCta')}
        </Link>
      )}
    </article>
  );
}

function SummaryStat({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: ReturnType<typeof getScoreStatus>;
}) {
  return <StatCard label={label} value={value} className={status?.textClass} />;
}

function ChapterCard({ chapter }: { chapter: AnalyzeChapterResult }) {
  const { t } = useTranslation();
  const [booksExpanded, setBooksExpanded] = useState(false);
  const scoreStatus = getScoreStatus(chapter.percentage);
  const progress = clampScorePercent(chapter.percentage);
  const visibleBooks = booksExpanded
    ? chapter.books
    : chapter.books.slice(0, BOOKS_COLLAPSED_LIMIT);
  const hiddenBooksCount = Math.max(0, chapter.books.length - BOOKS_COLLAPSED_LIMIT);

  return (
    <article className="rounded-[8px] border border-border bg-surface p-6 shadow-feature max-md:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-none text-primary max-md:text-[20px] max-md:leading-none">
            {chapter.title}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2 max-sm:items-start">
          <span className={`text-[32px] font-medium leading-none ${scoreStatus.textClass}`}>
            {chapter.percentage}%
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[12px] font-medium leading-none ${scoreStatus.surfaceClass} ${scoreStatus.borderClass} ${scoreStatus.textClass}`}
          >
            {t(scoreStatus.labelKey)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_190px] gap-3 max-md:grid-cols-1">
        <div className="rounded-[8px] bg-bg px-4 py-3">
          <p className="text-[13px] font-medium uppercase leading-none tracking-[0.08em] text-muted">
            {t('analyze.chapterScoreLabel')}
          </p>
          <p className="mt-1 text-[30px] font-medium leading-none text-primary">
            {t('analyze.chapterScoreValue', {
              score: chapter.score,
              maxScore: chapter.max_score,
            })}
          </p>
        </div>
        <div className="rounded-[8px] bg-bg px-4 py-3">
          <p className="text-[13px] font-medium uppercase leading-none tracking-[0.08em] text-muted">
            {t('analyze.chapterQuestionsLabel')}
          </p>
          <p className="mt-2 text-[18px] font-medium leading-none text-text">
            {t('analyze.chapterQuestionsValue', { count: chapter.question_count })}
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-bg" aria-hidden>
        <div
          className={`h-full rounded-full ${scoreStatus.progressClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-[16px] font-medium leading-none text-primary">
          <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={1.7} />
          <span>{t('analyze.booksTitle')}</span>
        </div>
        {chapter.books.length > 0 ? (
          <>
            <MobileBookCoverageList books={visibleBooks} />
            <div className="overflow-x-auto rounded-[8px] border border-border/60 max-md:hidden">
              <table className="w-full min-w-[560px] border-collapse">
      <thead className="bg-bg text-left text-[12px] font-medium uppercase leading-none tracking-[0.08em] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      {t('analyze.bookEditionHeader')}
                    </th>
                    <th scope="col" className="w-[130px] px-4 py-3 text-right">
                      {t('analyze.bookTopicsHeader')}
                    </th>
                    <th scope="col" className="w-[150px] px-4 py-3 text-right">
                      {t('analyze.bookCoverageHeader')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBooks.map((book) => (
                    <tr
                      key={`${book.public_id}-${book.publisher}-${book.grade}`}
                      className="border-t border-border/40"
                    >
                      <td className="px-4 py-4">
                    <span className="min-w-0 text-[15px] font-medium leading-none text-text">
                          {book.publisher}
                          <sup
                            className="ml-1 whitespace-nowrap align-super text-[10px] font-medium leading-none text-muted"
                            title={t('analyze.bookGrade', { grade: book.grade })}
                            aria-label={t('analyze.bookGrade', { grade: book.grade })}
                          >
                            {t('analyze.bookGradeSuperscript', { grade: book.grade })}
                          </sup>
                        </span>
                      </td>
                    <td className="px-4 py-4 text-right text-[14px] leading-none text-text-body">
                        {t('analyze.bookTopicsValue', { count: book.topic_count })}
                      </td>
                    <td className="px-4 py-4 text-right text-[15px] font-medium leading-none text-primary">
                        {book.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {chapter.books.length > BOOKS_COLLAPSED_LIMIT && (
              <button
                type="button"
                onClick={() => setBooksExpanded((value) => !value)}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-[8px] border border-border px-4 text-[14px] font-medium leading-none text-primary transition-colors hover:bg-bg"
              >
                {booksExpanded
                  ? t('analyze.hideBooks')
                  : t('analyze.showMoreBooks', { count: hiddenBooksCount })}
              </button>
            )}
          </>
        ) : (
          <p className="rounded-[8px] bg-bg px-4 py-3 text-[14px] leading-none text-muted">
            {t('analyze.noBooks')}
          </p>
        )}
      </div>
    </article>
  );
}

function MobileBookCoverageList({ books }: { books: AnalyzeBookCoverage[] }) {
  const { t } = useTranslation();

  return (
    <div className="hidden gap-2 max-md:grid" aria-label={t('analyze.booksTitle')}>
      {books.map((book) => (
        <article
          key={`${book.public_id}-${book.publisher}-${book.grade}-mobile`}
          className="rounded-[8px] border border-border/45 bg-bg px-3.5 py-3"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <p className="min-w-0 break-words text-[15px] font-medium leading-none text-text">
              {book.publisher}
              <sup
                className="ml-1 whitespace-nowrap align-super text-[10px] font-medium leading-none text-muted"
                title={t('analyze.bookGrade', { grade: book.grade })}
                aria-label={t('analyze.bookGrade', { grade: book.grade })}
              >
                {t('analyze.bookGradeSuperscript', { grade: book.grade })}
              </sup>
            </p>
            <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[12px] font-medium leading-none text-primary">
              {book.percentage}%
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] leading-none text-text-body">
            <span>{t('analyze.bookTopicsValue', { count: book.topic_count })}</span>
            <span>{t('analyze.bookCoverageHeader')}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

interface AnalyzeSummary {
  score: number;
  maxScore: number;
  percentage: number;
  chapterCount: number;
}

function validateAnalyzeFile(file: File | null, t: (key: string, values?: Record<string, unknown>) => string) {
  if (!file) return t('analyze.errors.fileRequired');
  if (file.size === 0) return t('analyze.errors.emptyFile');
  if (file.size > MAX_ANALYZE_UPLOAD_BYTES) {
    return t('analyze.errors.fileTooLarge');
  }

  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const hasPdfType = file.type ? PDF_CONTENT_TYPES.has(file.type) : false;
  if (!hasPdfExtension && !hasPdfType) return t('analyze.errors.invalidType');

  return null;
}

function formatAnalyzeFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function sortChaptersByPercentage(
  results: AnalyzeChapterResult[],
  direction: AnalyzeSortDirection,
) {
  return [...results].sort((first, second) => {
    if (first.percentage !== second.percentage) {
      return direction === 'weakFirst'
        ? first.percentage - second.percentage
        : second.percentage - first.percentage;
    }

    return first.title.localeCompare(second.title);
  });
}

function getUniqueAnalyzeChapterResults(results: AnalyzeChapterResult[]) {
  const exactSeen = new Set<string>();
  const chaptersByKey = new Map<string, AnalyzeChapterResult>();

  results.forEach((chapter) => {
    const signature = getAnalyzeChapterSignature(chapter);
    if (exactSeen.has(signature)) return;
    exactSeen.add(signature);

    const key = getAnalyzeChapterKey(chapter);
    const existing = chaptersByKey.get(key);

    if (!existing) {
      chaptersByKey.set(key, {
        ...chapter,
        books: mergeAnalyzeBooks([], chapter.books),
      });
      return;
    }

    const score = existing.score + chapter.score;
    const maxScore = existing.max_score + chapter.max_score;

    chaptersByKey.set(key, {
      ...existing,
      question_count: existing.question_count + chapter.question_count,
      max_score: maxScore,
      score,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      books: mergeAnalyzeBooks(existing.books, chapter.books),
    });
  });

  return Array.from(chaptersByKey.values());
}

function mergeAnalyzeBooks(
  currentBooks: AnalyzeBookCoverage[],
  nextBooks: AnalyzeBookCoverage[],
) {
  const booksByKey = new Map<string, AnalyzeBookCoverage>();

  [...currentBooks, ...nextBooks].forEach((book) => {
    const key = getAnalyzeBookKey(book);
    const existing = booksByKey.get(key);
    if (
      !existing ||
      book.percentage > existing.percentage ||
      (book.percentage === existing.percentage && book.topic_count > existing.topic_count)
    ) {
      booksByKey.set(key, book);
    }
  });

  return Array.from(booksByKey.values()).sort((first, second) => {
    if (first.percentage !== second.percentage) return second.percentage - first.percentage;
    if (first.topic_count !== second.topic_count) return second.topic_count - first.topic_count;
    return first.publisher.localeCompare(second.publisher);
  });
}

function getAnalyzeChapterKey(chapter: AnalyzeChapterResult) {
  return String(chapter.chapter_id);
}

function getAnalyzeChapterSignature(chapter: AnalyzeChapterResult) {
  const bookSignature = chapter.books
    .map((book) => [
      getAnalyzeBookKey(book),
      book.topic_count,
      book.percentage,
    ].join(':'))
    .sort()
    .join('|');

  return [
    getAnalyzeChapterKey(chapter),
    chapter.question_count,
    chapter.max_score,
    chapter.score,
    chapter.percentage,
    bookSignature,
  ].join('::');
}

function getAnalyzeBookKey(book: AnalyzeBookCoverage) {
  return normalizeAnalyzeIdentity(`${book.public_id}-${book.publisher}-${book.grade}`);
}

function normalizeAnalyzeIdentity(value: string) {
  return value.trim().toLowerCase();
}

function getAnalyzeSummary(results: AnalyzeChapterResult[]): AnalyzeSummary {
  const score = results.reduce((sum, chapter) => sum + chapter.score, 0);
  const maxScore = results.reduce((sum, chapter) => sum + chapter.max_score, 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    chapterCount: results.length,
  };
}

function useSmoothAnalyzeProgress() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= SMOOTH_PROGRESS_MAX) return current;

        const step = current < 35 ? 1.4 : current < 75 ? 0.75 : 0.35;
        return Math.min(
          SMOOTH_PROGRESS_MAX,
          Math.round((current + step) * 10) / 10,
        );
      });
    }, SMOOTH_PROGRESS_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return Math.round(progress);
}

function normalizeAnalyzeStage(stage: string | undefined) {
  if (!stage) return 'pending';
  if (ANALYZE_STAGE_ALIASES[stage]) return ANALYZE_STAGE_ALIASES[stage];
  if (stage.startsWith('llmwhisperer_')) return 'extraction_processing';

  return stage;
}

function getStageLabel(stage: string | undefined, t: (key: string) => string) {
  const publicStage = normalizeAnalyzeStage(stage);
  const key = `analyze.stages.${publicStage}`;
  const translated = t(key);
  return translated === key ? t('analyze.stages.processing') : translated;
}
