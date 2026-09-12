import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Idea01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { UntAnalysisAttemptId } from '../features/unt-analysis/model/attempts';
import {
  buildUntAnalysisCalendarDays,
  formatUntAnalysisAccessibleDate,
  formatUntAnalysisCalendarMonth,
  formatUntAnalysisCalendarMonthShort,
  formatUntAnalysisDateRange,
  formatUntAnalysisSelectedDate,
  getUntAnalysisMonthKeys,
} from '../features/unt-analysis/model/calendar';

const FALLBACK_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export interface UntAnalysisDatePageProps {
  attemptId?: UntAnalysisAttemptId;
  startDate: string | null;
  endDate: string | null;
  initialMonth?: string;
  selectedDate?: string | null;
  defaultSelectedDate?: string | null;
  onAttemptChange?: () => void;
  onDateChange?: (date: string) => void;
  onBack?: () => void;
  onContinue?: (date: string) => void;
}

export function UntAnalysisDatePage({
  attemptId = 'january',
  startDate,
  endDate,
  initialMonth,
  selectedDate,
  defaultSelectedDate = null,
  onAttemptChange,
  onDateChange,
  onBack,
  onContinue,
}: UntAnalysisDatePageProps) {
  const { t, i18n } = useTranslation();
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(defaultSelectedDate);
  const [monthKey, setMonthKey] = useState(() => {
    const months = getUntAnalysisMonthKeys(startDate, endDate);
    return initialMonth && months.includes(initialMonth) ? initialMonth : months[0] ?? '';
  });
  const currentSelectedDate = selectedDate === undefined ? internalSelectedDate : selectedDate;
  const monthKeys = useMemo(
    () => getUntAnalysisMonthKeys(startDate, endDate),
    [startDate, endDate],
  );
  const currentMonthIndex = monthKeys.indexOf(monthKey);
  const days = useMemo(
    () => buildUntAnalysisCalendarDays(monthKey, startDate, endDate),
    [monthKey, startDate, endDate],
  );
  const translatedWeekdays = t('untAnalysis.date.weekdays', { returnObjects: true });
  const weekdays = Array.isArray(translatedWeekdays)
    ? translatedWeekdays.filter((weekday): weekday is string => typeof weekday === 'string')
    : FALLBACK_WEEKDAYS;
  const locale = i18n.language || 'ru';
  const attemptTitle = `${t(`untAnalysis.attempts.${attemptId}.title`)} ${t('untAnalysis.date.attemptSuffix')}`;
  const dateRange = formatUntAnalysisDateRange(startDate, endDate, locale);
  const monthLabel = formatUntAnalysisCalendarMonth(monthKey, locale);
  const monthShortLabel = formatUntAnalysisCalendarMonthShort(monthKey, locale);
  const selectedDateLabel = currentSelectedDate
    ? formatUntAnalysisSelectedDate(currentSelectedDate, locale)
    : '';
  const selectedDayLabel = currentSelectedDate ? Number(currentSelectedDate.slice(-2)) : null;
  const summaryTitle = currentSelectedDate
    ? t('untAnalysis.date.selectedDate')
    : t('untAnalysis.date.selectDate');
  const summaryDetail = currentSelectedDate
    ? selectedDateLabel
    : t('untAnalysis.date.selectDateHint');
  const hasPreviousMonth = currentMonthIndex > 0;
  const hasNextMonth = currentMonthIndex >= 0 && currentMonthIndex < monthKeys.length - 1;

  useEffect(() => {
    const nextMonth = initialMonth && monthKeys.includes(initialMonth) ? initialMonth : monthKeys[0] ?? '';
    setMonthKey((current) => (monthKeys.includes(current) ? current : nextMonth));
  }, [initialMonth, monthKeys]);

  function handleMonthChange(offset: -1 | 1) {
    if (currentMonthIndex < 0) return;
    const nextIndex = currentMonthIndex + offset;
    if (nextIndex < 0 || nextIndex >= monthKeys.length) return;
    setMonthKey(monthKeys[nextIndex]);
  }

  function handleDateChange(date: string, available: boolean) {
    if (!available) return;
    if (selectedDate === undefined) setInternalSelectedDate(date);
    onDateChange?.(date);
  }

  function handleContinue() {
    if (!currentSelectedDate) return;
    onContinue?.(currentSelectedDate);
  }

  return (
    <div className="min-h-[1080px] bg-[#efeaf8] px-6 py-6 md:ml-px md:px-16 md:py-8" data-unt-analysis-date-page>
      <main className="w-full">
        <section
          aria-labelledby="unt-analysis-date-title"
          className="flex w-full max-w-[800px] flex-col gap-8 rounded-[16px] bg-white p-6"
          data-unt-analysis-date-card
        >
          <header className="flex w-full flex-col items-start gap-4">
            <h1 id="unt-analysis-date-title" className="text-[22px] font-medium leading-[22px] text-[#000000]">
              {t('untAnalysis.date.title')}
            </h1>
            <p className="max-w-[504px] text-[16px] leading-[16px] text-[#6e6779]">
              {t('untAnalysis.date.description')}
            </p>
          </header>

          <div className="flex w-full flex-col gap-4" data-unt-analysis-date-content>
            <div className="flex min-h-12 w-full items-center justify-between rounded-[8px] border border-solid border-[#eae9ec] px-6 py-4" data-unt-analysis-date-attempt>
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0 text-[16px] font-medium leading-4 text-[#161519]">
                  {attemptTitle}
                </span>
                {dateRange && (
                  <span className="truncate text-[14px] leading-[14px] text-[#6e6779]">
                    {dateRange}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-[16px] font-medium leading-4 text-[#6a37c3] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2"
                onClick={onAttemptChange}
                data-unt-analysis-change-attempt
              >
                {t('untAnalysis.date.changeAttempt')}
              </button>
            </div>

            <div className="flex w-full items-start gap-4" data-unt-analysis-date-panels>
              <div className="flex w-[373px] shrink-0 flex-col gap-6 rounded-[8px] border border-solid border-[#eae9ec] p-6" data-unt-analysis-calendar>
                <div className="flex w-full items-center justify-between" data-unt-analysis-calendar-header>
                  <button
                    type="button"
                    aria-label={t('untAnalysis.date.previousMonth')}
                    disabled={!hasPreviousMonth}
                    className={`flex size-8 items-center justify-center rounded-[8px] text-[#6e6779] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f6f5f7] disabled:text-[#b1acb9] ${hasPreviousMonth ? 'bg-[#eae9ec]' : ''}`}
                    onClick={() => handleMonthChange(-1)}
                    data-unt-analysis-calendar-previous
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <p className="text-[16px] font-medium leading-4 text-black" data-testid="unt-analysis-calendar-month" data-unt-analysis-calendar-month>
                    {monthLabel}
                  </p>
                  <button
                    type="button"
                    aria-label={t('untAnalysis.date.nextMonth')}
                    disabled={!hasNextMonth}
                    className={`flex size-8 items-center justify-center rounded-[8px] text-[#6e6779] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#eae9ec] disabled:text-[#b1acb9] ${hasNextMonth ? 'bg-[#eae9ec]' : ''}`}
                    onClick={() => handleMonthChange(1)}
                    data-unt-analysis-calendar-next
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>

                <div className="grid w-full grid-cols-7 gap-x-[7.5px] gap-y-2" data-unt-analysis-calendar-grid>
                  {weekdays.slice(0, 7).map((weekday) => (
                    <div key={weekday} className="flex h-8 w-10 items-center justify-center text-[14px] font-medium leading-[14px] text-[#6e6779]">
                      {weekday}
                    </div>
                  ))}
                  {days.map((day, index) => {
                    const selected = day.date !== null && day.date === currentSelectedDate;
                    const dayClass = selected
                      ? 'bg-[#6a37c3] font-medium text-white'
                      : day.available
                        ? 'bg-[#f6f5f7] text-[#6e6779] hover:bg-[#ded2f1]'
                        : 'text-[#b1acb9]';

                    if (!day.date) {
                      return <div key={`empty-${index}`} className="h-8 w-10" aria-hidden="true" />;
                    }

                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={!day.available}
                        aria-label={formatUntAnalysisAccessibleDate(day.date, locale)}
                        className={`flex h-8 w-10 items-center justify-center rounded-[8px] text-[16px] leading-4 outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${dayClass}`}
                        onClick={() => handleDateChange(day.date as string, day.available)}
                        data-unt-analysis-date={day.date}
                        data-unt-analysis-date-available={day.available}
                        data-unt-analysis-date-selected={selected}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="flex min-w-0 flex-1 flex-col gap-4 self-stretch" data-unt-analysis-date-side-panel>
                <div className="flex shrink-0 items-center gap-4 rounded-[8px] border border-solid border-[#eae9ec] p-6" data-unt-analysis-date-summary>
                  <div className="flex size-12 shrink-0 flex-col" aria-hidden="true">
                    <span className="flex h-4 w-full items-center justify-center rounded-tl-[8px] rounded-tr-[8px] bg-[#6a37c3] px-3 py-[2px] text-[12px] font-medium leading-3 text-white">
                      {monthShortLabel}
                    </span>
                    <span className="flex h-8 w-full items-center justify-center rounded-bl-[8px] rounded-br-[8px] bg-[#f6f5f7] px-1 py-[2px] text-[18px] font-medium leading-[18px] text-[#161519]">
                      {selectedDayLabel ?? '?'}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                    <p className="text-[16px] font-medium leading-4 text-black">{summaryTitle}</p>
                    <p className="text-[14px] leading-[14px] text-[#6e6779]">{summaryDetail}</p>
                  </div>
                </div>

                <div className="flex h-[220px] shrink-0 flex-col gap-6 rounded-[8px] border border-solid border-[#eae9ec] p-6" data-unt-analysis-date-why>
                  <div className="flex w-full items-center gap-4">
                    <HugeiconsIcon icon={Idea01Icon} size={24} strokeWidth={1.5} className="shrink-0 text-[#6a37c3]" aria-hidden="true" />
                    <p className="text-[16px] font-medium leading-4 text-[#6a37c3]">{t('untAnalysis.date.whyTitle')}</p>
                  </div>
                  <p className="w-full text-[14px] leading-[14px] text-[#6e6779]">{t('untAnalysis.date.whyBody')}</p>
                </div>
              </aside>
            </div>
          </div>

          <div className="flex w-full items-start justify-between" data-unt-analysis-date-actions>
            <button
              type="button"
              className="inline-flex h-10 min-h-10 items-center justify-center rounded-[8px] bg-[#f6f5f7] px-6 py-3 text-[16px] font-medium leading-4 text-[#161519] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2"
              onClick={onBack}
              data-unt-analysis-date-back
            >
              {t('untAnalysis.date.back')}
            </button>
            <button
              type="button"
              disabled={!currentSelectedDate}
              className={`inline-flex h-10 min-h-10 items-center justify-center rounded-[8px] px-6 py-3 text-[16px] font-medium leading-4 outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${currentSelectedDate ? 'bg-[#6a37c3] text-white' : 'bg-[#efeaf8] text-[#a585db]'}`}
              onClick={handleContinue}
              data-unt-analysis-date-continue
            >
              {t('untAnalysis.date.continue')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UntAnalysisDatePage;
