import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  FileSearchIcon,
  FileCorruptIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import {
  buildAnalyzeSseUrl,
  createAnalyzeTask,
  getAnalyzeTask,
  getLatestAnalyzeResult,
} from '../api/analyze';
import { useSSE } from '../hooks/useSSE';
import { getApiErrorClassificationDetail } from '../utils/apiError';
import type { AnalyzeBookCoverage, AnalyzeChapterResult, AnalyzeTask } from '../types';
import {
  getAnalyzeFailureKind,
  getAnalyzeFileFailureKind,
  type AnalyzeFailureKind,
} from '../features/analyze/model/failurePresentation';
import { selectAnalyzeResultAccess, type AnalyzeResultAccess } from '../features/analyze/model/resultAccess';
import { AnalyzeChapterCard } from '../features/analyze/components/AnalyzeChapterCard';
import { AnalyzeDesktopUploadGuide } from '../features/analyze/components/AnalyzeDesktopUploadGuide';
import { AnalyzeDesktopProgress } from '../features/analyze/components/AnalyzeDesktopProgress';
import {
  createAnalyzeProgressSnapshot,
  syncAnalyzeProgressSnapshot,
  tickAnalyzeProgressSnapshot,
  type AnalyzeProgressInput,
} from '../features/analyze/model/desktopProgress';
import {
  BetweenBlocks,
  Button,
  EmptyState,
  MobilePageFrame,
  PageContainer,
  PageHeader,
  Skeleton,
  Surface,
} from '../ui';
import { useMobileBottomNavOverride } from '../features/navigation';

const MAX_ANALYZE_UPLOAD_BYTES = 2 * 1024 * 1024;
const POLL_INTERVAL_MS = 2500;
const TERMINAL_STATUSES = new Set(['success', 'failure']);
const SMOOTH_PROGRESS_INTERVAL_MS = 450;
const ANALYZE_PAGE_CLASS = 'mx-auto w-full max-w-[1180px] overflow-x-hidden px-6 py-14 max-md:px-4';
const ANALYZE_RESULTS_PAGE_CLASS = 'mx-auto w-full max-w-[1180px] overflow-x-hidden px-6 py-14 max-md:max-w-none max-md:bg-[#efebf6] max-md:px-0 max-md:py-0';
const ANALYZE_PROCESSING_PAGE_CLASS = `${ANALYZE_PAGE_CLASS} max-md:max-w-none max-md:bg-[#efebf6] max-md:px-0 max-md:py-0 md:!ml-[2px] md:!mr-0 md:h-dvh md:min-h-[573px] md:w-[calc(100%-2px)] md:max-w-none md:bg-[#efeaf8] md:px-0 md:py-0`;
const ANALYZE_UPLOAD_PAGE_CLASS = 'mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-[1180px] flex-col overflow-x-hidden px-6 py-14 max-md:max-w-none max-md:bg-[#efebf6] max-md:px-0 max-md:pt-[var(--mobile-page-app-bar-offset)] min-[1440px]:!ml-[2px] min-[1440px]:!mr-0 min-[1440px]:h-[1080px] min-[1440px]:w-[calc(100%-2px)] min-[1440px]:max-w-none min-[1440px]:bg-[#efeaf8] min-[1440px]:px-16 min-[1440px]:py-8';
const ANALYZE_HEADER_CLASS = 'mb-8 flex flex-wrap items-end justify-between gap-5';
const ANALYZE_UPLOAD_HEADER_CLASS = 'mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4 max-md:mb-0 max-md:px-6 max-[359px]:px-4 max-md:[&>div>div>h1]:text-[24px] max-md:[&>div>div>h1]:leading-none max-md:[&>div>div>h1]:text-[#000000]';
const ANALYZE_PROCESSING_HEADER_CLASS = 'mb-8 flex flex-wrap items-end justify-between gap-5 max-md:mb-6 max-md:[&>div>div>div]:hidden max-md:[&>div>div>p]:hidden max-md:[&>div>div>h1]:text-[24px] max-md:[&>div>div>h1]:leading-none max-md:[&>div>div>h1]:text-[#000000]';

