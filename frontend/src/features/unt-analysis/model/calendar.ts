export interface UntAnalysisCalendarDay {
  date: string | null;
  day: number | null;
  available: boolean;
}

interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const SHORT_MONTH_LABELS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
} as const;

function parseIsoDate(value: string | null | undefined): ParsedIsoDate | null {
  if (!value) return null;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return [year, month, day].map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}

function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return { year, month };
}

function localeTag(locale: string): string {
  return locale.toLowerCase().startsWith('kk') ? 'kk-KZ' : 'ru-RU';
}

function dateFromParsed(value: ParsedIsoDate): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

function shiftMonth(year: number, month: number, offset: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function getUntAnalysisMonthKeys(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return [];

  const startTime = dateFromParsed(start).getTime();
  const endTime = dateFromParsed(end).getTime();
  if (startTime > endTime) return [];

  const keys: string[] = [];
  let cursor = { year: start.year, month: start.month };
  const last = { year: end.year, month: end.month };

  while (cursor.year < last.year || (cursor.year === last.year && cursor.month <= last.month)) {
    keys.push(`${cursor.year}-${String(cursor.month).padStart(2, '0')}`);
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }

  return keys;
}

export function buildUntAnalysisCalendarDays(
  monthKey: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): UntAnalysisCalendarDay[] {
  const month = parseMonthKey(monthKey);
  if (!month) return [];

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const firstDay = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
  const leadingEmptyCells = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const weekCount = Math.ceil((leadingEmptyCells + daysInMonth) / 7);

  return Array.from({ length: weekCount * 7 }, (_, index) => {
    const day = index - leadingEmptyCells + 1;
    if (day < 1 || day > daysInMonth) {
      return { date: null, day: null, available: false };
    }

    const date = formatIsoDate(month.year, month.month, day);
    const available = Boolean(
      start &&
        end &&
        dateFromParsed(start).getTime() <= dateFromParsed({ year: month.year, month: month.month, day }).getTime() &&
        dateFromParsed({ year: month.year, month: month.month, day }).getTime() <= dateFromParsed(end).getTime(),
    );

    return { date, day, available };
  });
}

export function formatUntAnalysisCalendarMonth(monthKey: string, locale: string): string {
  const month = parseMonthKey(monthKey);
  if (!month) return '';

  const formatter = new Intl.DateTimeFormat(localeTag(locale), {
    month: 'long',
    timeZone: 'UTC',
  });
  const monthName = formatter.format(new Date(Date.UTC(month.year, month.month - 1, 1)));
  const capitalizedMonth = monthName.charAt(0).toLocaleUpperCase(localeTag(locale)) + monthName.slice(1);
  return `${capitalizedMonth}, ${month.year}`;
}

export function formatUntAnalysisCalendarMonthShort(monthKey: string, locale: string): string {
  const month = parseMonthKey(monthKey);
  if (!month) return '';

  const labels = locale.toLowerCase().startsWith('kk')
    ? SHORT_MONTH_LABELS.kk
    : SHORT_MONTH_LABELS.ru;
  return labels[month.month - 1] ?? '';
}

export function formatUntAnalysisDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  locale: string,
  separator = ' — ',
): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return '';

  const formatter = new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return `${formatter.format(dateFromParsed(start))}${separator}${formatter.format(dateFromParsed(end))}`;
}

export function formatUntAnalysisSelectedDate(date: string, locale: string): string {
  const parsed = parseIsoDate(date);
  if (!parsed) return '';

  const parts = new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(dateFromParsed(parsed));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')} ${value('month')}, ${value('year')}`;
}

export function formatUntAnalysisAccessibleDate(date: string, locale: string): string {
  const parsed = parseIsoDate(date);
  if (!parsed) return date;

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromParsed(parsed));
}
