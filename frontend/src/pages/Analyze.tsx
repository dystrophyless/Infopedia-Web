import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  BookOpen01Icon,
  Cancel01Icon,
  FileUploadIcon,
} from '@hugeicons/core-free-icons';
import { buildAnalyzeSseUrl, createAnalyzeTask, getAnalyzeTask } from '../api/analyze';
import { useSSE } from '../hooks/useSSE';
import { getApiErrorMessage, getTaskErrorMessage } from '../utils/apiError';
import { clampScorePercent, getScoreStatus } from '../utils/scoreStatus';
import type { AnalyzeBookCoverage, AnalyzeChapterResult, AnalyzeTask } from '../types';

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

type AnalyzeSortDirection = 'weakFirst' | 'strongFirst';

export function Analyze() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [createdTask, setCreatedTask] = useState<AnalyzeTask | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pollTask, setPollTask] = useState<AnalyzeTask | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [sortDirection, setSortDirection] = useState<AnalyzeSortDirection>('weakFirst');

  const sseUrl = taskId ? buildAnalyzeSseUrl(taskId) : null;
  const {
    messages,
    result: sseResult,
    error: sseError,
  } = useSSE<AnalyzeTask>(sseUrl);

  const currentTask = sseResult ?? pollTask ?? messages.at(-1) ?? createdTask;
  const isTerminal = currentTask ? TERMINAL_STATUSES.has(currentTask.status) : false;
  const isProcessing = submitting || Boolean(taskId && !isTerminal && !pollError);
  const showUploadForm = !isTerminal && !isProcessing;
  const failureMessage =
    submitError ??
    pollError ??
    (currentTask?.status === 'failure' ? getTaskErrorMessage(currentTask.error) : null) ??
    (sseError && !polling ? sseError : null);
  const successResults = currentTask?.status === 'success' ? currentTask.result ?? [] : [];
  const uniqueSuccessResults = useMemo(
    () => getUniqueAnalyzeChapterResults(successResults),
    [successResults],
  );
  const sortedResults = useMemo(
    () => sortChaptersByPercentage(uniqueSuccessResults, sortDirection),
    [uniqueSuccessResults, sortDirection],
  );
  const summary = useMemo(() => getAnalyzeSummary(uniqueSuccessResults), [uniqueSuccessResults]);

  useEffect(() => {
    if (!taskId || !sseError || sseResult) return;

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
  }, [sseError, sseResult, taskId, t]);

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
      const task = await createAnalyzeTask(file as File);
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
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] overflow-x-hidden px-6 py-12 max-md:px-4">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
            {t('analyze.eyebrow')}
          </p>
          <h1 className="mt-3 text-[38px] font-medium leading-tight text-text max-md:text-[30px]">
            {t('analyze.title')}
          </h1>
          <p className="mt-3 max-w-[720px] text-[16px] leading-7 text-text-body">
            {t('analyze.description')}
          </p>
        </div>
        {isTerminal && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-primary px-5 text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            {t('analyze.newUpload')}
          </button>
        )}
      </header>

      {showUploadForm && (
        <form onSubmit={handleSubmit} className="rounded-[8px] border border-border bg-surface p-6 shadow-feature">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 max-lg:grid-cols-1">
            <div className="flex min-w-0 flex-col justify-between rounded-[8px] bg-bg px-5 py-5">
              <div>
                <h2 className="text-[22px] font-medium leading-tight text-primary">
                  {t('analyze.uploadInstructionTitle')}
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-text-body">
                  {t('analyze.uploadInstructionBody')}
                </p>
              </div>

              <ol className="mt-6 grid gap-4">
                <InstructionStep
                  number="1"
                  title={t('analyze.uploadStep1Title')}
                  body={t('analyze.uploadStep1Body')}
                />
                <InstructionStep
                  number="2"
                  title={t('analyze.uploadStep2Title', { size: formatBytes(MAX_ANALYZE_UPLOAD_BYTES) })}
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
              className="group flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-border bg-bg px-6 py-10 text-center transition-colors hover:border-accent hover:bg-surface focus-within:border-accent"
            >
              <input
                id="analyze-file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={submitting || Boolean(taskId)}
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <span className="flex size-16 items-center justify-center rounded-[8px] bg-surface text-primary transition-colors group-hover:bg-bg">
                <HugeiconsIcon icon={FileUploadIcon} size={34} strokeWidth={1.6} />
              </span>
              <span className="mt-5 text-[26px] font-medium leading-tight text-primary max-md:text-[22px]">
                {file ? file.name : t('analyze.uploadTitle')}
              </span>
              <span className="mt-2 text-[15px] leading-6 text-text-body">
                {file
                  ? t('analyze.fileMeta', { size: formatBytes(file.size) })
                  : t('analyze.uploadHint', { size: formatBytes(MAX_ANALYZE_UPLOAD_BYTES) })}
              </span>
              <span className="mt-3 max-w-[420px] text-[14px] leading-6 text-muted">
                {t('analyze.uploadDropHint')}
              </span>
            </label>
          </div>

          {file && !taskId && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-bg px-4 py-3">
              <span className="min-w-0 truncate text-[15px] text-primary">{file.name}</span>
              <button
                type="button"
                onClick={() => handleFileChange(null)}
                aria-label={t('analyze.clearFile')}
                className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-surface hover:text-accent"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {failureMessage && (
            <p className="mt-4 rounded-[8px] bg-danger/10 px-4 py-3 text-[14px] text-danger" role="alert">
              {failureMessage}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[580px] text-[14px] leading-6 text-muted">
              {t('analyze.privacyNote')}
            </p>
            <button
              type="submit"
              disabled={!file || submitting || Boolean(taskId)}
              className="inline-flex h-[46px] items-center justify-center rounded-[8px] bg-primary px-6 text-[16px] font-medium text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
            >
              {submitting ? t('common.loading') : t('analyze.submit')}
            </button>
          </div>
        </form>
      )}

      {isProcessing && (
        <AnalyzeProgress
          currentTask={currentTask}
        />
      )}

      {!isProcessing && currentTask?.status === 'failure' && (
        <AnalyzeFailure message={failureMessage ?? t('common.error')} onReset={reset} />
      )}

      {!isProcessing && currentTask?.status === 'success' && (
        <AnalyzeResults
          results={sortedResults}
          summary={summary}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
        />
      )}
    </div>
  );
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
      <span className="flex size-9 items-center justify-center rounded-[8px] bg-surface text-[15px] font-medium text-primary">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block min-w-0 break-words text-[15px] font-medium leading-tight text-text">
          {title}
        </span>
        <span className="mt-1 block min-w-0 break-words text-[13px] leading-5 text-muted">
          {body}
        </span>
      </span>
    </li>
  );
}