export function Analyze() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLatestView = searchParams.get('view') === 'latest';
  const [file, setFile] = useState<File | null>(null);
  const [createdTaskState, setCreatedTask] = useState<AnalyzeTask | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitFailureKind, setSubmitFailureKind] = useState<AnalyzeFailureKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pollTaskState, setPollTask] = useState<AnalyzeTask | null>(null);
  const [pollError, setPollError] = useState(false);
  const [polling, setPolling] = useState(false);
  const [latestResults, setLatestResults] = useState<AnalyzeChapterResult[] | null | undefined>(undefined);
  const [latestError, setLatestError] = useState(false);
  const [latestRetryKey, setLatestRetryKey] = useState(0);

  const sseUrl = !isLatestView && taskId ? buildAnalyzeSseUrl(taskId) : null;
  const {
    messages: rawMessages,
    result: rawSseResult,
    error: sseError,
  } = useSSE<AnalyzeTask>(sseUrl);
  const sseResult = taskId && rawSseResult?.task_id === taskId ? rawSseResult : undefined;

  useEffect(() => {
    if (!isLatestView) {
      setLatestResults(undefined);
      setLatestError(false);
      return;
    }

    let active = true;
    setLatestResults(undefined);
    setLatestError(false);

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
      .catch(() => {
        if (!active) return;
        setLatestResults(null);
        setLatestError(true);
      });

    return () => {
      active = false;
    };
  }, [i18n.language, isLatestView, latestRetryKey, setSearchParams]);

  // A latest-result deep link is an independent read-only flow. Ignore any
  // task/SSE/poll state left over from a previous upload while it is active.
  const messages = taskId ? rawMessages.filter((message) => message.task_id === taskId) : [];
  const pollTask = taskId && pollTaskState?.task_id === taskId ? pollTaskState : undefined;
  const createdTask = taskId && createdTaskState?.task_id === taskId ? createdTaskState : undefined;
  const currentTask = isLatestView ? undefined : sseResult ?? pollTask ?? messages.at(-1) ?? createdTask;
  const activeCurrentTask = currentTask;
  const hasLatestResult = isLatestView && Array.isArray(latestResults) && latestResults.length > 0;
  const hasLatestError = isLatestView && latestResults === null && latestError;
  const isLatestLoading = isLatestView && latestResults === undefined && !latestError;
  const isTerminal = currentTask ? TERMINAL_STATUSES.has(currentTask.status) : hasLatestResult || hasLatestError;
  const isProcessing = !isLatestView && (submitting || Boolean(taskId && !isTerminal && !pollError));
  const mobileNavHidden = !isLatestView && (submitting || Boolean(taskId && !isTerminal));
  useMobileBottomNavOverride({ visibility: mobileNavHidden ? 'hide' : 'show' });
  const taskFailureKind = currentTask?.status === 'failure'
    ? getAnalyzeFailureKind(currentTask.error, currentTask.stage)
    : null;
  const hasGenericFailure = Boolean(
    !taskFailureKind && !submitFailureKind && !pollError && sseError && !polling && !sseResult,
  );
  const failureKind: AnalyzeFailureKind | null = isLatestView
    ? null
    : taskFailureKind ?? submitFailureKind ?? (hasGenericFailure ? 'generic' : null);
  const showUploadForm = !isLatestView && !isTerminal && !isProcessing && !failureKind;
  const successResults = currentTask?.status === 'success'
    ? currentTask.result ?? []
    : hasLatestResult
      ? latestResults
      : [];
  const uniqueSuccessResults = useMemo(
    () => getUniqueAnalyzeChapterResults(successResults),
    [successResults],
  );
  const resultAccess = useMemo(
    () => selectAnalyzeResultAccess(uniqueSuccessResults),
    [uniqueSuccessResults],
  );
  const isMobileResult = !showUploadForm;

  function retryLatest() {
    setLatestResults(undefined);
    setLatestError(false);
    setLatestRetryKey((value) => value + 1);
  }

  useEffect(() => {
    if (isLatestView || !taskId || !sseError || sseResult) return;

    const activeTaskId = taskId;
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      setPolling(true);
      setPollError(false);
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
      } catch {
        if (!cancelled) {
          setPollError(true);
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
  }, [isLatestView, sseError, sseResult, taskId]);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setSubmitFailureKind(null);
    setPollError(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationFailureKind = getAnalyzeFileFailureKind(file, MAX_ANALYZE_UPLOAD_BYTES);
    if (validationFailureKind) {
      setSubmitFailureKind(validationFailureKind);
      return;
    }

    setSubmitFailureKind(null);
    setPollError(false);
    setCreatedTask(null);
    setPollTask(null);
    setTaskId(null);
    setSubmitting(true);

    try {
      const task = await createAnalyzeTask(file as File, i18n.language);
      setCreatedTask(task);
      setTaskId(task.task_id);
    } catch (err) {
      const detail = getApiErrorClassificationDetail(err);
      setSubmitFailureKind(getAnalyzeFailureKind(detail, detail?.stage));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFile(null);
    setCreatedTask(null);
    setTaskId(null);
    setSubmitFailureKind(null);
    setPollError(false);
    setPollTask(null);
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
      {!isLatestLoading && !isMobileResult && (
        <PageHeader
          className={`${showUploadForm ? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing ? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS} ${isMobileResult ? 'max-md:hidden' : ''} ${showUploadForm ? 'min-[1440px]:hidden' : ''}`}
          eyebrow={!showUploadForm ? t('analyze.eyebrow') : undefined}
          eyebrowClassName={isProcessing ? 'max-md:hidden' : undefined}
          title={t('analyze.title')}
          description={!showUploadForm ? t('analyze.description') : undefined}
          descriptionClassName={isProcessing ? 'max-md:hidden' : undefined}
          trailing={(currentTask?.status === 'success' || hasLatestResult) ? <Button onClick={reset}>{t('analyze.newUpload')}</Button> : undefined}
        />
      )}

      {showUploadForm && (
        <AnalyzeDesktopUploadGuide
          file={file}
          submitting={submitting}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
        />
      )}

      {isLatestLoading && <AnalyzeLatestResultSkeleton onBack={handleMobileResultBack} />}

      {isProcessing && (
        <AnalyzeProcessingViews
          currentTask={activeCurrentTask}
          file={file}
          onBack={handleMobileResultBack}
        />
      )}

      {!isProcessing && failureKind && (
        <AnalyzeFailure
          kind={failureKind}
          action="uploadAnother"
          onAction={reset}
          onBack={handleMobileResultBack}
        />
      )}

      {!isProcessing && hasLatestError && (
        <AnalyzeFailure
          kind="generic"
          action="retry"
          onAction={retryLatest}
          onBack={handleMobileResultBack}
        />
      )}

      {!isProcessing && !hasLatestError && (currentTask?.status === 'success' || hasLatestResult) && (
        <>
          <AnalyzeMobileResults
            access={resultAccess}
            onBack={handleMobileResultBack}
            onTitleClick={isLatestView ? handleMobileResultBack : undefined}
          />
        </>
      )}
    </PageContainer>
  );
}

export function AnalyzeProcessingViews({
  currentTask,
  file,
  onBack,
  progressOverride,
  sourceReferenceOnly = false,
  sourceReferenceFillOverride,
}: {
  currentTask: AnalyzeTask | null | undefined;
  file?: File | null;
  onBack?: () => void;
  progressOverride?: number;
  sourceReferenceOnly?: boolean;
  sourceReferenceFillOverride?: number;
}) {
  const progressSnapshot = useAnalyzeProgressSnapshot(currentTask, {
    percent: progressOverride,
    sourceReferenceOnly,
  });

  return (
    <AnalyzeDesktopProgress
      progressSnapshot={progressSnapshot}
      file={file}
      onBack={onBack}
      sourceReferenceFillOverride={sourceReferenceFillOverride}
    />
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

      <MobilePageFrame
        className="md:hidden"
        appBar={{
          title: (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('analyze.mobileResultTitle')}
              className="w-full truncate border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
            >
              {t('analyze.mobileResultTitle')}
            </button>
          ),
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
        <div className="mx-auto w-full max-w-[430px] px-6 pb-8" aria-hidden="true">
          <Skeleton shape="text" className="h-5 w-40" />

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
      </MobilePageFrame>
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

export function AnalyzeFailure({
  kind,
  action,
  onAction,
  onBack,
}: {
  kind: AnalyzeFailureKind;
  action: AnalyzeFailureAction;
  onAction: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  const content = (
    <EmptyState
      variant="outcome"
      role="alert"
      data-analyze-failure-group
      data-mobile-outcome-paint
      className="px-0 md:mx-auto md:max-w-[520px] md:px-0"
      icon={(
        <>
        <HugeiconsIcon icon={FileCorruptIcon} size={32} strokeWidth={1.6} className="md:hidden" />
        <HugeiconsIcon icon={FileSearchIcon} size={32} strokeWidth={1.5} className="hidden md:block" />
        </>
      )}
      title={t(`analyze.failure.${kind}.title`)}
      description={t(`analyze.failure.${kind}.description`)}
      partProps={{
        icon: {
          'data-analyze-failure-icon': '',
          className: '!bg-[#ded2f1] max-md:!text-[#6A37C3] md:mb-6 md:text-action-emphasized',
          'aria-hidden': 'true',
        },
        title: {
          'data-analyze-failure-title': '',
          className: 'text-black md:text-text-strong',
        },
        description: {
          'data-analyze-failure-description': '',
          className: 'max-w-[330px] max-md:!text-[#6e6779] md:mt-3 md:text-muted',
        },
        action: { className: 'md:mt-8 md:flex md:justify-center' },
      }}
      action={(
        <Button
          data-analyze-failure-action
          data-mobile-outcome-action
          fullWidth
          size="sm"
          onClick={onAction}
          className="h-10 min-h-10 rounded-[8px] !bg-[#6a37c3] text-[16px] font-medium leading-[16px] !text-[#ffffff] hover:!bg-[#6a37c3] hover:opacity-100 focus:!bg-[#6a37c3] focus:opacity-100 focus-visible:!bg-[#6a37c3] focus-visible:opacity-100 active:!bg-[#6a37c3] active:opacity-100 md:w-auto md:min-w-[180px] md:text-[var(--type-helper-size)] md:leading-none"
        >
          {t(`analyze.failure.${action}`)}
        </Button>
      )}
    />
  );

  return (
    <>
      <Surface tone="plain" className="hidden p-8 md:mt-6 md:block">
        {content}
      </Surface>
      <MobilePageFrame
        className="md:hidden"
        contentEndInset={false}
        contentClassName="flex flex-col max-md:pt-0"
        appBar={{
          title: t('analyze.title'),
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
        <BetweenBlocks
          data-analyze-failure-slot
          data-mobile-outcome-slot
          className="px-6"
          outcomeClassName="flex justify-center"
        >
          {content}
        </BetweenBlocks>
      </MobilePageFrame>
    </>
  );
}

type AnalyzeFailureAction = 'uploadAnother' | 'retry';

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
    <MobilePageFrame
      appBar={{
        title: onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            aria-label={t('analyze.mobileResultTitle')}
            className="w-full truncate border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#572d9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efebf6]"
          >
            {t('analyze.mobileResultTitle')}
          </button>
        ) : t('analyze.mobileResultTitle'),
        headingLevel: 1,
        titleAlign: 'start',
        compactLayout: 'leading-only',
        tone: 'canvas',
        desktopHeader: {
          description: t('analyze.description'),
        },
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

      <div className="mx-auto w-full max-w-[430px] px-6 pb-8 md:max-w-none md:px-0 md:pb-14">
      <h2 className="text-[20px] font-medium leading-none text-[#572d9f]">
          {t('analyze.mobileResultHeading')}
        </h2>

        {access.orderedChapters.length === 0 ? (
          <Surface tone="plain" variant="mobile-flat" className="mt-6 rounded-[8px] p-6 shadow-none">
            <EmptyState title={t('analyze.noResults')} />
          </Surface>
        ) : (
          <>
            <article className="mt-6 rounded-[8px] bg-[#ffffff] px-6 py-4">
              <div className="flex items-center gap-6">
                <HugeiconsIcon icon={StarIcon} size={32} strokeWidth={1.7} className="shrink-0 text-[#865bcf]" aria-hidden="true" />
                <div className="min-w-0">
            <p className="text-[12px] font-medium leading-3 text-[#865bcf]">{t('analyze.mobileScoreLabel')}</p>
            <p className="mt-1 flex items-end font-medium leading-none">
              <span className="text-[32px] leading-8 text-[#161519]">{totalScore}</span>
            <span className="ml-1 pb-[4px]">
              <span className="text-[20px] font-normal leading-5 text-[#524d5b]">/{totalMaxScore}</span>
            </span>
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

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {access.freeChapter && (
                <AnalyzeChapterCard
                  chapter={access.freeChapter}
                  locked={false}
                  mode="detail"
                  practiceTo={`/practice-by-topic?chapterId=${encodeURIComponent(String(access.freeChapter.chapter_id))}`}
                />
              )}
              {access.lockedChapters.map((chapter) => (
                <AnalyzeChapterCard key={getAnalyzeChapterKey(chapter)} chapter={chapter} locked mode="detail" />
              ))}
            </div>
          </>
        )}
      </div>
    </MobilePageFrame>
  );
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

function useAnalyzeProgressSnapshot(
  currentTask: AnalyzeTask | null | undefined,
  progressOverride: { percent?: number; sourceReferenceOnly?: boolean } = {},
) {
  const progressInput: AnalyzeProgressInput = {
    taskId: currentTask?.task_id ?? null,
    hasTask: Boolean(currentTask),
    status: currentTask?.status,
    stage: currentTask?.stage,
  };
  const [progressSnapshot, setProgressSnapshot] = useState(() => syncAnalyzeProgressSnapshot(
    createAnalyzeProgressSnapshot(),
    progressInput,
    progressOverride,
  ));

  useEffect(() => {
    setProgressSnapshot((current) => syncAnalyzeProgressSnapshot(current, progressInput, progressOverride));
  }, [currentTask?.stage, currentTask?.status, currentTask?.task_id, progressOverride.percent, progressOverride.sourceReferenceOnly]);

  useEffect(() => {
    if (Number.isFinite(progressOverride.percent)) return;

    const timer = window.setInterval(() => {
      setProgressSnapshot((current) => tickAnalyzeProgressSnapshot(current, progressInput));
    }, SMOOTH_PROGRESS_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [currentTask?.stage, currentTask?.status, currentTask?.task_id, progressOverride.percent]);

  return progressSnapshot;
}
