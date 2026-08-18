import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSearchTask, buildSseUrl } from '../api/search';
import { useSSE } from '../hooks/useSSE';
import { LoadingPanel } from '../components/LoadingPanel';
import { SemanticResultCard } from '../features/terms/components/SemanticResultCard';
import { getApiErrorMessage, getTaskErrorMessage } from '../utils/apiError';
import { MobilePageFrame, Textarea } from '../ui';
import type { Definition, SearchTask, SearchTaskError } from '../types';
import { isSemanticSearchMobileNavHidden, useMobileBottomNavOverride } from '../features/navigation';

const MIN_CHARS = 10;

export function SemanticSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sseUrl = taskId ? buildSseUrl(taskId) : null;
  const { messages, result, isLoading, error } = useSSE<SearchTask>(sseUrl);
  const mobileNavHidden = isSemanticSearchMobileNavHidden({
    submitting,
    taskId,
    terminalResult: result,
  });
  useMobileBottomNavOverride({ visibility: mobileNavHidden ? 'hide' : 'show' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < MIN_CHARS) return;
    setSubmitError(null);
    setTaskId(null);
    setSubmitting(true);
    try {
      const task = await createSearchTask(query.trim());
      setTaskId(task.task_id);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, t('common.error')));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTaskId(null);
    setQuery('');
    setSubmitError(null);
  }

  function formatSearchTaskError(value: SearchTaskError | string | null | undefined): string | null {
    return getTaskErrorMessage(value);
  }

  const submitDisabled = query.trim().length < MIN_CHARS || submitting || isLoading;
  const successResult: Definition | null =
    result?.status === 'success' && result.result
      ? {
          public_id: result.result.definition_public_id,
          text: result.result.text,
          page: result.result.page,
          topic: {
            name: result.result.topic,
            book: {
              publisher: result.result.book_publisher,
              grade: result.result.book_grade,
            },
          },
        }
      : null;
  const failureMessage =
    submitError ?? (result?.status === 'failure' ? formatSearchTaskError(result.error) ?? error : error);

  return (
    <MobilePageFrame
      tone="canvas"
      contentId="semantic-search-content"
      contentLabel={t('semanticSearch.title')}
      appBar={{
        title: t('semanticSearch.title'),
        tone: 'canvas',
        titleAlign: 'start',
        compactLayout: 'leading-only',
        desktopHeader: {
          description: t('semanticSearch.description'),
        },
      }}
    >
    <div className="mx-auto max-w-[900px] px-6 py-14 pb-14 pt-2 md:pt-0 max-md:px-4">
      <p className="mb-8 text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted md:hidden">
        {t('semanticSearch.eyebrow')}
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <label htmlFor="semantic-query" className="sr-only">
          {t('semanticSearch.title')}
        </label>
        <Textarea
          id="semantic-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('semanticSearch.placeholder')}
          rows={5}
          aria-describedby="semantic-query-hint"
          className="min-h-[140px] rounded-[15px] p-5 text-[16px] leading-none focus-visible:border-accent"
        />
        <div className="mt-3 flex items-center justify-between">
          <span id="semantic-query-hint" className="text-[13px] leading-none text-muted">
            {query.trim().length < MIN_CHARS
              ? t('semanticSearch.minChars')
              : t('semanticSearch.charCount', { count: query.trim().length })}
          </span>
          <button
            type="submit"
            disabled={submitDisabled}
            className="bg-primary text-surface rounded-[10px] px-6 py-3 text-[16px] leading-none hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('common.loading') : t('semanticSearch.submit')}
          </button>
        </div>
      </form>

      {isLoading && <LoadingPanel messages={messages} />}

      {!isLoading && successResult && (
        <SemanticResultCard definition={successResult} />
      )}

      {!isLoading && !successResult && result?.status === 'success' && (
        <p className="text-muted text-center py-8">{t('semanticSearch.noResult')}</p>
      )}

      {!isLoading && failureMessage && (
        <div className="bg-surface border border-danger/40 rounded-[15px] p-8 text-center">
          <p className="text-text font-medium mb-2">
            {t('semanticSearch.errorTitle')}
          </p>
          <p className="text-muted text-[14px] leading-none mb-4">{failureMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-surface rounded-[10px] px-5 py-2 text-[14px] leading-none hover:opacity-90 transition-opacity"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
    </div>
    </MobilePageFrame>
  );
}
