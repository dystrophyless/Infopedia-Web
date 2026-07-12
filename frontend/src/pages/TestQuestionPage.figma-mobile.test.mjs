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
  bottomNavSource,
  /location\.pathname\.startsWith\('\/tests'\)/,
  'Bottom nav should keep Tests active for nested question routes',
);

assert.match(
  questionSource,
  /import \{ getTestSession, type TestSession \} from '\.\.\/api\/tests';/,
  'Question page should consume a typed test session from the API boundary',
);

assert.match(
  questionSource,
  /useTestRunner,[\s\S]*\} from '\.\.\/features\/tests';/,
  'Question page should consume the extracted test runner hook',
);

assert.match(
  questionSource,
  /state: runnerState[\s\S]*resetTestState,[\s\S]*selectOption,[\s\S]*runPrimaryAction,[\s\S]*\} = useTestRunner\(\);/,
  'Question page should wire all runner state transitions through the extracted hook',
);

assert.match(
  questionSource,
  /getTestRunnerMetrics\(runnerState, questions, Date\.now\(\)\)/,
  'Question page should derive its visible score, progress, and timing from runner metrics',
);

assert.match(
  questionSource,
  /runPrimaryAction\(activeQuestion, metrics\.totalQuestions\)/,
  'Question page primary action should dispatch the active question through the runner',
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
  /export async function getTestSession/,
  /apiClient\.get<TestSession>/,
  /VITE_TESTS_API_ENABLED/,
  /testSessionFixtures/,
]) {
  assert.match(
    testsApiSource,
    codePattern,
    `api/tests.ts should expose the future API-ready test contract: ${codePattern}`,
  );
}

for (const text of [
  'Обычный тест',
  'Мыс өткізгіштер',
  'Регистрлер',
  'Шина',
  'Жергілікті жад',
  'Екілік кодтар түрінде берілген ақпаратты жазуға, сақтауға, беруге және түрлендіруге арналған құрылғылар',
]) {
  assert.ok(
    testsApiSource.includes(text),
    `The temporary local fixture should preserve the Figma/session data until the API ships: ${text}`,
  );
  assert.equal(
    questionSource.includes(text),
    false,
    `Question page should not hardcode session data that will come from the API: ${text}`,
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
  /6:40 минут/,
  /40 секунд/,
  /2 ошибки по этому разделу/,
  /10 вопросов, 5 минут/,
  /Веб-проектирование/,
]) {
  assert.doesNotMatch(
    questionSource,
    forbiddenPattern,
    `Question page should not keep hardcoded fixture/result values: ${forbiddenPattern}`,
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
  /test-question-mobile-header[\s\S]*h-14[\s\S]*w-full[\s\S]*px-4/,
  'Question page header should match the Figma full-width 56px app bar instead of the 382px content column',
);

assert.match(
  questionSource,
  /test-question-content[\s\S]*max-w-\[382px\]/,
  'Question page body content should remain constrained to the Figma 382px column',
);

assert.match(
  questionSource,
  /test-question-progress[\s\S]*mt-4/,
  'Question progress bar should sit 16px below the 56px Figma header',
);

for (const codePattern of [
  /const \[testSession, setTestSession\]/,
  /getTestSession\(testMode \?\? 'default'\)/,
  /const questions = testSession\?\.questions \?\? \[\];/,
  /const correctAnswerCount = state\.answerRecords\.filter\(\(record\) => record\.correct\)\.length;/,
  /const scorePercent =[\s\S]*\(correctAnswerCount \/ totalQuestions\) \* 100/,
  /currentQuestionIndex/,
  /progressPercent/,
  /selectedOptionId/,
  /checkedOptionId/,
  /answerRecords/,
  /resultVisible/,
  /startedAt/,
  /completedAt/,
  /aria-pressed/,
]) {
  assert.match(
    questionBehaviorSource,
    codePattern,
    `Question page should expose reusable quiz behavior: ${codePattern}`,
  );
}

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
  /: 'bg-\[#6a37c3\] text-\[#f8f5fc\] hover:bg-\[#572d9f\]'/,
  'Check button should become the enabled purple Figma state after an answer is selected',
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
  /optionId === correctOptionId[\s\S]*return 'correct'/,
  'Checked correct answer should render with the Figma correct tone',
);

assert.match(
  answerToneModelSource,
  /optionId === checkedOptionId[\s\S]*return 'incorrect'/,
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

assert.ok(
  questionSource.includes('Объяснение'),
  'Checked answer state should show the explanation title from Figma',
);

assert.ok(
  questionSource.includes('Далее'),
  'Primary button should switch to the Figma next label after checking an answer',
);

assert.match(
  runnerModelSource,
  /checkedOptionId: state\.selectedOptionId/,
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

for (const text of [
  'Результаты',
  'Результат теста',
  'правильных ответов',
  'Время',
  'Ваш темп',
  'Повторите',
  'Слабая тема',
  'Тест по этому разделу',
  'Попробовать ещё',
]) {
  assert.ok(
    questionSource.includes(text),
    `Result screen should include the Figma UI label: ${text}`,
  );
}

for (const className of [
  'mt-8 rounded-[8px] bg-[#6a37c3] p-6',
  'bg-[rgba(248,245,252,0.25)]',
  'bg-[#f8f5fc]',
  'grid grid-cols-2 gap-2',
  'text-[#6a37c3]',
  'text-[#6b6573]',
  'bg-white px-6 py-4',
]) {
  assert.match(
    questionSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Result screen should preserve the Figma class ${className}`,
  );
}

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
  /onRestart=\{resetTestState\}[\s\S]*onClick=\{onRestart\}/,
  'Result screen should provide a restart action for the Figma primary button',
);
