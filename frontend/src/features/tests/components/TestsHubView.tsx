import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoalIcon } from '@hugeicons/core-free-icons';
import { Skeleton } from '../../../ui';
import type { TestsWeakTopic } from '../model';
import { TestEntryLink } from './TestEntryLink';
import { WeakTopicProgressList } from './WeakTopicProgressList';
import { DesktopTestsHubView } from './DesktopTestsHubView';
import type { TestsDashboard } from '../../../api/tests';

export interface TestsHubViewProps {
  weakTopics: TestsWeakTopic[];
  weakTopicSearchTarget: string;
  status: 'loading' | 'ready' | 'empty' | 'error';
  onRetry?: () => void;
  dashboard?: TestsDashboard | null;
  dashboardStatus?: 'loading' | 'ready' | 'error' | 'catalog';
  onDashboardRetry?: () => void;
  desktopQuestionLabel?: (count: number) => string;
}

export function TestsHubView({
  weakTopics,
  weakTopicSearchTarget,
  status,
  onRetry,
  dashboard = null,
  dashboardStatus = 'loading',
  onDashboardRetry,
  desktopQuestionLabel,
}: TestsHubViewProps) {
  const { t } = useTranslation();

  return (
    <div data-tests-hub-root aria-busy={status === 'loading' || dashboardStatus === 'loading'}>
    <div data-tests-mobile className="md:hidden min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 max-md:min-h-[var(--mobile-page-available-height,100dvh)] max-md:px-6 max-md:pb-[var(--mobile-page-content-end-inset,0px)] max-md:pt-[var(--mobile-page-app-bar-offset)] md:flex md:justify-center">
      <main className="w-full max-w-[382px] md:max-w-[720px]">
        <h1 className="text-[24px] font-medium leading-[24px] text-black">
          {t('tests.title', { defaultValue: 'Тесты' })}
        </h1>

        <section className="mt-8" aria-labelledby="weak-points-title">
          <h2 id="weak-points-title" className="text-[20px] font-medium leading-[20px] text-[#572d9f]">
            {t('tests.weakPointsTitle', { defaultValue: 'Проблемные точки' })}
          </h2>

          {status === 'empty' ? (
            <article className="mt-6 rounded-[8px] bg-[#ded2f1] p-6">
              <h3 className="text-[16px] font-medium leading-[16px] text-[#6a37c3]">
                {t('tests.noAnalysisTitle', { defaultValue: 'Сначала проанализируйте ЕНТ' })}
              </h3>
              <p className="mt-2 text-[14px] leading-[14px] text-[#161519]">
                {t('tests.noAnalysisBody', {
                  defaultValue: 'Загрузите результаты ЕНТ, чтобы увидеть слабые темы и получить персональные тесты.',
                })}
              </p>
              <Link
                to="/analyze"
                className="mt-4 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[14px] font-medium leading-[14px] text-[#f8f5fc]"
              >
                {t('tests.noAnalysisButton', { defaultValue: 'Перейти к анализу ЕНТ' })}
              </Link>
            </article>
          ) : status === 'error' ? (
            <div className="mt-6 rounded-[8px] bg-[#ded2f1] p-6" role="alert">
              <h3 className="text-[16px] font-medium leading-[16px] text-[#6a37c3]">
                {t('tests.loadErrorTitle', { defaultValue: 'Не удалось загрузить результаты анализа' })}
              </h3>
              <p className="mt-2 text-[14px] leading-[14px] text-[#161519]">
                {t('tests.loadErrorBody', { defaultValue: 'Попробуйте ещё раз.' })}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[14px] font-medium leading-[14px] text-[#f8f5fc]"
              >
                {t('common.retry', { defaultValue: 'Повторить' })}
              </button>
            </div>
          ) : (
          <div className="mt-6 rounded-[8px] bg-[#ded2f1] p-6">
            <h3 className="text-[16px] font-medium leading-[16px] text-[#6a37c3]">
              {t('tests.yourWeakTopicsTitle', { defaultValue: 'Ваши слабые темы' })}
            </h3>
            {status === 'loading' ? (
              <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-3 w-full bg-[rgba(134,91,207,0.25)]" />
                ))}
              </div>
            ) : weakTopics.length === 0 ? (
              <p className="mt-4 text-[14px] leading-[14px] text-[#161519]">
                {t('tests.perfectResult', { defaultValue: 'Отличный результат — слабых тем не найдено.' })}
              </p>
            ) : (
              <WeakTopicProgressList topics={weakTopics} />
            )}
          </div>
          )}

          {status === 'ready' && weakTopics.length > 0 && <article className="mt-4 rounded-[8px] bg-white p-6">
            <div className="flex items-center gap-6">
              <HugeiconsIcon
                icon={GoalIcon}
                size={32}
                strokeWidth={1.8}
                className="size-8 shrink-0 text-[#6a37c3]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-[12px] text-[#865bcf]">
                  {t('tests.weakTopicsTestEyebrow', { defaultValue: 'Проверь свои знания' })}
                </p>
                <h3 className="mt-1 text-[16px] font-normal leading-[16px] text-[#161519]">
                  {t('tests.weakTopicsTestTitle', { defaultValue: 'Тест по слабым темам' })}
                </h3>
                <p className="mt-2 text-[12px] leading-[12px] text-[#b1acb9]">
                  {t('tests.weakTopicsTestDescription', {
                    defaultValue: 'Подборка вопросов из 3 разделов, где у вас низкий результат',
                  })}
                </p>
              </div>
            </div>
          </article>}

          {status === 'ready' && weakTopics.length > 0 && <Link
            to={weakTopicSearchTarget}
            className="mt-4 flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[14px] font-medium leading-[14px] text-[#f8f5fc] transition-opacity hover:opacity-90"
          >
            {t('tests.weakTopicsTestButton', { defaultValue: 'Пройти тест →' })}
          </Link>}
        </section>

        <section className="mt-10" aria-labelledby="other-tests-title">
          <h2 id="other-tests-title" className="text-[20px] font-medium leading-[20px] text-[#572d9f]">
            {t('tests.otherTestsTitle', { defaultValue: 'Другие тесты' })}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
    <DesktopTestsHubView dashboard={dashboard} status={dashboardStatus} analyzeStatus={status} onRetry={onDashboardRetry} questionLabel={desktopQuestionLabel} />
    </div>
  );
}
