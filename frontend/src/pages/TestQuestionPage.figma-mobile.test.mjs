import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const appSource = readFileSync(path.resolve(srcDir, 'App.tsx'), 'utf8');
const bottomNavSource = readFileSync(
  path.resolve(srcDir, 'components/MobileBottomNav.tsx'),
  'utf8',
);
const navigationPolicySource = readFileSync(
  path.resolve(srcDir, 'features/navigation/model/mobileBottomNavPolicy.ts'),
  'utf8',
);
const testsSource = readFileSync(path.resolve(pagesDir, 'Tests.tsx'), 'utf8');
const testsHubSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/TestsHubView.tsx'),
  'utf8',
);
const questionPagePath = path.resolve(pagesDir, 'TestQuestionPage.tsx');
const testsApiPath = path.resolve(srcDir, 'api/tests.ts');
const runnerModelPath = path.resolve(srcDir, 'features/tests/model/runner.ts');
const answerToneModelPath = path.resolve(srcDir, 'features/tests/model/answerTone.ts');
const resultsModelPath = path.resolve(srcDir, 'features/tests/model/results.ts');

assert.ok(
  existsSync(questionPagePath),
  'Test question screen should be isolated in a reusable TestQuestionPage.tsx file',
);

assert.ok(
  existsSync(testsApiPath),
  'Test flow data should live behind an API-ready frontend boundary in api/tests.ts',
);

const questionPageSource = existsSync(questionPagePath)
  ? readFileSync(questionPagePath, 'utf8')
  : '';
const questionViewSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/TestQuestionView.tsx'),
  'utf8',
);
const desktopQuestionViewSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/DesktopTestQuestionView.tsx'),
  'utf8',
);
const statusViewSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/TestStatusView.tsx'),
  'utf8',
);
const answerOptionSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/TestAnswerOption.tsx'),
  'utf8',
);
const resultViewSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/TestResultView.tsx'),
  'utf8',
);
const weakTopicRecommendationSource = readFileSync(
  path.resolve(srcDir, 'features/tests/components/WeakTopicRecommendation.tsx'),
  'utf8',
);
const questionSource = [
  questionPageSource,
  questionViewSource,
  answerOptionSource,
  resultViewSource,
  weakTopicRecommendationSource,
].join('\n');
const testsApiSource = existsSync(testsApiPath) ? readFileSync(testsApiPath, 'utf8') : '';
const runnerModelSource = readFileSync(runnerModelPath, 'utf8');
const answerToneModelSource = readFileSync(answerToneModelPath, 'utf8');
const resultsModelSource = readFileSync(resultsModelPath, 'utf8');
const questionBehaviorSource = [
  questionSource,
  runnerModelSource,
  answerToneModelSource,
  resultsModelSource,
].join('\n');

for (const [viewSource, label] of [
  [questionViewSource, 'Question'],
  [statusViewSource, 'Status'],
  [resultViewSource, 'Result'],
]) {
  assert.doesNotMatch(
    viewSource,
    /max-md:pt-\[var\(--mobile-page-app-bar-offset\)\]/,
    `${label} view should not duplicate the shared mobile page app-bar offset`,
  );
  assert.doesNotMatch(
    viewSource,
    /max-md:pt-\[(?:90|64)px\]/,
    `${label} view should not hardcode the legacy 90px or 64px top offset`,
  );
}

assert.match(
  appSource,
  /import \{ TestQuestionPage \} from '\.\/pages\/TestQuestionPage';/,
  'App should import the reusable test question page',
);

assert.match(
  appSource,
  /path="\/tests\/:testMode"[\s\S]*<TestQuestionPage \/>/,
  'Nested test URLs should render the universal question page',
);

assert.match(
  testsHubSource,
  /to="\/tests\/default"/,
  'The regular test entry should launch the default test question flow',
);

assert.match(
  navigationPolicySource,
  /pathname === '\/tests'/,
  'The navigation policy should keep Tests active for the exact hub route',
);

assert.match(
  navigationPolicySource,
  /pathname\.startsWith\('\/tests\/'\)/,
  'The navigation policy should classify nested question routes separately from the hub',
);

assert.doesNotMatch(
  bottomNavSource,
  /location\.pathname\.startsWith\('\/tests'\)/,
  'Bottom nav should consume the policy active item instead of deriving nested route activity',
);

