import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const stories = fs.readFileSync(path.join(root, 'components/DesktopTestRunner.figma.stories.tsx'), 'utf8');
const question = fs.readFileSync(path.join(root, 'components/DesktopTestQuestionView.tsx'), 'utf8');
const results = fs.readFileSync(path.join(root, 'components/DesktopTestResultView.tsx'), 'utf8');
const review = fs.readFileSync(path.join(root, 'components/TestReviewDialog.tsx'), 'utf8');
const delta = fs.readFileSync(path.join(root, 'components/DesktopTestAccuracyDelta.tsx'), 'utf8');
const runner = fs.readFileSync(path.join(import.meta.dirname, 'desktop-runner.visual.mjs'), 'utf8');
const contrastLocksPath = path.join(import.meta.dirname, 'desktop-runner-contrast-locks.ts');
const contrastLocks = fs.readFileSync(contrastLocksPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'references/manifest.json'), 'utf8'));
assert.equal(Object.keys(manifest.states).length, 7);
for (const [state, { nodeId }] of Object.entries(manifest.states)) {
  const bytes = fs.readFileSync(path.join(import.meta.dirname, 'references', `${state}.png`));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${nodeId} must retain exact downloaded PNG bytes`);
}
for (const story of ['DefaultQuestion1', 'Question7WithSkipped4', 'SelectedAnswer', 'CorrectFeedback', 'WrongFeedback', 'Results', 'QuestionReviewDialog']) assert.match(stories, new RegExp(`export const ${story}`));
for (const story of ['ResultsTwentyQuestions', 'ResultsFortyQuestions', 'RussianKeyboardFocus', 'KazakhKeyboardFocus']) assert.match(stories, new RegExp(`export const ${story}`));
assert.match(stories, /import i18n from ['"]\.\.\/\.\.\/\.\.\/i18n['"]/, 'stories must use the project i18n instance');
assert.match(stories, /changeLanguage\('ru'\)/, 'the seven Figma baseline stories must remain deterministic in Russian');
assert.match(stories, /changeLanguage\('kk'\)/, 'the Kazakh interaction story must load the Kazakh locale');
assert.match(runner, /deviceScaleFactor: 1/);
assert.match(runner, /hover must be layout-neutral/);
assert.match(runner, /focus-visible must be visible/);
assert.match(runner, /overlay\.png/);
assert.match(runner, /diff\.png/);
assert.match(runner, /VISUAL_THRESHOLDS/);
assert.match(runner, /interactionMatrix/);
assert.match(runner, /meaningful paint mutation/);
assert.match(runner, /button\.hover\(\)/, 'visual harness must use real Playwright button hover');
assert.match(runner, /page\.mouse\.move\(0,\s*0\)/, 'visual harness must neutralize pointer at the viewport origin');
assert.match(runner, /waitForFunction[\s\S]*requestAnimationFrame/, 'visual harness must use bounded rAF condition polling');
assert.doesNotMatch(runner, /waitForTimeout|setTimeout/, 'visual criteria must not use sleeps or timer polling');
for (const color of ['rgb\\(252, 229, 227\\)', 'rgb\\(248, 213, 210\\)', 'rgb\\(242, 95, 84\\)']) assert.match(runner, new RegExp(color), `${color} must be asserted by the visual harness`);
assert.doesNotMatch(stories, /style\.backgroundColor\s*=|previousWrongBackground/, 'Storybook play must not mutate inline background to fake hover');
assert.doesNotMatch(stories, /assertFigmaContrastLocks\([^)]*state:\s*['"]hover['"]/, 'hover paint audit belongs in the Playwright visual harness');
assert.doesNotMatch(stories, /userEvent\.hover\(/, 'runner Storybook play must not invoke hover APIs');
assert.doesNotMatch(runner, /waitForHoverPaintChange[\s\S]*catch\(\(\)\s*=>\s*false/, 'enabled-control hover failures must not be swallowed');
assert.match(runner, /assert\.notDeepEqual\(\{ \.\.\.hover, rect: undefined \}/, 'interaction matrix must fail closed when enabled hover has no visible paint');
assert.doesNotMatch(runner, /button\[aria-label=/, 'hover polling must not reconstruct a selector from aria-label');
assert.match(runner, /elementHandle|evaluate\(.*getComputedStyle/, 'hover polling must inspect the same hovered DOM node');
assert.equal((contrastLocks.match(/const FIGMA_CONTRAST_NODE_SELECTOR\s*=\s*'\[data-figma-contrast-lock\]';/g) ?? []).length, 1, 'runtime inventory selector must have exactly one broad assignment');
assert.match(contrastLocks, /FIGMA_CONTRAST_RULE_SELECTOR[\s\S]*exactLockSelector/, 'axe selector must remain exact-lock based');
assert.doesNotMatch(stories, /color-contrast[^\n]+enabled:\s*false/);
assert.doesNotMatch(stories, /context:\s*\{[\s\S]*?exclude:/, 'Figma contrast locks must not exclude nodes from other axe rules');
assert.ok(fs.existsSync(contrastLocksPath), 'exact Figma contrast exception inventory must be source controlled');
for (const nodeId of ['880:4071', '886:4620', '891:4728', '918:4311', '891:5134', '910:4101', '921:4432']) {
  assert.match(contrastLocks, new RegExp(nodeId.replace(':', '\\:')), `${nodeId} must retain contrast-lock provenance`);
}
for (const id of [
  'question-exit', 'question-meta', 'question-status-answered', 'question-status-skipped', 'question-status-upcoming',
  'question-finish-early',
  'question-feedback-correct-title', 'question-feedback-correct-body', 'question-feedback-wrong-title',
  'results-exit', 'results-score-eyebrow', 'results-score-fraction', 'results-delta', 'results-secondary-action',
  'results-pace-label', 'results-overview-correct', 'results-overview-wrong', 'results-overview-unavailable',
  'review-meta', 'review-feedback-wrong-title',
]) assert.match(contrastLocks, new RegExp(`['\"]${id}['\"]`), `${id} must remain in the exact exception inventory`);
for (const pair of [
  ['#f69a93', '#fdf2f1'], ['#c5b1e7', '#ffffff'], ['#865bcf', '#efeaf8'], ['#c5b1e7', '#f8f5fc'],
  ['#865bcf', '#f8f5fc'],
  ['#29ae70', '#e7f8f0'], ['#21835a', '#e7f8f0'], ['#f25f54', '#fce5e3'], ['#b1acb9', '#ffffff'],
  ['#8c8698', '#ffffff'], ['#29ae70', '#cbf0df'], ['#6ed8a7', '#e7f8f0'],
]) assert.match(contrastLocks, new RegExp(`${pair[0]}[\\s\\S]{0,120}${pair[1]}`), `${pair.join('/')} must remain source locked`);
assert.match(stories, /id:\s*'color-contrast'[\s\S]{0,160}selector:\s*FIGMA_CONTRAST_RULE_SELECTOR/, 'only the source-locked selector may narrow color-contrast');
assert.match(stories, /assertFigmaContrastLocks/, 'each story must verify exact lock counts and computed colors before axe runs');
assert.match(question, /data-figma-contrast-lock="question-finish-early"/, 'Finish Early must use the exact source-locked contrast inventory');
assert.match(contrastLocks, /const FIGMA_CONTRAST_NODE_SELECTOR\s*=\s*'\[data-figma-contrast-lock\]';/, 'runtime inventory must use the single broad attribute selector');
assert.doesNotMatch(results, /conic-gradient/);
for (const [name, source] of Object.entries({ question, results, review, delta })) {
  assert.doesNotMatch(source, /[\u0400-\u04ff]/u, `${name} must route visible and accessible copy through i18n`);
}
const localeKeys = [
  'desktopExit', 'desktopQuestionProgress', 'desktopCorrect', 'desktopIncorrect', 'submitAnswerError',
  'desktopPrevious', 'desktopNext', 'desktopCheckAnswer', 'desktopCurrentProgress', 'desktopAnsweredProgress',
  'desktopQuestions', 'desktopFinishEarly', 'desktopQuestionStatusCurrent', 'desktopQuestionStatusAnswered',
  'desktopQuestionStatusSkipped', 'desktopQuestionStatusUpcoming', 'desktopResultsTitle', 'desktopScoreFraction',
  'desktopQuestionStatusLabel',
  'desktopTestCompleted', 'desktopGoodResult', 'desktopKeepPracticing', 'desktopActions', 'desktopTryAgain',
  'desktopReturnToTests', 'desktopPace', 'desktopEntTimeLimit', 'desktopTimeLimit', 'desktopYourPace',
  'desktopOverview', 'desktopOpenReview', 'desktopDuration', 'desktopCloseReview',
  'desktopAccuracyDeltaExplanation', 'desktopAccuracyDeltaAriaLabel',
];
const locales = Object.fromEntries(['ru', 'kk'].map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, `../../locales/${locale}/translation.json`), 'utf8')).tests]));
const placeholders = value => [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map(match => match[1]).sort();
for (const key of localeKeys) {
  assert.equal(typeof locales.ru[key], 'string', `RU locale must define tests.${key}`);
  assert.equal(typeof locales.kk[key], 'string', `KK locale must define tests.${key}`);
  assert.deepEqual(placeholders(locales.kk[key]), placeholders(locales.ru[key]), `tests.${key} placeholders must match across locales`);
}
const ringPath = path.join(import.meta.dirname, 'assets/result-score-ring.svg');
assert.ok(fs.existsSync(ringPath), 'exact exported result score ring must be persisted');
assert.match(fs.readFileSync(path.join(import.meta.dirname, 'assets/manifest.json'), 'utf8'), /910:4204/);
console.log('Tests desktop runner Figma contract passed');
