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

assert.ok(
  existsSync(testsPagePath),
  'Tests tab should have a dedicated Tests.tsx page',
);

const testsSource = existsSync(testsPagePath)
  ? readFileSync(testsPagePath, 'utf8')
  : '';

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
  testsSource,
  /buildWeakTopicInsights/,
  'Tests page should reuse the weak-topic scoring utility',
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
    testsSource,
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
    testsSource,
    new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Tests page should preserve the Figma mobile class ${className}`,
  );
}

assert.match(
  testsSource,
  /FALLBACK_WEAK_TOPICS/,
  'Tests page should keep Figma sample weak topics visible before analysis data exists',
);

assert.match(
  testsSource,
  /WeakTopicProgressRow/,
  'Tests page should isolate progress row rendering for weak-topic percentages',
);

assert.match(
  testsSource,
  /Target01Icon/,
  'Weak-topic test card should use a goal/target icon matching the Figma card',
);

assert.match(
  testsSource,
  /ArrowRight02Icon/,
  'Secondary test rows should use the Figma right-arrow affordance',
);
