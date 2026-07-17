import { useEffect, useMemo, useState } from 'react';
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
  const [latestResults, setLatestResults] = useState<AnalyzeChapterResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getLatestAnalyzeResult(i18n.language)
      .then((data) => {
        if (!cancelled) setLatestResults(data);
      })
      .catch(() => {
        if (!cancelled) setLatestResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const weakTopics = useMemo(() => buildTestsWeakTopics(latestResults), [latestResults]);
  const weakTopicSearchTarget = getWeakTopicSearchTarget(weakTopics);

  return (
    <TestsHubView
      weakTopics={weakTopics}
      weakTopicSearchTarget={weakTopicSearchTarget}
      loading={loading}
    />
  );
}
