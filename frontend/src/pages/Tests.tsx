import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLatestAnalyzeResult } from '../api/analyze';
import type { AnalyzeChapterResult } from '../types';
import {
  buildTestsWeakTopics,
  getWeakTopicSearchTarget,
  TestsHubView,
} from '../features/tests';

export function Tests() {
  const { i18n } = useTranslation();
  const [latestResults, setLatestResults] = useState<AnalyzeChapterResult[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  const loadLatestResults = useCallback(() => {
    let cancelled = false;

    setStatus('loading');
    getLatestAnalyzeResult(i18n.language)
      .then((data) => {
        if (cancelled) return;
        setLatestResults(data);
        setStatus(data.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  useEffect(() => {
    return loadLatestResults();
  }, [loadLatestResults]);

  const weakTopics = useMemo(() => buildTestsWeakTopics(latestResults), [latestResults]);
  const weakTopicSearchTarget = getWeakTopicSearchTarget(weakTopics);

  return (
    <TestsHubView
      weakTopics={weakTopics}
      weakTopicSearchTarget={weakTopicSearchTarget}
      status={status}
      onRetry={loadLatestResults}
    />
  );
}
