import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pageDir = import.meta.dirname;
const sourceRoot = path.resolve(pageDir, '..');
const pagePath = path.resolve(pageDir, 'UntAnalysisPage.tsx');
const modelPath = path.resolve(sourceRoot, 'features/unt-analysis/model/attempts.ts');
const apiPath = path.resolve(sourceRoot, 'api/analyze.ts');
const storiesPath = path.resolve(pageDir, 'UntAnalysisPage.stories.tsx');
const appSource = readFileSync(path.resolve(sourceRoot, 'App.tsx'), 'utf8');
const shellPolicy = readFileSync(path.resolve(sourceRoot, 'features/navigation/model/desktopShellPolicy.ts'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(sourceRoot, 'locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(sourceRoot, 'locales/kk/translation.json'), 'utf8'));

assert.equal(existsSync(pagePath), true, 'UNT analysis page should exist');
assert.equal(existsSync(modelPath), true, 'UNT analysis attempt model should exist');
assert.equal(existsSync(storiesPath), true, 'UNT analysis default Storybook story should exist');

const page = readFileSync(pagePath, 'utf8');
const model = readFileSync(modelPath, 'utf8');
const api = readFileSync(apiPath, 'utf8');
const stories = readFileSync(storiesPath, 'utf8');

assert.match(page, /export function UntAnalysisPage\(/, 'page should expose the UNT analysis screen');
assert.match(page, /data-unt-analysis-page/, 'page should expose a stable visual root');
assert.match(page, /data-unt-analysis-card/, 'page should expose the Figma white card');
assert.match(page, /Выберите попытку ЕНТ|t\('untAnalysis\.title'/, 'page should render the Figma heading');
assert.match(page, /data-unt-analysis-option/, 'attempt choices should expose stable selectors');
assert.match(page, /type="radio"/, 'attempt choices should use native radio inputs');
assert.match(page, /disabled=\{!option\.available\}/, 'future attempt choices should be disabled');
assert.match(page, /data-unt-analysis-continue/, 'page should expose the disabled continuation action');
assert.match(page, /disabled=\{!canContinue\}/, 'continuation should stay disabled until an available attempt is selected');
assert.match(page, /getUntAnalysisAttempts\(\)/, 'page should read attempt availability from the backend');
assert.doesNotMatch(page, /referenceDate|new Date\(|getMonth\(/, 'page should not derive availability from a browser date');
assert.match(page, /UntAnalysisDatePage/, 'attempt flow should render the date-selection state after continuation');
assert.match(page, /initialStep/, 'attempt flow should allow Storybook to render a deterministic step');

assert.match(model, /decorateUntAnalysisAttemptOptions/, 'model should map the server response to display options');
assert.doesNotMatch(model, /availableFromMonth|referenceDate\.getMonth\(\)/, 'frontend model should not contain date-window rules');
assert.match(model, /january|march|grant-1|grant-2/, 'model should expose all four Figma attempts');
assert.match(api, /apiClient\.get<UntAnalysisAttemptsResponse>\('\/api\/analyze\/attempts'\)/, 'frontend should call the backend attempt availability endpoint');

assert.match(appSource, /path="\/analyze\/unt"[\s\S]*<UntAnalysisPage \/>/, 'App should mount the new flow on its own route');
assert.match(shellPolicy, /pathname === '\/analyze' \|\| pathname\.startsWith\('\/analyze\/'\)/, 'nested UNT analysis route should keep the Analyze shell active');

for (const locale of [ru, kk]) {
  assert.ok(locale.untAnalysis, 'both locales should define UNT analysis copy');
  assert.equal(typeof locale.untAnalysis.title, 'string');
  assert.equal(Object.keys(locale.untAnalysis.attempts).length, 4);
}
assert.equal(ru.untAnalysis.title, 'Выберите попытку ЕНТ');
assert.equal(ru.untAnalysis.continue, 'Далее');

assert.match(stories, /export const DesktopDefault/, 'Storybook should expose the default Figma state');
assert.match(stories, /initialAttempts/, 'default story should provide a deterministic backend response');
assert.match(stories, /export const DesktopNoAvailableAttempts/, 'Storybook should cover a closed September window');
assert.match(stories, /export const DesktopSelected/, 'Storybook should expose the selected January Figma state');
assert.match(stories, /defaultSelectedAttempt:\s*'january'/, 'selected story should start with January selected');
assert.match(stories, /export const DesktopFlowToCalendar/, 'Storybook should cover continuation into the date-selection state');

assert.match(page, /data-unt-analysis-selected=\{selected\}/, 'attempt rows should expose their selected state');
assert.match(page, /data-unt-analysis-selection-indicator/, 'selected state should expose its visual indicator');
assert.match(page, /Tick02Icon/, 'selected attempt should use the Figma checkmark icon');
assert.match(page, /bg-\[#f8f5fc\]/, 'selected attempt row should use the Figma selected background');
assert.match(page, /bg-\[#6a37c3\].*text-white|text-white.*bg-\[#6a37c3\]/s, 'selected attempt controls should use the Figma purple and white treatment');

console.log('UNT analysis Figma contracts passed');
