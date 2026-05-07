import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Brain01Icon } from '@hugeicons/core-free-icons';
import axios from 'axios';
import { createSearchTask, buildSseUrl } from '../api/search';
import { useSSE } from '../hooks/useSSE';
import { LoadingPanel } from '../components/LoadingPanel';
import { SemanticResultCard } from '../components/SemanticResultCard';

const MIN_CHARS = 10;

export function SemanticSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sseUrl = taskId ? buildSseUrl(taskId) : null;
  const { messages, result, isLoading, error } = useSSE(sseUrl);

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
      let message = t('common.error');
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = (err.response.data as { detail?: string }).detail;
        if (typeof detail === 'string') message = detail;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTaskId(null);
    setQuery('');
    setSubmitError(null);
  }

  const submitDisabled = query.trim().length < MIN_CHARS || submitting || isLoading;
  const successResult = result?.status === 'success' ? result.result : null;
  const failureMessage =
    submitError ?? (result?.status === 'failure' ? result.error ?? error : error);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <h1 className="font-medium text-[36px] text-text mb-8 text-center max-md:text-[26px] flex items-center justify-center gap-3">
        <HugeiconsIcon icon={Brain01Icon} size={36} strokeWidth={1.5} />
        {t('semanticSearch.title')}
      </h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('semanticSearch.placeholder')}
          rows={5}
          className="w-full bg-surface border border-border rounded-[15px] p-5 text-[16px] text-text outline-none focus:border-accent shadow-feature resize-y min-h-[140px]"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-muted">
            {query.trim().length < MIN_CHARS
              ? t('semanticSearch.minChars')
              : `${query.trim().length}`}
          </span>
          <button
            type="submit"
            disabled={submitDisabled}
            className="bg-primary text-surface rounded-[10px] px-6 py-3 text-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-muted text-[14px] mb-4">{failureMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-surface rounded-[10px] px-5 py-2 text-[14px] hover:opacity-90 transition-opacity"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
}
