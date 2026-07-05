import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon, Target01Icon } from '@hugeicons/core-free-icons';
import { getLatestAnalyzeResult } from '../api/analyze';
import { buildWeakTopicInsights } from '../utils/weakTopics';
import type { AnalyzeChapterResult } from '../types';

type TestsWeakTopic = {
  chapter: string;
  percentage: number;
};

const MAX_WEAK_TOPIC_ROWS = 3;

const FALLBACK_WEAK_TOPICS: TestsWeakTopic[] = [
  { chapter: 'Устройство компьютера', percentage: 21 },
  { chapter: 'Реляционные базы данных', percentage: 33 },
  {
    chapter: 'Аппаратное обеспечение. Программное обеспечение',
    percentage: 47,
  },
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getWeakTopicSearchTarget(topics: TestsWeakTopic[]): string {
  const firstTopic = topics[0]?.chapter.trim();
  if (!firstTopic) return '/search';
  return `/search?query=${encodeURIComponent(firstTopic)}`;
}

export function Tests() {
  const { t } = useTranslation();
  const [latestResults, setLatestResults] = useState<AnalyzeChapterResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getLatestAnalyzeResult()
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
  }, []);

  const weakTopics = useMemo<TestsWeakTopic[]>(() => {
    const liveWeakTopics = buildWeakTopicInsights(latestResults ?? [])
      .slice(0, MAX_WEAK_TOPIC_ROWS)
      .map((topic) => ({
        chapter: topic.chapter,
        percentage: topic.percentage,
      }));

    return liveWeakTopics.length > 0 ? liveWeakTopics : FALLBACK_WEAK_TOPICS;
  }, [latestResults]);

  const weakTopicSearchTarget = getWeakTopicSearchTarget(weakTopics);

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 max-md:min-h-[100dvh] max-md:px-6 max-md:pb-0 max-md:pt-[90px] md:flex md:justify-center">
      <main className="w-full max-w-[382px]" aria-busy={loading}>
        <h1 className="text-[24px] font-medium leading-[24px] text-black">
          {t('tests.title', { defaultValue: 'Тесты' })}
        </h1>

        <section className="mt-8" aria-labelledby="weak-points-title">
          <h2
            id="weak-points-title"
            className="text-[20px] font-medium leading-[20px] text-[#572d9f]"
          >
            {t('tests.weakPointsTitle', { defaultValue: 'Проблемные точки' })}
          </h2>

          <div className="mt-6 rounded-[16px] bg-[#865bcf] p-6 text-[#fbfbfb]">
            <h3 className="text-[16px] font-medium leading-[16px]">
              {t('tests.yourWeakTopicsTitle', { defaultValue: 'Ваши слабые темы' })}
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              {weakTopics.map((topic) => (
                <WeakTopicProgressRow key={topic.chapter} topic={topic} />
              ))}
            </div>
          </div>

          <article className="mt-4 rounded-[16px] bg-[#fbfbfb] p-6">
            <div className="flex items-center gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-medium leading-[16px] text-[#6a37c3]">
                  {t('tests.weakTopicsTestTitle', { defaultValue: 'Тест по слабым темам' })}
                </h3>
                <p className="mt-2 text-[14px] leading-[14px] text-[#524d5b]">
                  {t('tests.weakTopicsTestDescription', {
                    defaultValue: 'Подборка вопросов из 3 разделов, где у вас низкий результат',
                  })}
                </p>
              </div>
              <HugeiconsIcon
                icon={Target01Icon}
                size={24}
                strokeWidth={1.8}
                className="shrink-0 text-[#6a37c3]"
                aria-hidden
              />
            </div>

            <Link
              to={weakTopicSearchTarget}
              className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[16px] font-medium leading-[16px] text-[#fbfbfb] transition-opacity hover:opacity-90"
            >
              {t('tests.startTestButton', { defaultValue: 'Начать тест' })}
            </Link>
          </article>
        </section>

        <section className="mt-12" aria-labelledby="other-tests-title">
          <h2
            id="other-tests-title"
            className="text-[20px] font-medium leading-[20px] text-[#572d9f]"
          >
            {t('tests.otherTestsTitle', { defaultValue: 'Другие тесты' })}
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            <TestListRow
              title={t('tests.regularTestTitle', { defaultValue: 'Обычный тест' })}
              description={t('tests.regularTestDescription', {
                defaultValue: '10 случайных вопросов из всех разделов',
              })}
              to="/tests/default"
            />
            <TestListRow
              title={t('tests.sectionTestsTitle', { defaultValue: 'Тесты по разделам' })}
              description={t('tests.sectionTestsDescription', {
                defaultValue: 'Сфокусируйтесь на нужном разделе',
              })}
              to="/search"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function WeakTopicProgressRow({ topic }: { topic: TestsWeakTopic }) {
  const percent = clampPercent(topic.percentage);

  return (
    <div className="grid min-h-3 grid-cols-[minmax(0,1fr)_148px] items-center gap-[10px]">
      <p className="min-w-0 overflow-hidden text-[12px] font-normal leading-[12px] text-[#fbfbfb] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {topic.chapter}
      </p>
      <div className="flex items-center justify-end gap-2">
        <div className="h-1 w-[112px] overflow-hidden rounded-[8px] bg-[rgba(251,251,251,0.5)]">
          <span
            className="block h-full rounded-[8px] bg-[#fbfbfb]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-7 text-[12px] font-medium leading-[12px] text-[#fbfbfb]">
          {percent}%
        </span>
      </div>
    </div>
  );
}

function TestListRow({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[70px] items-center gap-6 rounded-[16px] bg-[#fbfbfb] px-6 py-4 transition-opacity hover:opacity-90"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium leading-[16px] text-[#6a37c3]">
          {title}
        </span>
        <span className="mt-2 block text-[14px] font-normal leading-[14px] text-[#524d5b]">
          {description}
        </span>
      </span>
      <HugeiconsIcon
        icon={ArrowRight02Icon}
        size={24}
        strokeWidth={1.8}
        className="shrink-0 text-[#6a37c3]"
        aria-hidden
      />
    </Link>
  );
}
