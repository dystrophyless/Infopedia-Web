import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pageDir = import.meta.dirname;
const pagePath = path.resolve(pageDir, 'UntAnalysisDatePage.tsx');
const modelPath = path.resolve(pageDir, '../features/unt-analysis/model/calendar.ts');
const storiesPath = path.resolve(pageDir, 'UntAnalysisPage.stories.tsx');
const ru = JSON.parse(readFileSync(path.resolve(pageDir, '../locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(pageDir, '../locales/kk/translation.json'), 'utf8'));

assert.equal(existsSync(pagePath), true, 'UNT analysis date page should exist');
assert.equal(existsSync(modelPath), true, 'UNT analysis calendar model should exist');

const page = readFileSync(pagePath, 'utf8');
const model = readFileSync(modelPath, 'utf8');
const stories = readFileSync(storiesPath, 'utf8');

assert.match(page, /export function UntAnalysisDatePage\(/, 'date page should expose the calendar state');
assert.match(page, /data-unt-analysis-date-page/, 'date page should expose a stable visual root');
assert.match(page, /data-unt-analysis-calendar/, 'calendar should expose a stable visual root');
assert.match(page, /Укажите дату сдачи|t\('untAnalysis\.date\.title'/, 'date page should render the Figma heading');
assert.match(page, /data-unt-analysis-date=/, 'calendar days should expose their ISO date');
assert.match(page, /disabled=\{!day\.available\}/, 'days outside the server window should be disabled');
assert.match(page, /ArrowLeft01Icon[\s\S]*ArrowRight01Icon/, 'month navigation should use HugeIcons arrows');
assert.match(page, /Idea01Icon|IdeaIcon/, 'the explanation card should use the HugeIcons idea glyph');
assert.match(page, /data-unt-analysis-date-continue/, 'date continuation should expose a stable selector');
assert.match(page, /disabled=\{!currentSelectedDate\}/, 'date continuation should stay disabled before a day is selected');
assert.match(page, /currentSelectedDate[\s\S]*selectedDate/, 'selected date should drive the summary state');
assert.match(page, /formatUntAnalysisSelectedDate/, 'selected date should use the Figma summary date format');
assert.match(page, /untAnalysis\.date\.selectedDate/, 'selected summary copy should be localized');
assert.match(page, /selected[\s\S]*bg-\[#6a37c3\][\s\S]*font-medium/, 'selected day should use the Figma medium weight');
assert.match(page, /h-\[220px\][\s\S]*data-unt-analysis-date-why/, 'the explanation card should keep the Figma height');

assert.match(model, /buildUntAnalysisCalendarDays/, 'calendar model should build deterministic month cells');
assert.match(model, /getUntAnalysisMonthKeys/, 'calendar model should derive navigation months from the attempt window');
assert.doesNotMatch(model, /new Date\(\)/, 'calendar model must not depend on the browser current date');

for (const locale of [ru, kk]) {
  assert.ok(locale.untAnalysis?.date, 'both locales should define date-selection copy');
  for (const key of ['title', 'description', 'attemptSuffix', 'changeAttempt', 'selectDate', 'selectDateHint', 'selectedDate', 'whyTitle', 'whyBody', 'back', 'continue', 'previousMonth', 'nextMonth']) {
    assert.equal(typeof locale.untAnalysis.date[key], 'string');
  }
}
assert.equal(ru.untAnalysis.date.title, 'Укажите дату сдачи');
assert.equal(ru.untAnalysis.date.range, '—');

assert.match(stories, /export const DesktopJanuaryCalendar/, 'Storybook should expose the January calendar Figma state');
assert.match(stories, /export const DesktopJanuaryCalendar24thSelected/, 'Storybook should expose the selected January date Figma state');
assert.match(stories, /UntAnalysisDatePage/, 'calendar story should render the dedicated date page');
assert.match(stories, /2026-01-11/, 'calendar story should use the Figma January window');
assert.match(stories, /defaultSelectedDate="2026-01-24"/, 'selected calendar story should pin the Figma date');

console.log('UNT analysis calendar Figma contract passed');
