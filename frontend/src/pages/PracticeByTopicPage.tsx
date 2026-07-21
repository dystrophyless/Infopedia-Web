import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLatestAnalyzeResult } from '../api/analyze';
import { selectAnalyzeResultAccess } from '../features/analyze/model/resultAccess';
import type { AnalyzeChapterResult } from '../types';
import { PracticeByTopicView, type PracticeByTopicData } from '../features/tests';

const createUnavailableData = (state: PracticeByTopicData['state']): PracticeByTopicData => ({
  state,
  chapterTitle: '',
  score: 0,
  maxScore: 0,
  lostPoints: 0,
  questionCount: 0,
  weightedQuestionCount: null,
  completedPercent: null,
  topics: [],
});

function isTopicCompleted(topic: NonNullable<AnalyzeChapterResult['topic_codes']>[number]): boolean {
  return topic.status === 'completed' || (typeof topic.progress === 'number' && topic.progress >= 100);
}

function toPracticeData(chapter: AnalyzeChapterResult): PracticeByTopicData {
  const topicCodes = chapter.topic_codes ?? [];
  const firstAvailableTopicIndex = topicCodes.findIndex((topic) => !isTopicCompleted(topic));
  const topics = topicCodes.map((topic, index) => ({
    id: topic.name,
    title: topic.title,
    status: isTopicCompleted(topic)
      ? ('completed' as const)
      : index === firstAvailableTopicIndex
        ? ('active' as const)
        : ('pending' as const),
  }));

  return {
    state: 'ready',
    chapterTitle: chapter.title,
    score: chapter.score,
    maxScore: chapter.max_score,
    lostPoints: Math.max(0, chapter.max_score - chapter.score),
    questionCount: chapter.question_count,
    weightedQuestionCount: Math.max(0, chapter.max_score - chapter.question_count),
    completedPercent: 0,
    topics,
  };
}

export function PracticeByTopicPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<AnalyzeChapterResult[] | null | undefined>(undefined);
  const requestedChapterIdValue = searchParams.get('chapterId');
  const requestedChapterId = requestedChapterIdValue ? Number(requestedChapterIdValue) : Number.NaN;

  useEffect(() => {
    let active = true;
    getLatestAnalyzeResult(i18n.language)
      .then((data) => active && setResults(data))
      .catch(() => active && setResults(null));
    return () => {
      active = false;
    };
  }, [i18n.language]);

  const data = useMemo(() => {
    if (results === undefined) return createUnavailableData('loading');
    if (results === null) return createUnavailableData('unavailable');
    if (!Number.isInteger(requestedChapterId)) return createUnavailableData('unavailable');

    const access = selectAnalyzeResultAccess(results);
    const chapter = access.freeChapter?.chapter_id === requestedChapterId ? access.freeChapter : null;

    return chapter?.topic_codes?.length
      ? toPracticeData(chapter)
      : createUnavailableData('unavailable');
  }, [requestedChapterId, results]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/analyze', { replace: true });
  };

  return (
    <PracticeByTopicView
      data={data}
      onBack={handleBack}
      onTopicStart={(topic) => navigate(`/tests/default?topicCode=${encodeURIComponent(topic.id)}`)}
    />
  );
}
