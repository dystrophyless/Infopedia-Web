import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pageDirectory = import.meta.dirname;
const readPage = (name) => readFileSync(path.resolve(pageDirectory, name), 'utf8');
const profileSource = readPage('Profile.tsx');
const desktopPanel = profileSource.slice(
  profileSource.indexOf('function DesktopSettingsPanel('),
  profileSource.indexOf('function SettingsActionButton('),
);

assert.match(
  desktopPanel,
  /if \(view === 'subscription'\)\s*\{\s*return\s*\(\s*<DesktopBillingPage\s+onBack=\{\(\) => setView\('home'\)\}\s*\/>/,
  'Desktop Settings subscription opens the dedicated billing page and returns to Settings',
);
assert.match(
  profileSource,
  /if \(settingsView === 'subscription'\)\s*\{\s*return <MobileSubscriptionInfo onBack=\{\(\) => setSettingsView\('home'\)\} \/>/,
  'Mobile Settings subscription keeps its existing page and back path',
);

const pageSource = readPage('DesktopBillingPage.tsx');
assert.match(pageSource, /mx-auto w-full max-w-\[640px\]/, 'Desktop billing content stays within 640px');
assert.match(
  pageSource,
  /\{ id: 'analyze', used: 1, limit: 3, period: 'month', icon: TradeUpIcon, labelKey: 'desktopBillingAnalyze' \}/,
  'The UNT analysis usage row uses the standalone rising arrow from the design',
);
assert.match(pageSource, /navigate\('\/subscription'\)/, 'Upgrade opens the existing subscription route');
assert.match(pageSource, /data-billing-current-plan/);
assert.match(pageSource, /data-billing-payment-history/);
assert.match(pageSource, /data-billing-payment-empty/);
assert.match(pageSource, /desktopBillingPlanDescription/, 'Free plan card includes the Figma subtitle');
assert.match(
  pageSource,
  /data-billing-sample-note[^>]*>\s*\{t\('profile\.desktopBillingSampleNotice'\)\}/,
  'The sample usage figures need a visible, localized disclaimer',
);
assert.match(pageSource, /desktopBillingHistoryEmptyTitle/);
assert.match(pageSource, /desktopBillingHistoryEmptyDescriptionFirst/);
assert.match(pageSource, /desktopBillingHistoryEmptyDescriptionSecond/);
assert.doesNotMatch(pageSource, /desktopBillingHistoryInvoice/, 'Figma payment history has only three columns');
for (const [label, used, limit, period] of [
  ['tests', 3, 5, 'month'],
  ['analyze', 1, 3, 'month'],
  ['algosha', 10, 20, 'day'],
]) {
  assert.match(
    pageSource,
    new RegExp(`id: '${label}',\\s*used: ${used},\\s*limit: ${limit},\\s*period: '${period}'`),
    `The ${label} sample matches the design`,
  );
}

for (const language of ['ru', 'kk']) {
  const locale = JSON.parse(readFileSync(path.resolve(pageDirectory, `../locales/${language}/translation.json`), 'utf8')).profile;
  for (const key of [
    'desktopBillingBack', 'desktopBillingTitle', 'desktopBillingCurrentPlan', 'desktopBillingFree',
    'desktopBillingUpgrade', 'desktopBillingUsageTitle', 'desktopBillingTests',
    'desktopBillingAnalyze', 'desktopBillingAlgosha', 'desktopBillingMonthlyUnit',
    'desktopBillingDailyUnit', 'desktopBillingLimitsNote', 'desktopBillingSampleNotice', 'desktopBillingHistoryTitle',
    'desktopBillingHistoryDate', 'desktopBillingHistoryAmount', 'desktopBillingHistoryStatus',
    'desktopBillingHistoryEmptyTitle', 'desktopBillingHistoryEmptyDescriptionFirst',
    'desktopBillingHistoryEmptyDescriptionSecond', 'desktopBillingPlanDescription',
    'desktopBillingUsageCount',
  ]) {
    assert.equal(typeof locale[key], 'string', `${language} billing translation ${key} exists`);
  }
  assert.match(locale.desktopBillingSampleNotice, /данные вашего аккаунта|аккаунтыңыздың деректері емес/);
  assert.match(locale.desktopBillingHistoryEmptyTitle, /недоступна|қолжетімсіз/);
  assert.match(locale.desktopBillingHistoryEmptyDescriptionFirst, /недоступны|қолжетімсіз/);
  assert.doesNotMatch(
    `${locale.desktopBillingHistoryEmptyTitle} ${locale.desktopBillingHistoryEmptyDescriptionFirst} ${locale.desktopBillingHistoryEmptyDescriptionSecond}`,
    /нет платежей|история платежей пуста|платежи появятся|төлемдер жоқ|тарихыңыз бос|төлемдер осында пайда болады/i,
    'Unavailable history must not claim zero payments or promise a future state',
  );
}

console.log('Profile desktop billing contract passed');
