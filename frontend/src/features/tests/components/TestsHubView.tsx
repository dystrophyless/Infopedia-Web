import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Target01Icon } from '@hugeicons/core-free-icons';
import { Skeleton } from '../../../ui';
import type { TestsWeakTopic } from '../model';
import { TestEntryLink } from './TestEntryLink';
import { WeakTopicProgressList } from './WeakTopicProgressList';

export interface TestsHubViewProps {
  weakTopics: TestsWeakTopic[];
  weakTopicSearchTarget: string;
  loading?: boolean;
}

export function TestsHubView({
  weakTopics,
  weakTopicSearchTarget,
  loading = false,
}: TestsHubViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 max-md:min-h-[100dvh] max-md:px-6 max-md:pb-0 max-md:pt-[90px] md:flex md:justify-center">
      <main className="w-full max-w-[382px]" aria-busy={loading}>
        <h1 className="text-[24px] font-medium leading-[24px] text-black">
          {t('tests.title', { defaultValue: 'Тесты' })}
        </h1>

        <section className="mt-8" aria-labelledby="weak-points-title">
          <h2 id="weak-points-title" className="text-[20px] font-medium leading-[20px] text-[#572d9f]">
            {t('tests.weakPointsTitle', { defaultValue: 'Проблемные точки' })}
          </h2>

          <div className="mt-6 rounded-[16px] bg-[#865bcf] p-6 text-[#fbfbfb]">
            <h3 className="text-[16px] font-medium leading-[16px]">
              {t('tests.yourWeakTopicsTitle', { defaultValue: 'Ваши слабые темы' })}
            </h3>
            {loading ? (
              <div className="mt-4 flex flex-col gap-2" role="status" aria-live="polite">
                <span className="sr-only">{t('common.loading', { defaultValue: 'Загрузка' })}</span>
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-3 w-full bg-white/30" />
                ))}
              </div>
            ) : (
              <WeakTopicProgressList topics={weakTopics} />
            )}
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
              <HugeiconsIcon icon={Target01Icon} size={24} strokeWidth={1.8} className="shrink-0 text-[#6a37c3]" aria-hidden />
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
          <h2 id="other-tests-title" className="text-[20px] font-medium leading-[20px] text-[#572d9f]">
            {t('tests.otherTestsTitle', { defaultValue: 'Другие тесты' })}
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            <TestEntryLink
              title={t('tests.regularTestTitle', { defaultValue: 'Обычный тест' })}
              description={t('tests.regularTestDescription', { defaultValue: '10 случайных вопросов из всех разделов' })}
              to="/tests/default"
            />
            <TestEntryLink
              title={t('tests.sectionTestsTitle', { defaultValue: 'Тесты по разделам' })}
              description={t('tests.sectionTestsDescription', { defaultValue: 'Сфокусируйтесь на нужном разделе' })}
              to="/search"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