function AnalyzeProgress({
  currentTask,
}: {
  currentTask: AnalyzeTask | null | undefined;
}) {
  const { t } = useTranslation();
  const currentStage = currentTask?.stage ?? currentTask?.status ?? 'pending';
  const progressPercent = useSmoothAnalyzeProgress();

  return (
    <section className="mt-6 overflow-hidden rounded-[8px] border border-border bg-surface shadow-feature">
      <div className="h-1 bg-bg" aria-hidden>
        <div className="h-full w-1/3 animate-[analyze-scan_1.8s_ease-in-out_infinite] bg-accent" />
      </div>

      <div className="p-8 max-md:p-5">
        <div className="max-w-[760px]">
          <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
            {t('analyze.progressCurrentStage')}
          </p>
          <h2 className="mt-3 text-[30px] font-medium leading-tight text-primary max-md:text-[24px]">
            {t('analyze.progressTitle')}
          </h2>
          <p className="mt-3 text-[15px] leading-6 text-text-body">
            {t('analyze.progressSubtitle')}
          </p>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between gap-4 text-[14px] font-medium text-primary">
            <span>{getStageLabel(currentStage, t)}</span>
            <span>{t('analyze.progressPercent', { percent: progressPercent })}</span>
          </div>
          <div
            className="h-4 overflow-hidden rounded-full bg-bg"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label={t('analyze.progressTitle')}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyzeFailure({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="mt-6 rounded-[8px] border border-danger/40 bg-surface p-8 text-center shadow-feature">
      <span className="mx-auto flex size-14 items-center justify-center rounded-[8px] bg-danger/10 text-danger">
        <HugeiconsIcon icon={AlertCircleIcon} size={30} strokeWidth={1.6} />
      </span>
      <h2 className="mt-5 text-[26px] font-medium leading-tight text-text">
        {t('analyze.errorTitle')}
      </h2>
      <p className="mx-auto mt-3 max-w-[620px] text-[15px] leading-6 text-text-body">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex h-[44px] items-center justify-center rounded-[8px] bg-primary px-5 text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
      >
        {t('common.tryAgain')}
      </button>
    </section>
  );
}

function AnalyzeResults({
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
      <p className="mt-8 rounded-[8px] border border-border bg-surface p-8 text-center text-muted shadow-feature">
        {t('analyze.noResults')}
      </p>
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
        <p className="text-[15px] font-medium text-primary">{t('analyze.sortLabel')}</p>
        <div className="inline-flex rounded-[8px] border border-border/70 bg-bg/60 p-1">
          <button
            type="button"
            onClick={() => onSortDirectionChange('weakFirst')}
            aria-pressed={sortDirection === 'weakFirst'}
            className={`h-9 rounded-[7px] px-4 text-[14px] font-medium transition-colors ${
              sortDirection === 'weakFirst'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-muted hover:bg-surface/70 hover:text-primary'
            }`}
          >
            {t('analyze.sortWeakFirst')}
          </button>
          <button
            type="button"
            onClick={() => onSortDirectionChange('strongFirst')}
            aria-pressed={sortDirection === 'strongFirst'}
            className={`h-9 rounded-[7px] px-4 text-[14px] font-medium transition-colors ${
              sortDirection === 'strongFirst'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-muted hover:bg-surface/70 hover:text-primary'
            }`}
          >
            {t('analyze.sortStrongFirst')}
          </button>
        </div>
      </div>

      <section className="mt-6 grid gap-4">
        {results.map((chapter) => (
          <ChapterCard key={getAnalyzeChapterKey(chapter)} chapter={chapter} />
        ))}
      </section>
    </div>
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
  return (
    <article className="rounded-[8px] border border-border bg-surface p-5 shadow-feature">
      <p
        className="text-[32px] font-medium leading-none text-primary"
        style={status ? { color: status.textColor } : undefined}
      >
        {value}
      </p>
      <p className="mt-3 text-[14px] leading-tight text-text-body">{label}</p>
    </article>
  );
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
    <article className="rounded-[8px] border border-border bg-surface p-6 shadow-feature">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight text-primary max-md:text-[20px]">
            {getChapterLabel(chapter.chapter, t)}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2 max-sm:items-start">
          <span
            className="text-[32px] font-medium leading-none"
            style={{ color: scoreStatus.textColor }}
          >
            {chapter.percentage}%
          </span>
          <span
            className="rounded-full border px-3 py-1 text-[12px] font-medium leading-none"
            style={{
              backgroundColor: scoreStatus.backgroundColor,
              borderColor: scoreStatus.borderColor,
              color: scoreStatus.textColor,
            }}
          >
            {t(scoreStatus.labelKey)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_190px] gap-3 max-md:grid-cols-1">
        <div className="rounded-[8px] bg-bg px-4 py-3">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
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
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
            {t('analyze.chapterQuestionsLabel')}
          </p>
          <p className="mt-2 text-[18px] font-medium leading-tight text-text">
            {t('analyze.chapterQuestionsValue', { count: chapter.question_count })}
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-bg" aria-hidden>
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: scoreStatus.progressColor }}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-[16px] font-medium text-primary">
          <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={1.7} />
          <span>{t('analyze.booksTitle')}</span>
        </div>
        {chapter.books.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-[8px] border border-border/60">
              <table className="w-full min-w-[560px] border-collapse">
                <thead className="bg-bg text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
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
                        <span className="min-w-0 text-[15px] font-medium text-text">
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
                      <td className="px-4 py-4 text-right text-[14px] text-text-body">
                        {t('analyze.bookTopicsValue', { count: book.topic_count })}
                      </td>
                      <td className="px-4 py-4 text-right text-[15px] font-medium text-primary">
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
                className="mt-3 inline-flex h-10 items-center justify-center rounded-[8px] border border-border px-4 text-[14px] font-medium text-primary transition-colors hover:bg-bg"
              >
                {booksExpanded
                  ? t('analyze.hideBooks')
                  : t('analyze.showMoreBooks', { count: hiddenBooksCount })}
              </button>
            )}
          </>
        ) : (
          <p className="rounded-[8px] bg-bg px-4 py-3 text-[14px] text-muted">
            {t('analyze.noBooks')}
          </p>
        )}
      </div>
    </article>
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
    return t('analyze.errors.fileTooLarge', { size: formatBytes(MAX_ANALYZE_UPLOAD_BYTES) });
  }

  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const hasPdfType = file.type ? PDF_CONTENT_TYPES.has(file.type) : false;
  if (!hasPdfExtension && !hasPdfType) return t('analyze.errors.invalidType');

  return null;
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

    return first.chapter.localeCompare(second.chapter);
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
  return normalizeAnalyzeIdentity(chapter.chapter);
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

function getChapterLabel(chapter: string, t: (key: string) => string) {
  const key = `analyze.chapters.${chapter}`;
  const translated = t(key);
  return translated === key ? chapter : translated;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${Math.round((kilobytes / 1024) * 10) / 10} MB`;
}
