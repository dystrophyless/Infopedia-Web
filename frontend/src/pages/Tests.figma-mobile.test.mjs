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
const testsHubStoryPath = path.resolve(
  srcDir,
  'features/tests/components/TestsHubView.stories.tsx',
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
const testsHubStorySource = readFileSync(testsHubStoryPath, 'utf8');
const testsViewSource = `${testsHubSource}\n${weakTopicProgressSource}\n${testEntryLinkSource}`;

assert.match(
  testsHubSource,
  /max-md:pt-\[var\(--mobile-page-app-bar-offset\)\]/,
  'Tests hub should use the semantic mobile page app-bar offset token',
);
assert.doesNotMatch(
  testsHubSource,
  /max-md:pt-\[(?:90|64)px\]/,
  'Tests hub should not hardcode the legacy 90px or 64px top offset',
);

assert.doesNotMatch(
  testsHubSource,
  /max-md:min-h-\[calc\(100dvh-88px\)\]/,
  'Tests hub should not subtract a fixed shell height locally',
);

assert.match(
  testsHubSource,
  /max-md:min-h-\[var\(--mobile-page-available-height,100dvh\)\]/,
  'Tests hub should consume the shared mobile viewport available-height variable',
);

assert.match(
  testsHubSource,
  /max-md:pb-\[var\(--mobile-page-content-end-inset,0px\)\]/,
  'Tests hub content owner should consume the dynamic mobile content-end inset',
);

assert.doesNotMatch(
  testsHubSource,
  /max-md:pb-0/,
  'Tests hub should not erase the visible shell content-end inset',
);

assert.doesNotMatch(
  testsHubSource,
  /safe-area-inset/,
  'Tests hub should not duplicate the safe zone already present in the Figma frame',
);

assert.match(
  appSource,
  /const Tests = lazy\(\(\) => import\('\.\/pages\/Tests'\)\.then\(\(module\) => \(\{ default: module\.Tests \}\)\)\);/,
  'App should lazy-load the Tests page',
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
  'Проверь свои знания',
  'Тест по слабым темам',
  'Пройти тест →',
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
  'bg-[#ded2f1]',
  'bg-[#6a37c3]',
  'rounded-[8px]',
  'h-10 w-full',
  'size-8',
  'bg-[rgba(134,91,207,0.25)]',
]) {
  assert.match(
    testsViewSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Tests page should preserve the Figma mobile class ${className}`,
  );
}

assert.doesNotMatch(
  weakTopicsModelSource,
  /FALLBACK_WEAK_TOPICS/,
  'Tests page model should not invent weak topics before analysis data exists',
);

assert.match(testsSource, /status.*'loading'.*'ready'.*'empty'.*'error'/s);
assert.match(testsHubSource, /to="\/analyze"/);
assert.match(testsHubSource, /noAnalysisTitle/);
assert.match(testsHubSource, /loadErrorTitle/);
assert.doesNotMatch(testsHubSource, /WeakTopicProgressList topics=\{weakTopics\}.*status === 'empty'/s);

assert.match(
  testsViewSource,
  /WeakTopicProgressList/,
  'Tests page should isolate progress row rendering for weak-topic percentages',
);

assert.match(
  weakTopicProgressSource,
  /!h-1 !w-\[112px\] !bg-\[rgba\(134,91,207,0\.25\)\] \[&>span\]:!bg-\[#865bcf\]/,
  'Weak-topic progress track and fill should override shared Progress surface colors with the Figma tokens',
);

assert.match(
  testsViewSource,
  /GoalIcon/,
  'Weak-topic test card should use the requested Hugeicons GoalIcon',
);

assert.match(
  testsHubStorySource,
  /getByRole\('link', \{ name: 'Пройти тест →' \}\)/,
  'Live Analysis story should focus the Figma weak-topic CTA',
);

assert.match(
  testsViewSource,
  /ArrowRight02Icon/,
  'Secondary test rows should use the Figma right-arrow affordance',
);
