import { describe, expect, it } from 'vitest';
import {
  buildUntAnalysisCalendarDays,
  formatUntAnalysisCalendarMonth,
  formatUntAnalysisCalendarMonthShort,
  formatUntAnalysisDateRange,
  formatUntAnalysisSelectedDate,
  getUntAnalysisMonthKeys,
} from './calendar';

describe('UNT analysis calendar model', () => {
  it('builds a Monday-first January 2026 grid and applies the server window inclusively', () => {
    const days = buildUntAnalysisCalendarDays('2026-01', '2026-01-11', '2026-02-10');

    expect(days).toHaveLength(35);
    expect(days.slice(0, 3).every((day) => day.date === null)).toBe(true);
    expect(days.find((day) => day.date === '2026-01-10')).toMatchObject({
      day: 10,
      available: false,
    });
    expect(days.find((day) => day.date === '2026-01-11')).toMatchObject({
      day: 11,
      available: true,
    });
    expect(days.find((day) => day.date === '2026-01-31')).toMatchObject({
      day: 31,
      available: true,
    });
  });

  it('returns only the months covered by the attempt window', () => {
    expect(getUntAnalysisMonthKeys('2026-01-11', '2026-02-10')).toEqual([
      '2026-01',
      '2026-02',
    ]);
  });

  it('formats the Figma month and date-range labels', () => {
    expect(formatUntAnalysisCalendarMonth('2026-01', 'ru')).toBe('Январь, 2026');
    expect(formatUntAnalysisDateRange('2026-01-11', '2026-02-10', 'ru')).toBe(
      '11 января — 10 февраля',
    );
  });

  it('uses exactly three Russian letters for every calendar badge month', () => {
    const months = Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`);

    expect(months.map((month) => formatUntAnalysisCalendarMonthShort(month, 'ru'))).toEqual([
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ]);
  });

  it('formats the selected date like the Figma summary card', () => {
    expect(formatUntAnalysisSelectedDate('2026-01-24', 'ru')).toBe('24 января, 2026');
  });
});
