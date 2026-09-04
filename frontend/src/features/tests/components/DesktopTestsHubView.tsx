import {
  TradeDownIcon as ChartDownIcon,
  TradeUpIcon as ChartUpIcon,
  ShuffleIcon,
  Target03Icon,
  ArrowDown01Icon,
  ArrowRight02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import recentTick02Asset from '../figma/assets/recent-tick-02.svg';
import recentCancel01Asset from '../figma/assets/recent-cancel-01.svg';
import { Skeleton } from '../../../ui';
import type { TestsDashboard, TestMode } from '../../../api/tests';
import {
  filterDashboardChapters,
  formatDelta,
  formatPercent,
  formatRecentTestDateTime,
  getDashboardMetricVisibility,
  getVisibleDashboardChapters,
  sortDashboardChapters,
  type DashboardFilter,
  type DashboardSort,
} from '../model';
import { DesktopChapterTestCard } from './DesktopChapterTestCard';
import { DesktopTestOptionCard } from './DesktopTestOptionCard';

export interface DesktopTestsHubViewProps {
  dashboard: TestsDashboard | null;
  status: 'loading' | 'ready' | 'error' | 'catalog';
  analyzeStatus: 'loading' | 'ready' | 'empty' | 'error';
  onRetry?: () => void;
  questionLabel?: (count: number) => string;
}

function modeAvailability(dashboard: TestsDashboard | null, mode: TestMode) {
  return dashboard?.modeAvailability.find((item) => item.mode === mode);
}

function ModeCardSkeleton() {
  return <div className="flex h-full min-w-0 flex-col gap-6 rounded-[16px] bg-white px-6 pb-8 pt-6" data-tests-mode-skeleton aria-hidden="true">
    <Skeleton className="size-12 rounded-[8px]" />
    <div className="flex w-full flex-col gap-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-8 w-full" /></div>
  </div>;
}

function ChapterCardSkeleton() {
  return (
    <div data-tests-chapter-skeleton className="flex h-[196px] min-w-0 flex-col gap-6 rounded-[16px] bg-white p-6" aria-hidden="true">
      <Skeleton className="h-[22px] w-24 rounded-[8px]" data-tests-chapter-skeleton-metric />
      <div className="flex h-[102px] w-full flex-col items-start">
        <Skeleton className="h-4 w-4/5" data-tests-chapter-skeleton-title />
        <Skeleton className="mt-auto h-[14px] w-24" data-tests-chapter-skeleton-questions />
      </div>
    </div>
  );
}

function RecentTestLink({ recent, locale, t }: {
  recent: TestsDashboard['recentTests'][number];
  locale: 'ru' | 'kk';
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const recentDate = formatRecentTestDateTime(recent.completedAt, locale);
  const recentAccessibleLabel = [
    recent.title,
    recentDate,
    formatPercent(recent.accuracy),
    t('tests.desktopRecentCorrect', { count: recent.correctAnswerCount }),
    t('tests.desktopRecentIncorrect', { count: recent.incorrectAnswerCount }),
    t('tests.desktopRecentSkipped', { count: recent.skippedQuestionCount }),
  ].join('. ');

  return (
    <Link
      to={`/tests/${recent.mode}?attemptRef=${encodeURIComponent(recent.attemptRef)}`}
      aria-label={recentAccessibleLabel}
      className="group relative flex h-[50px] w-full items-center justify-between rounded-[8px] bg-white p-2 transition-[background-color] duration-[160ms] ease-out hover:bg-[#fbfbfb] focus-visible:bg-[#fbfbfb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3] active:bg-[#f6f5f7] active:hover:bg-[#f6f5f7]"
      data-tests-recent-link
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[16px] font-normal leading-4 text-[#39363f]">{recent.title}</span>
        <span className="relative h-[14px]">
          <span data-tests-recent-date className="absolute inset-0 block opacity-100 translate-y-0 text-[14px] font-normal leading-[14px] text-[#8c8698] transition-[opacity,transform] duration-[160ms] ease-out group-hover:opacity-0 group-hover:-translate-y-0.5 group-focus-visible:opacity-0 group-focus-visible:-translate-y-0.5 group-active:opacity-0 group-active:-translate-y-0.5">{recentDate}</span>
          <span data-tests-recent-metrics aria-hidden="true" className="pointer-events-none absolute inset-0 flex h-[14px] items-center gap-2 opacity-0 translate-y-0.5 transition-[opacity,transform] duration-[160ms] ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
            <span data-tests-recent-correct className="flex items-center gap-1 text-[12px] font-normal leading-3 text-[#22915d]">
              <span className="flex size-[14px] shrink-0 items-center justify-center rounded-full bg-[#29ae70]">
                <img src={recentTick02Asset} alt="" className="block size-2 shrink-0" />
              </span>
              <span>{recent.correctAnswerCount}</span>
            </span>
            <span data-tests-recent-incorrect className="flex items-center gap-1 text-[12px] font-normal leading-3 text-[#bc251a]">
              <span className="flex size-[14px] shrink-0 items-center justify-center rounded-full bg-[#e73023]">
                <img src={recentCancel01Asset} alt="" className="block size-2 shrink-0" />
              </span>
              <span>{recent.incorrectAnswerCount}</span>
            </span>
            <span data-tests-recent-skipped className="flex items-center gap-1 text-[12px] font-normal leading-3 text-[#6e6779]">
              <span className="size-[14px] shrink-0 rounded-full border border-[#8c8698]" aria-hidden="true" />
              <span>{recent.skippedQuestionCount}</span>
            </span>
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span data-tests-recent-score className="text-[16px] font-medium leading-4 text-[#161519] transition-transform duration-[160ms] ease-out group-hover:-translate-x-6 group-focus-visible:-translate-x-6 group-active:-translate-x-6">{formatPercent(recent.accuracy)}</span>
        <span data-tests-recent-arrow aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 size-[18px] opacity-0 translate-x-1 -translate-y-1/2 text-[#b1acb9] transition-[opacity,transform] duration-[160ms] ease-out group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 group-active:opacity-100 group-active:translate-x-0">
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} aria-hidden />
        </span>
      </span>
    </Link>
  );
}

export function defaultQuestionLabel(count: number) {
  return `${count} ${count === 1 ? 'вопрос' : count < 5 ? 'вопроса' : 'вопросов'}`;
}

export function DesktopTestsHubView({ dashboard, status, analyzeStatus, onRetry, questionLabel }: DesktopTestsHubViewProps) {
  const { t, i18n } = useTranslation();
  const locale: 'ru' | 'kk' = i18n.resolvedLanguage?.startsWith('kk') ? 'kk' : 'ru';
  const [sort, setSort] = useState<DashboardSort>('importance');
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const chapters = useMemo(() => {
    const filtered = filterDashboardChapters(dashboard?.chapters ?? [], filter);
    return sortDashboardChapters(filtered, sort);
  }, [dashboard?.chapters, filter, sort]);
  const visibleChapters = getVisibleDashboardChapters(chapters, expanded);
  const remaining = Math.max(0, chapters.length - visibleChapters.length);
  const dashboardReady = status === 'ready' && dashboard !== null;
  const delta = dashboard?.overallDeltaPoints ?? null;
  const statisticsVisibility = getDashboardMetricVisibility(
    dashboard?.completedAttemptCount ?? null,
    dashboard?.overallAccuracy ?? null,
    delta,
  );
  const showStatisticsEmpty = status === 'ready' && dashboard !== null && statisticsVisibility.showEmpty;
  const deltaTone = delta === null ? 'text-[#8c8698]' : delta > 0 ? 'text-[#29ae70]' : delta < 0 ? 'text-[#bc251a]' : 'text-[#8c8698]';
  const modeReason = (mode: TestMode) => {
    const reason = modeAvailability(dashboard, mode)?.disabledReason;
    if (reason?.reason === 'no_weak_chapters') {
      return t('tests.desktopWeakUnavailableNoAnalyze', { defaultValue: 'Загрузите анализ ЕНТ, чтобы открыть режим' });
    }
    if (reason?.reason === 'insufficient_question_pool') {
      return t('tests.desktopInsufficientPool', { defaultValue: 'Вопросы для этого режима пока недоступны' });
    }
    return t('tests.desktopUnavailable', { defaultValue: 'Пока недоступно' });
  };
  const weakAvailable = modeAvailability(dashboard, 'weak')?.available === true;

  return (
    <div className="hidden min-h-[1293px] bg-[#efeaf8] px-16 py-8 md:ml-px md:block" data-tests-desktop>
      <main className="w-full">
        <section className="grid grid-cols-[minmax(0,1fr)_320px] gap-4" data-tests-dashboard-grid>
          <div className="flex min-w-0 flex-col gap-4" data-tests-mode-grid>
            <div className="grid min-h-[196px] grid-cols-2 gap-4">
              {dashboardReady ? <DesktopTestOptionCard
                mode="random"
                title={t('tests.desktopRandomTitle', { defaultValue: 'Случайный тест' })}
                description={t('tests.desktopRandomDescription', { defaultValue: 'Подборка из 20 случайных вопросов из всех разделов' })}
                icon={<HugeiconsIcon icon={ShuffleIcon} size={24} strokeWidth={1.7} />}
                iconTone="bg-[#865bcf] text-white"
                to={dashboardReady && modeAvailability(dashboard, 'random')?.available === true ? '/tests/random' : undefined}
                unavailableMessage={modeReason('random')}
              /> : <ModeCardSkeleton />}
              {dashboardReady ? weakAvailable ? <DesktopTestOptionCard
                mode="weak"
                title={t('tests.desktopWeakTitle', { defaultValue: 'Слабые темы' })}
                description={t('tests.desktopWeakDescription', { defaultValue: 'Подборка вопросов по разделам, где вы теряете баллы' })}
                icon={<HugeiconsIcon icon={Target03Icon} size={24} strokeWidth={1.7} />}
                iconTone="bg-[#f25f54] text-white"
                to="/tests/weak"
                unavailableMessage={modeReason('weak')}
              /> : analyzeStatus === 'empty' ? <DesktopTestOptionCard
                mode="weak"
                title={t('tests.desktopWeakTitle', { defaultValue: 'Слабые темы' })}
                description={t('tests.desktopWeakDescription', { defaultValue: 'Подборка вопросов по разделам, где вы теряете баллы' })}
                statusBadge={t('tests.desktopWeakBadge', { defaultValue: 'После анализа ЕНТ' })}
                to="/analyze"
                contract="weak-pre-analysis"
              /> : <DesktopTestOptionCard
                mode="weak"
                title={t('tests.desktopWeakTitle', { defaultValue: 'Слабые темы' })}
                description={t('tests.desktopWeakDescription', { defaultValue: 'Подборка вопросов по разделам, где вы теряете баллы' })}
                icon={<HugeiconsIcon icon={Target03Icon} size={24} strokeWidth={1.7} />}
                iconTone="bg-[#f25f54] text-white"
                to={undefined}
                unavailableMessage={modeReason('weak')}
              /> : <ModeCardSkeleton />}
            </div>
            <div className="h-[180px]" data-tests-mode-card="mock">{status === 'loading' ? <ModeCardSkeleton /> : <DesktopTestOptionCard
              mode="mock"
              title={t('tests.desktopMockTitle', { defaultValue: 'Пробный тест' })}
              description={t('tests.desktopMockDescription', { defaultValue: 'Подборка из 40 вопросов в формате настоящего ЕНТ' })}
              statusBadge={t('tests.desktopMockBadge', { defaultValue: 'В процессе разработки' })}
              contract="mock-inactive"
            />}</div>
          </div>

          <div className="flex min-w-0 flex-col gap-4" data-tests-right-column>
            <section className="flex h-[134px] flex-col gap-4 rounded-[16px] bg-white px-6 pb-8 pt-6" aria-labelledby="tests-statistics-title">
              <div className="flex items-center justify-between">
                <h2 id="tests-statistics-title" className="text-[20px] font-medium leading-5 text-[#161519]">
                  {t('tests.desktopStatistics', { defaultValue: 'Статистика' })}
                </h2>
                {status === 'loading' || status === 'catalog' ? <Skeleton className="h-4 w-16" /> : showStatisticsEmpty ? <span className="h-7 w-[67px]" data-tests-statistics-spacer aria-hidden="true" /> : statisticsVisibility.showDelta && delta !== null ? <span className={`flex items-center gap-1.5 text-[16px] font-medium leading-4 ${deltaTone}`} data-tests-statistics-delta>
                  {delta === 0 ? null : (
                    <HugeiconsIcon
                      icon={delta > 0 ? ChartUpIcon : ChartDownIcon}
                      size={28}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  )}
                  {formatDelta(delta)}
                </span> : null}
              </div>
              {status === 'loading' || status === 'catalog' ? <div className="flex items-center justify-between px-2" data-tests-statistics-skeleton aria-hidden="true"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-12" /></div> : showStatisticsEmpty ? <p className="flex w-full flex-col gap-1 px-2" data-tests-statistics-empty>
                <span className="text-[16px] font-normal leading-4 text-[#39363f]">{t('tests.desktopStatisticsEmptyTitle', { defaultValue: 'Общая точность появится здесь' })}</span>
                <span className="text-[14px] font-normal leading-[14px] text-[#8c8698]">{t('tests.desktopStatisticsEmptyBody', { defaultValue: 'после первого теста' })}</span>
              </p> : statisticsVisibility.showAccuracy ? <div className="flex items-center justify-between px-2" data-tests-statistics-accuracy>
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-normal leading-4 text-[#39363f]">{t('tests.desktopOverallAccuracy', { defaultValue: 'Общая точность' })}</p>
                  <p className="text-[14px] font-normal leading-[14px] text-[#8c8698]">{t('tests.desktopAllTime', { defaultValue: 'за всё время' })}</p>
                </div>
                <p className="text-[16px] font-medium leading-4 text-[#161519]">{formatPercent(dashboard?.overallAccuracy ?? null)}</p>
              </div> : null}
            </section>
            <section className="flex h-[242px] flex-col gap-4 rounded-[16px] bg-white px-6 pb-8 pt-6" aria-labelledby="tests-recent-title">
              <h2 id="tests-recent-title" className="text-[20px] font-medium leading-5 text-[#161519]">{t('tests.desktopRecent', { defaultValue: 'Недавние тесты' })}</h2>
              {status === 'error' ? (
                <div className="flex items-center justify-between gap-4 text-[14px] text-[#9a2219]" role="alert">
                  <span>{t('tests.desktopLoadError', { defaultValue: 'Не удалось загрузить статистику' })}</span>
                  {onRetry ? <button type="button" className="underline" onClick={onRetry}>{t('common.retry', { defaultValue: 'Повторить' })}</button> : null}
                </div>
              ) : status === 'catalog' ? (
                <div className="flex items-center justify-between gap-4 text-[14px] text-[#9a2219]" role="alert"><span>{t('tests.catalogUnavailable', { defaultValue: 'Каталог тестов временно обновляется' })}</span>{onRetry ? <button type="button" className="underline" onClick={onRetry}>{t('common.retry', { defaultValue: 'Повторить' })}</button> : null}</div>
              ) : status === 'loading' ? (
                <div className="flex flex-col gap-4" data-tests-recent-skeleton aria-hidden="true">{[0, 1, 2].map((item) => <div key={item} className="flex items-center justify-between px-2"><div className="flex flex-col gap-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-4 w-12" /></div>)}</div>
              ) : dashboard?.recentTests.length ? (
                <div className="flex flex-col gap-0" data-tests-recent-list>
                  {dashboard.recentTests.slice(0, 3).map((recent) => (
                    <RecentTestLink key={recent.attemptRef} recent={recent} locale={locale} t={t} />
                  ))}
                </div>
              ) : (
                <p className="flex w-full flex-col gap-1 px-2" data-tests-recent-empty>
                  <span className="text-[16px] font-normal leading-4 text-[#39363f]">{t('tests.desktopRecentEmptyTitle', { defaultValue: 'История тестов появится здесь' })}</span>
                  <span className="text-[14px] font-normal leading-[14px] text-[#8c8698]">{t('tests.desktopRecentEmptyBody', { defaultValue: 'после первого теста' })}</span>
                </p>
              )}
            </section>
          </div>
        </section>

        <section className="mt-16 flex w-full flex-col items-end" aria-labelledby="tests-chapters-title">
          <div className="flex h-8 w-full items-center justify-between">
            <h2 id="tests-chapters-title" className="text-[24px] font-medium leading-6 text-[#161519]">{t('tests.desktopChaptersTitle', { defaultValue: 'Разделы информатики' })}</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  className="flex items-center gap-1 text-[16px] font-medium leading-4 text-[#39363f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
                  onClick={() => setSortOpen((value) => !value)}
                >
                  {sort === 'importance'
                    ? t('tests.desktopSortImportance', { defaultValue: 'По значимости раздела' })
                    : sort === 'accuracy'
                      ? t('tests.desktopSortAccuracy', { defaultValue: 'По точности ответов пользователя' })
                      : t('tests.desktopSortCount', { defaultValue: 'По количеству вопросов' })}
                  <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={1.7} aria-hidden />
                </button>
                {sortOpen ? (
                  <div role="listbox" className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-[8px] bg-white p-2" data-tests-sort-menu>
                    {(['importance', 'count', 'accuracy'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={sort === option}
                        className="block w-full rounded-[6px] px-3 py-2 text-left text-[14px] text-[#39363f] hover:bg-[#f8f5fc]"
                        onClick={() => {
                          setSort(option);
                          setSortOpen(false);
                        }}
                      >
                        {option === 'importance' ? t('tests.desktopSortImportance', { defaultValue: 'По значимости раздела' }) : option === 'accuracy' ? t('tests.desktopSortAccuracy', { defaultValue: 'По точности ответов пользователя' }) : t('tests.desktopSortCount', { defaultValue: 'По количеству вопросов' })}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2" role="radiogroup" aria-label={t('tests.desktopFilterLabel', { defaultValue: 'Фильтр разделов' })}>
                {(['all', 'weak'] as const).map((option) => (
                  <label key={option} className={`flex cursor-pointer items-center justify-center rounded-[16px] px-6 py-2 text-[16px] font-medium leading-4 ${filter === option ? 'bg-[#6a37c3] text-white' : 'bg-[#ded2f1] text-[#865bcf]'}`}>
                    <input type="radio" name="tests-chapter-filter" value={option} checked={filter === option} onChange={() => setFilter(option)} className="sr-only" />
                    {option === 'all' ? t('tests.desktopFilterAll', { defaultValue: 'Все' }) : t('tests.desktopFilterWeak', { defaultValue: 'Слабые разделы' })}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {status === 'error' || status === 'catalog' ? (
            <div className="mt-8 h-[192px] w-full" aria-hidden="true" />
          ) : status === 'loading' ? (
            <div className="mt-8 grid w-full grid-cols-3 gap-x-4 gap-y-6" data-tests-chapters-skeleton aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <ChapterCardSkeleton key={index} />)}
            </div>
          ) : chapters.length ? (
            <div className="mt-8 grid w-full grid-cols-3 gap-x-4 gap-y-6" data-tests-chapters-grid>
              {visibleChapters.map((chapter) => (
                <DesktopChapterTestCard
                  key={chapter.chapterRef}
                  chapter={chapter}
                  accuracyHint={t('tests.desktopAccuracyHint', { defaultValue: 'Точность рассчитана по всем отвеченным вопросам' })}
                  noDataHint={t('tests.desktopNoDataHint', { defaultValue: 'Общая точность по разделу появится после первого теста' })}
                  deltaHint={t('tests.desktopDeltaHint', { defaultValue: 'Изменение точности за последние 7 дней' })}
                  noDataLabel={t('tests.desktopNoData', { defaultValue: 'Нет данных' })}
                  questionLabel={questionLabel ?? ((count) => `${count} ${t('tests.desktopQuestionWord', { defaultValue: 'вопросов' })}`)}
                />
              ))}
              {remaining > 0 ? (
                <button type="button" className="group col-span-2 mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#ded2f1] px-8 py-3 text-[18px] font-medium leading-[18px] text-[#865bcf] transition-colors duration-fast ease-standard hover:bg-[#d4c4ea] hover:text-[#6f45b6] focus-visible:bg-[#d4c4ea] focus-visible:text-[#6f45b6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]" data-tests-desktop-show-more onClick={() => setExpanded(true)}>
                  {t('tests.desktopShowMore', { defaultValue: 'Показать ещё {{count}} разделов', count: remaining })}
                  <HugeiconsIcon icon={ArrowDown01Icon} size={24} strokeWidth={1.7} aria-hidden className="transition-transform duration-fast ease-standard group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-8 w-full rounded-[16px] bg-white p-6 text-[16px] text-[#8c8698]">{t('tests.desktopChaptersEmpty', { defaultValue: 'Разделы пока недоступны' })}</p>
          )}

        </section>
      </main>
    </div>
  );
}
