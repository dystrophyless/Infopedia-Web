import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const appSource = readFileSync(path.resolve(srcDir, 'App.tsx'), 'utf8');
const carouselSource = readFileSync(
  path.resolve(srcDir, 'components/MobileFeatureCarousel.tsx'),
  'utf8',
);
const testsPagePath = path.resolve(pagesDir, 'Tests.tsx');
const testsHubViewPath = path.resolve(
  srcDir,
  'features/tests/components/TestsHubView.tsx',
);
const weakTopicProgressListPath = path.resolve(
  srcDir,
  'features/tests/components/WeakTopicProgressList.tsx',
);
const testEntryLinkPath = path.resolve(
  srcDir,
  'features/tests/components/TestEntryLink.tsx',
);
const weakTopicsModelSource = readFileSync(
  path.resolve(srcDir, 'features/tests/model/weakTopics.ts'),
  'utf8',
);

assert.ok(
  existsSync(testsPagePath),
  'Tests tab should have a dedicated Tests.tsx page',
);

const testsSource = existsSync(testsPagePath)
  ? readFileSync(testsPagePath, 'utf8')
  : '';
const testsHubSource = readFileSync(testsHubViewPath, 'utf8');
const weakTopicProgressSource = readFileSync(weakTopicProgressListPath, 'utf8');
const testEntryLinkSource = readFileSync(testEntryLinkPath, 'utf8');
const testsViewSource = `${testsHubSource}\n${weakTopicProgressSource}\n${testEntryLinkSource}`;

assert.match(
  appSource,
  /import \{ Tests \} from '\.\/pages\/Tests';/,
  'App should import the Tests page',
);

assert.match(
  appSource,
  /path="\/tests"[\s\S]*<Tests \/>/,
  'Tests page should be mounted at the protected /tests route',
);

assert.match(
  carouselSource,
  /id: 'tests'[\s\S]*to: '\/tests'/,
  'Landing mobile tests feature should send authenticated users to the Tests tab',
);

assert.match(
  testsSource,
  /getLatestAnalyzeResult/,
  'Tests page should source weak-topic rows from the latest analysis result',
);

assert.match(
  weakTopicsModelSource,
  /buildWeakTopicInsights/,
  'Tests page model should reuse the weak-topic scoring utility',
);

assert.match(
  testsSource,
  /buildTestsWeakTopics\(latestResults\)/,
  'Tests page should derive its rendered rows through the extracted weak-topic model',
);

assert.match(
  testsSource,
  /getWeakTopicSearchTarget\(weakTopics\)/,
  'Tests page should derive its search route through the extracted weak-topic model',
);

for (const text of [
  'Тесты',
  'Проблемные точки',
  'Ваши слабые темы',
  'Тест по слабым темам',
  'Начать тест',
  'Другие тесты',
  'Обычный тест',
  'Тесты по разделам',
]) {
  assert.match(
    testsViewSource,
    new RegExp(text),
    `Tests page should include the Figma text: ${text}`,
  );
}

for (const className of [
  'bg-[#efebf6]',
  'bg-[#865bcf]',
  'bg-[#6a37c3]',
  'rounded-[16px]',
  'max-md:px-6',
]) {
  assert.match(
    testsViewSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Tests page should preserve the Figma mobile class ${className}`,
  );
}

assert.match(
  weakTopicsModelSource,
  /FALLBACK_WEAK_TOPICS/,
  'Tests page model should keep Figma sample weak topics visible before analysis data exists',
);

assert.match(
  testsViewSource,
  /WeakTopicProgressList/,
  'Tests page should isolate progress row rendering for weak-topic percentages',
);

assert.match(
  testsViewSource,
  /Target01Icon/,
  'Weak-topic test card should use a goal/target icon matching the Figma card',
);

assert.match(
  testsViewSource,
  /ArrowRight02Icon/,
  'Secondary test rows should use the Figma right-arrow affordance',
);
