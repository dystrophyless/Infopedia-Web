import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLatestAnalyzeResult } from '../api/analyze';
import { getTestsDashboard, isTestsCatalogError, type TestsDashboard } from '../api/tests';
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
  const [dashboard, setDashboard] = useState<TestsDashboard | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<'loading' | 'ready' | 'error' | 'catalog'>('loading');
  const latestRequestRef = useRef(0);
  const dashboardRequestRef = useRef(0);

  const loadLatestResults = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    let cancelled = false;

    setStatus('loading');
    getLatestAnalyzeResult(i18n.language)
      .then((data) => {
        if (cancelled || latestRequestRef.current !== requestId) return;
        setLatestResults(data);
        setStatus(data.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (!cancelled && latestRequestRef.current === requestId) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (latestRequestRef.current === requestId) latestRequestRef.current += 1;
    };
  }, [i18n.language]);

  useEffect(() => {
    return loadLatestResults();
  }, [loadLatestResults]);

  const loadDashboard = useCallback(() => {
    const requestId = ++dashboardRequestRef.current;
    let cancelled = false;

    setDashboardStatus('loading');
    getTestsDashboard(i18n.language)
      .then((data) => {
        if (cancelled || dashboardRequestRef.current !== requestId) return;
        setDashboard(data);
        setDashboardStatus('ready');
      })
      .catch((error: unknown) => {
        if (!cancelled && dashboardRequestRef.current === requestId) {
          setDashboardStatus(isTestsCatalogError(error) ? 'catalog' : 'error');
        }
      });

    return () => {
      cancelled = true;
      if (dashboardRequestRef.current === requestId) dashboardRequestRef.current += 1;
    };
  }, [i18n.language]);

  useEffect(() => loadDashboard(), [loadDashboard]);

  const weakTopics = useMemo(() => buildTestsWeakTopics(latestResults), [latestResults]);
  const weakTopicSearchTarget = getWeakTopicSearchTarget(weakTopics);

  return (
    <TestsHubView
      weakTopics={weakTopics}
      weakTopicSearchTarget={weakTopicSearchTarget}
      status={status}
      onRetry={loadLatestResults}
      dashboard={dashboard}
      dashboardStatus={dashboardStatus}
      onDashboardRetry={loadDashboard}
    />
  );
}