assert.match(
  questionSource,
  /(?:createTestAttempt|getTestAttempt)[\s\S]*type TestSession/,
  'Question page should consume a typed server attempt from the API boundary',
);

assert.match(
  questionSource,
  /useTestRunner,[\s\S]*\} from '\.\.\/features\/tests';/,
  'Question page should consume the extracted test runner hook',
);

assert.match(
  questionSource,
  /state: runnerState[\s\S]*resetTestState,[\s\S]*selectOption,[\s\S]*submitAnswer,[\s\S]*advanceQuestion,[\s\S]*completeAttempt,[\s\S]*\} = useTestRunner\(\);/,
  'Question page should wire all runner state transitions through the extracted hook',
);

assert.match(
  questionSource,
  /getTestRunnerMetrics\(runnerState, questions, Date\.now\(\)\)/,
  'Question page should derive its visible score, progress, and timing from runner metrics',
);

assert.match(
  questionSource,
  /submitTestAnswer\([\s\S]*testSession\.attemptRef[\s\S]*metrics\.currentQuestion\.id[\s\S]*selectedOptionId/,
  'Question page primary action should submit the selected option to the server',
);
assert.match(
  questionSource,
  /completeTestAttempt\(testSession\.attemptRef\)/,
  'Question page should complete the attempt through the server route',
);

assert.match(
  questionPageSource,
  /const handleFinishEarly\s*=\s*async/,
  'Question page should expose a dedicated early-finish handler',
);
assert.match(
  questionPageSource,
  /onFinishEarly=\{handleFinishEarly\}/,
  'Desktop question view should use the dedicated early-finish handler',
);
assert.match(
  questionPageSource,
  /completionPromiseRef\.current\) return[\s\S]*completionPromiseRef\.current = completionPromise/,
  'Completion actions should share one in-flight request for double-click safety',
);
assert.match(
  questionPageSource,
  /catch \{[\s\S]*setActionError\(true\)[\s\S]*completionPromiseRef\.current = null/,
  'Completion failures should stay on the current page and release the retry guard',
);
assert.match(
  desktopQuestionViewSource,
  /onFinishEarly[\s\S]*disabled=\{submitting \|\| state\.resultVisible\}/,
  'Early finish should remain enabled for active attempts regardless of unanswered questions',
);
assert.doesNotMatch(
  desktopQuestionViewSource,
  /desktopFinishEarly[\s\S]*onClick=\{onPrimaryAction\}/,
  'Early finish must not reuse the next-question action',
);

assert.match(
  questionSource,
  /onSelectOption=\{selectOption\}[\s\S]*onSelect\(option\.id\)/,
  'Question answer controls should dispatch selections through the runner',
);

assert.match(
  runnerModelSource,
  /import type \{ TestQuestion \} from '\.\.\/\.\.\/\.\.\/api\/tests';/,
  'Question runner model should consume the typed question contract from the API boundary',
);

for (const codePattern of [
  /export type TestQuestionOption/,
  /export type TestQuestion/,
  /export type TestSession/,
  /export type TestTopicSummary/,
  /export async function createTestAttempt/,
  /export async function getTestAttempt/,
  /export async function submitTestAnswer/,
  /export async function completeTestAttempt/,
  /apiClient\.get\('\/api\/tests\/dashboard'/,
]) {
  assert.match(
    testsApiSource,
    codePattern,
    `api/tests.ts should expose the future API-ready test contract: ${codePattern}`,
  );
}

for (const forbiddenApiFixturePattern of [
  /testSessionFixtures/,
  /legacySnapshots/,
  /defaultQuestionOptions/,
  /VITE_TESTS_API_ENABLED/,
]) {
  assert.doesNotMatch(
    testsApiSource,
    forbiddenApiFixturePattern,
    `The production API adapter should not carry local test fixtures: ${forbiddenApiFixturePattern}`,
  );
}

for (const forbiddenPattern of [
  /FIGMA_DEFAULT_/,
  /DEFAULT_TEST_QUESTIONS/,
  /getQuestionsForMode/,
  /resultTimeValue/,
  /resultPaceValue/,
  /tests\.weakTopicValue/,
  /tests\.weakTopicMistakes['"]/,
  /sectionRetakeDescription/,
  /6:40 РјРёРЅСѓС‚/,
  /40 СЃРµРєСѓРЅРґ/,
  /2 РѕС€РёР±РєРё РїРѕ СЌС‚РѕРјСѓ СЂР°Р·РґРµР»Сѓ/,
  /10 РІРѕРїСЂРѕСЃРѕРІ, 5 РјРёРЅСѓС‚/,
  /Р’РµР±-РїСЂРѕРµРєС‚РёСЂРѕРІР°РЅРёРµ/,
]) {
  assert.doesNotMatch(
    questionSource,
    forbiddenPattern,
    `Question page should not keep hardcoded fixture/result values: ${forbiddenPattern}`,
  );
}

assert.match(
  questionSource,
  /tests\.resultTitle[\s\S]*tests\.resultCardTitle[\s\S]*tests\.retryTestButton/,
  'Result screen should keep all localized result labels behind translation keys',
);

for (const serverStatePattern of [
  /hydrateTestState\(session\.questions, session\.answers/,
  /answerFeedback=\{runnerState\.answerFeedback\}/,
  /submitTestAnswer\(/,
  /completeTestAttempt\(/,
  /session\.currentQuestionIndex/,
]) {
  assert.match(
    questionSource,
    serverStatePattern,
    `Question page should restore and render server-owned state: ${serverStatePattern}`,
  );
}

for (const className of [
  'bg-[#efebf6]',
  'bg-[#6a37c3]',
  'bg-[#ded2f1]',
  'text-[#6a37c3]',
  'rounded-[8px]',
  'max-w-[382px]',
]) {
  assert.match(
    questionSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Question page should preserve the Figma mobile class ${className}`,
  );
}

assert.match(
  questionSource,
  /<MobilePinnedAppBar[\s\S]*size-11/,
  'Question page header should use the shared pinned app bar with a 44px back target',
);

assert.match(
  questionSource,
  /test-question-content[\s\S]*max-w-\[382px\]/,
  'Question page body content should remain constrained to the Figma 382px column',
);

for (const viewSource of [questionViewSource, resultViewSource]) {
  assert.match(
    viewSource,
    /max-md:min-h-\[var\(--mobile-page-available-height,100dvh\)\]/,
    'Test screens should consume the shared mobile viewport available-height variable',
  );
  assert.match(
    viewSource,
    /max-md:min-h-\[calc\(100dvh-200px\)\]/,
    'Test screen content should reserve its exact Figma app-bar and CTA geometry',
  );
  assert.doesNotMatch(
    viewSource,
    /safe-area-inset/,
    'Test screens should not add dynamic safe-area offsets to the Figma canvas',
  );
}

assert.match(
  questionSource,
  /test-question-progress[\s\S]*mt-4/,
  'Question progress bar should sit 16px below the 56px Figma header',
);

assert.match(
  questionViewSource,
  /test-question-progress[\s\S]*!h-2[\s\S]*!bg-\[rgba\(106,55,195,0\.25\)\][\s\S]*\[&>span\]:!bg-\[#6a37c3\]/,
  'Question progress should keep the exact Figma track and fill above shared Progress styles',
);

assert.match(
  questionViewSource,
  /text-\[#c5b1e7\][\s\S]*questionCounter/,
  'Question card counter should use the Figma lavender text token',
);

assert.ok(
  questionViewSource.includes('mt-2 text-[#f8f5fc] text-[16px] font-medium leading-4">{question.prompt}</p>'),
  'Question card prompt should keep the explicit Figma white typography',
);

for (const codePattern of [
  /const \[testSession, setTestSession\]/,
  /useSearchParams/,
  /const chapterRef = searchParams\.get\('chapterRef'\)[\s\S]*topicCode/,
  /createTestAttempt\(requestedMode, chapterRef(?:, localeRef\.current)?\)/,
  /const questions = testSession\?\.questions \?\? \[\];/,
  /submitTestAnswer\(/,
  /completeTestAttempt\(/,
  /currentQuestionIndex/,
  /progressPercent/,
  /selectedOptionId/,
  /checkedOptionId/,
  /answerFeedback/,
  /answerRecords/,
  /resultVisible/,
  /startedAt/,
  /completedAt/,
  /completionSummary/,
  /aria-pressed/,
]) {
  assert.match(
    questionBehaviorSource,
    codePattern,
    `Question page should expose reusable quiz behavior: ${codePattern}`,
  );
}

assert.match(questionBehaviorSource, /const localeRef = useRef\(locale\)/, 'Attempt requests should read the current locale through a stable ref');
assert.match(questionBehaviorSource, /getTestAttempt\(attemptRef, localeRef\.current\)/, 'Existing attempts should request the current locale');
assert.match(questionBehaviorSource, /createTestAttempt\(requestedMode, chapterRef, localeRef\.current\)/, 'New attempts should request the current locale');
assert.doesNotMatch(questionBehaviorSource, /\}, \[[^\]]*locale[^\]]*\]\);/, 'Language changes must not recreate or refetch an attempt');

assert.match(
  testsApiSource,
  /createTestAttempt\(mode: TestMode \| 'default', chapterRef\?: string\)/,
  'Test API should accept an optional chapter reference for topic practice',
);
assert.match(
  testsApiSource,
  /apiClient\.post\('\/api\/tests\/attempts'/,
  'Test API should create attempts through the server route',
);
assert.match(
  testsApiSource,
  /apiClient\.post\(path, \{ option_ref: optionRef \}\)/,
  'Test API should submit answer option references through the server route',
);

assert.match(
  answerToneModelSource,
  /selected \? 'border-\[#6a37c3\] bg-white'/,
  'Selected answer row should keep the Figma white surface and use only the purple selected border',
);

assert.match(
  answerToneModelSource,
  /selected \? 'bg-\[#6a37c3\] text-\[#f8f5fc\]'/,
  'Selected answer letter block should turn purple with white text',
);

assert.doesNotMatch(
  answerToneModelSource,
  /selected \? 'border-\[#6a37c3\] bg-\[#f8f5fc\]'/,
  'Selected answer row should not tint the full answer surface',
);

assert.match(
  questionSource,
  /: '!bg-\[#6a37c3\] !text-\[#f8f5fc\] hover:!bg-\[#6a37c3\] hover:!opacity-100'/,
  'Enabled check CTA should retain the exact Figma purple and full opacity on hover',
);

assert.match(
  questionViewSource,
  /checkDisabled[\s\S]*\? '!bg-\[#ded2f1\] !text-\[#a585db\] disabled:!opacity-100'[\s\S]*: '!bg-\[#6a37c3\] !text-\[#f8f5fc\] hover:!bg-\[#6a37c3\] hover:!opacity-100'[\s\S]*disabled=\{checkDisabled\}/,
  'CTA should preserve disabled Figma colors and full-opacity enabled hover colors',
);

assert.match(
  questionViewSource,
  /\{checked && answerFeedback && \([\s\S]*bg-\[#a4e5c7\][\s\S]*<h2[^>]*text-\[#22915d\][\s\S]*<p[^>]*text-\[#1a6140\]/,
  'Explanation heading should use the Figma green while its body retains the darker readable green',
);

assert.match(
  questionViewSource,
  /className=\{`h-12 rounded-\[8px\] px-6 !text-\[16px\] !leading-4 \$\{/,
  'Check CTA should preserve the 48px Figma height with important typography overrides',
);

assert.match(
  resultsModelSource,
  /const checked = state\.checkedOptionId !== null;/,
  'Question model should keep a checked-answer phase after the user presses the check button',
);

assert.match(
  answerToneModelSource,
  /function getOptionTone/,
  'Question model should isolate answer feedback tone calculation',
);

assert.match(
  answerToneModelSource,
  /correctOptionRef[\s\S]*optionId === correctOptionRef[\s\S]*return 'correct'/,
  'Checked correct answer should render with the Figma correct tone',
);

assert.match(
  answerToneModelSource,
  /optionId === checkedOptionId[\s\S]*'incorrect'/,
  'Checked wrong answer should render the chosen option with the Figma incorrect tone',
);

for (const className of [
  'border-[#29ae70] bg-white',
  'bg-[#29ae70] text-[#f8f5fc]',
  'border-[#bc251a] bg-white',
  'bg-[#bc251a] text-white',
  'bg-[#a4e5c7]',
  'text-[#1a6140]',
]) {
  assert.match(
    questionBehaviorSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Checked answer state should include the Figma feedback class ${className}`,
  );
}

assert.match(
  questionSource,
  /Объяснение|РћР±СЉСЏСЃРЅРµРЅРёРµ/,
  'Checked answer state should show the explanation title from Figma',
);

assert.match(
  questionSource,
  /tests\.nextQuestionButton[\s\S]*defaultValue: 'Далее'/,
  'Primary button should switch to the Figma next label after checking an answer',
);

assert.match(
  runnerModelSource,
  /checkedOptionId: action\.feedback\.optionId/,
  'Pressing check should freeze the selected answer into the checked phase',
);

assert.match(
  runnerModelSource,
  /checkedOptionId: null/,
  'Moving to the next question should reset checked answer feedback',
);

assert.match(
  questionSource,
  /function TestResultView/,
  'Test completion should render the dedicated Figma result screen',
);

assert.match(
  runnerModelSource,
  /resultVisible: true/,
  'Pressing next on the final checked answer should show the result screen',
);

assert.match(
  runnerModelSource,
  /answerRecords: \[[\s\S]*\.\.\.state\.answerRecords[\s\S]*createAnswerRecord/,
  'Checking an answer should record the selected option for API-style result calculation',
);

for (const codePattern of [
  /function buildWeakTopicResult/,
  /function formatDuration/,
  /function formatAverageSeconds/,
  /formatDuration\(durationSeconds\)/,
  /formatAverageSeconds\(averagePaceSeconds\)/,
  /weakTopic\.topicTitle/,
  /weakTopic\.mistakeCount/,
  /weakTopic\.questionCount/,
  /weakTopic\.estimatedMinutes/,
]) {
  assert.match(
    questionBehaviorSource,
    codePattern,
    `Result screen should be calculated from the active test answers/session: ${codePattern}`,
  );
}

for (const className of [
  'mt-6 h-[118px] rounded-[8px] bg-[#6a37c3] p-6',
  'text-[#c5b1e7]',
  'text-[32px] font-medium leading-8 text-white',
  'text-[16px] font-medium leading-4 text-white',
  'result-score-progress mt-4 !h-2 !bg-[rgba(248,245,252,0.25)] [&>span]:!bg-[#f8f5fc]',
  'mt-4 grid grid-cols-2 gap-2',
  'h-24 rounded-[8px] bg-white p-4',
  'text-[12px] font-medium leading-3 text-[#865bcf]',
  'text-[16px] font-medium leading-4 text-black',
  'text-[12px] font-normal leading-3 text-[#b1acb9]',
  'mt-12 text-[20px] font-medium leading-5 text-[#572d9f]',
]) {
  assert.match(
    questionSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Result screen should preserve the Figma class ${className}`,
  );
}

assert.doesNotMatch(
  resultViewSource,
  /StatCard/,
  'Result metrics should use local Figma markup instead of shared StatCard styles',
);

assert.doesNotMatch(
  resultViewSource,
  /translate-y-2/,
  'Result should rely on shared pinned app-bar geometry instead of a local translation',
);

for (const [viewSource, label] of [
  [statusViewSource, 'Status'],
  [resultViewSource, 'Result'],
  [questionViewSource, 'Question'],
]) {
  assert.match(viewSource, /<MobilePinnedAppBar/, `${label} mobile back/title rail should use the shared pinned app bar`);
  assert.doesNotMatch(viewSource, /<MobileAppBar/, `${label} should not render a direct MobileAppBar for its mobile header`);
  assert.match(viewSource, /titleAlign="start"[\s\S]*compactLayout="leading-only"/, `${label} app bar should use compact leading-only layout`);
}

assert.doesNotMatch(statusViewSource, /h-10 min-h-10/, 'Status should not retain the direct app-bar shell height');
assert.doesNotMatch(resultViewSource, /h-10 min-h-10/, 'Result should not retain the direct app-bar shell height');
assert.doesNotMatch(questionViewSource, /test-question-mobile-header h-14/, 'Question should not retain the direct app-bar shell height');

assert.match(
  resultViewSource,
  /h-12 rounded-\[8px\] px-6 !text-\[16px\] !leading-4 !bg-\[#6a37c3\] !text-\[#f8f5fc\] hover:!bg-\[#6a37c3\] hover:!opacity-100/,
  'Result CTA should keep exact Figma color and typography above shared Button styles',
);

assert.match(
  questionSource,
  /ArrowRight02Icon/,
  'Result recommendation row should use the Figma right-arrow affordance',
);

assert.match(
  questionSource,
  /RepeatIcon/,
  'Result weak-topic row should use the Figma repeat icon affordance',
);

assert.match(
  questionSource,
  /onRestart=\{onRestart\}[\s\S]*onClick=\{onRestart\}/,
  'Result screen should provide a restart action for the Figma primary button',
);
