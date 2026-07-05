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
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
const testsSource = readFileSync(path.resolve(pagesDir, 'Tests.tsx'), 'utf8');
const questionPagePath = path.resolve(pagesDir, 'TestQuestionPage.tsx');
const testsApiPath = path.resolve(srcDir, 'api/tests.ts');

assert.ok(
  existsSync(questionPagePath),
  'Test question screen should be isolated in a reusable TestQuestionPage.tsx file',
);

assert.ok(
  existsSync(testsApiPath),
  'Test flow data should live behind an API-ready frontend boundary in api/tests.ts',
);

const questionSource = existsSync(questionPagePath)
  ? readFileSync(questionPagePath, 'utf8')
  : '';
const testsApiSource = existsSync(testsApiPath) ? readFileSync(testsApiPath, 'utf8') : '';

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
  testsSource,
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
  /import \{ getTestSession, type TestQuestion, type TestSession \} from '\.\.\/api\/tests';/,
  'Question page should consume a typed test session from the API boundary',
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
  'text-[#a585db]',
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

assert.match(
  questionSource,
  /test-answer-option/,
  'Answer rows should use a dedicated class so their Figma borders survive the mobile border reset',
);

for (const cssPattern of [
  /\.test-answer-option-neutral\s*\{[\s\S]*border-color:\s*#ded2f1\s*!important;/,
  /\.test-answer-option-selected\s*\{[\s\S]*border-color:\s*#6a37c3\s*!important;/,
  /\.test-answer-option-correct\s*\{[\s\S]*border-color:\s*#29ae70\s*!important;/,
  /\.test-answer-option-incorrect\s*\{[\s\S]*border-color:\s*#bc251a\s*!important;/,
]) {
  assert.match(
    indexCssSource,
    cssPattern,
    `Question answer option border override should appear after the mobile reset: ${cssPattern}`,
  );
}

for (const codePattern of [
  /const \[testSession, setTestSession\]/,
  /getTestSession\(testMode \?\? 'default'\)/,
  /const questions = testSession\?\.questions \?\? \[\];/,
  /const correctAnswerCount = answerRecords\.filter\(\(record\) => record\.correct\)\.length;/,
  /const scorePercent = totalQuestions > 0 \? \(correctAnswerCount \/ totalQuestions\) \* 100 : 0;/,
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
    questionSource,
    codePattern,
    `Question page should expose reusable quiz behavior: ${codePattern}`,
  );
}

assert.match(
  questionSource,
  /selected \? 'border-\[#6a37c3\] bg-white'/,
  'Selected answer row should keep the Figma white surface and use only the purple selected border',
);

assert.match(
  questionSource,
  /selected \? 'bg-\[#6a37c3\] text-\[#f8f5fc\]'/,
  'Selected answer letter block should turn purple with white text',
);

assert.doesNotMatch(
  questionSource,
  /selected \? 'border-\[#6a37c3\] bg-\[#f8f5fc\]'/,
  'Selected answer row should not tint the full answer surface',
);

assert.match(
  questionSource,
  /: 'bg-\[#6a37c3\] text-\[#f8f5fc\] hover:bg-\[#572d9f\]'/,
  'Check button should become the enabled purple Figma state after an answer is selected',
);

assert.match(
  questionSource,
  /const checked = checkedOptionId !== null;/,
  'Question page should keep a checked-answer phase after the user presses the check button',
);

assert.match(
  questionSource,
  /function getOptionTone/,
  'Question page should isolate answer feedback tone calculation',
);

assert.match(
  questionSource,
  /option\.id === (currentQuestion|activeQuestion)\.correctOptionId[\s\S]*return 'correct'/,
  'Checked correct answer should render with the Figma correct tone',
);

assert.match(
  questionSource,
  /option\.id === checkedOptionId[\s\S]*return 'incorrect'/,
  'Checked wrong answer should render the chosen option with the Figma incorrect tone',
);

for (const className of [
  'border-[#29ae70] bg-white',
  'bg-[#29ae70] text-[#f8f5fc]',
  'border-[#bc251a] bg-white',
  'bg-[#bc251a] text-white',
  'bg-[#a4e5c7]',
  'text-[#22915d]',
  'text-[#1a6140]',
]) {
  assert.match(
    questionSource,
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
  questionSource,
  /setCheckedOptionId\(selectedOptionId\)/,
  'Pressing check should freeze the selected answer into the checked phase',
);

assert.match(
  questionSource,
  /setCheckedOptionId\(null\)/,
  'Moving to the next question should reset checked answer feedback',
);

assert.match(
  questionSource,
  /function renderTestResult/,
  'Test completion should render the dedicated Figma result screen',
);

assert.match(
  questionSource,
  /setResultVisible\(true\)/,
  'Pressing next on the final checked answer should show the result screen',
);

assert.match(
  questionSource,
  /setAnswerRecords\(\(records\) => \[/,
  'Checking an answer should record the selected option for API-style result calculation',
);

for (const codePattern of [
  /function buildWeakTopicResult/,
  /function formatDuration/,
  /function formatAverageSeconds/,
  /formatDuration\(durationSeconds\)/,
  /formatAverageSeconds\(averagePaceSeconds\)/,
  /weakTopicResult\?\.topicTitle/,
  /weakTopicResult\?\.mistakeCount/,
  /weakTopicResult\?\.questionCount/,
  /weakTopicResult\?\.estimatedMinutes/,
]) {
  assert.match(
    questionSource,
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
  'text-[#865bcf]',
  'text-[#b1acb9]',
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
  /function restartTest/,
  'Result screen should provide a restart action for the Figma primary button',
);
