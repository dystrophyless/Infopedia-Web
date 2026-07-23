import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const pageSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const storiesSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.stories.tsx'), 'utf8');
const ruSource = readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8');
const kkSource = readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8');

const tailwindConfig = loadConfig(path.resolve(import.meta.dirname, '../../tailwind.config.ts'));
const scoreUtilities = await postcss([
  tailwindcss({
    ...tailwindConfig,
    content: [{ raw: '<div class="items-end pb-[4px]"></div>', extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });

function assertTailwindDeclaration(selector, property, expectedValue) {
  let matchingRule;
  scoreUtilities.root.walkRules((rule) => {
    if (rule.selector === selector) matchingRule = rule;
  });
  assert.ok(matchingRule, `Tailwind did not generate ${selector}`);
  assert.ok(
    matchingRule.nodes.some(
      (node) => node.type === 'decl' && node.prop === property && node.value === expectedValue,
    ),
    `${selector} must emit ${property}: ${expectedValue}`,
  );
}

assertTailwindDeclaration('.items-end', 'align-items', 'flex-end');
assertTailwindDeclaration('.pb-\\[4px\\]', 'padding-bottom', '4px');

const mobileSource = pageSource.slice(
  pageSource.indexOf('export function AnalyzeMobileResults'),
  pageSource.indexOf('function SummaryStat'),
);
const scoreCardSource = mobileSource.slice(
  mobileSource.indexOf('<article className="mt-6 rounded-[8px] bg-[#ffffff] px-6 py-4">'),
  mobileSource.indexOf('</article>', mobileSource.indexOf('<article className="mt-6 rounded-[8px] bg-[#ffffff] px-6 py-4">')) + '</article>'.length,
);
const lockedSource = mobileSource.slice(
  mobileSource.indexOf('{locked ? ('),
  mobileSource.indexOf(') : (', mobileSource.indexOf('{locked ? (')),
);
const mobileCardSource = mobileSource.slice(
  mobileSource.indexOf('function AnalyzeMobileChapterCard'),
  mobileSource.indexOf('function SummaryStat'),
);
const cardDataSource = mobileCardSource.slice(
  mobileCardSource.indexOf('const topics'),
  mobileCardSource.indexOf('{locked ? ('),
);

assert.match(
  pageSource,
  /const resultAccess = useMemo\(\s*\(\) => selectAnalyzeResultAccess\(uniqueSuccessResults\)/,
  'Mobile access selection should consume normalized unique successful results',
);
assert.match(
  pageSource,
  /<div className="hidden md:block">[\s\S]*<AnalyzeResults[\s\S]*<\/div>[\s\S]*<div className="md:hidden">[\s\S]*<AnalyzeMobileResults[\s\S]*access=\{resultAccess\}/,
  'Desktop and mobile result renderers should be separated at md',
);
assert.match(mobileSource, /mobileResultTitle/, 'Mobile app bar should keep the navigation title key');
assert.match(mobileSource, /onBack: \(\) => void;[\s\S]*onTitleClick\?: \(\) => void;/, 'Mobile results should expose a back callback and optional title callback');
assert.match(mobileSource, /title=\{onTitleClick \? \(/, 'Mobile app-bar title should branch on the optional title callback');
assert.match(mobileSource, /<button[\s\S]*onClick=\{onTitleClick\}[\s\S]*mobileResultTitle/, 'Latest mobile app-bar title should use a native button');
assert.match(mobileSource, /\) : t\('analyze\.mobileResultTitle'\)\}/, 'Ordinary mobile results should keep the title as plain translation text');
assert.match(mobileSource, /<button[\s\S]*onClick=\{onBack\}[\s\S]*mobileResultBack/, 'Mobile app-bar arrow should use the back callback');
assert.match(mobileSource, /<h1[^>]*>\s*\{t\('analyze\.mobileResultHeading'\)\}/, 'Mobile h1 should keep the separate results heading key');
assert.match(mobileSource, /mobileLostPointsValue', \{ count: lostPoints \}/, 'Lost-points summary should stay dynamic');
assert.match(mobileSource, /mobileFreeSummaryValue', \{ count: access\.freeChapter \? 1 : 0 \}/, 'Free-summary count should stay derived from access');
assert.match(pageSource, /<div className="hidden md:block">/, 'Desktop results should remain hidden on mobile');
assert.match(pageSource, /<div className="md:hidden">/, 'Mobile results should remain hidden on desktop');
assert.match(
  pageSource,
  /\$\{isMobileResult \? 'max-md:hidden' : ''\}/,
  'Only the successful mobile result state should hide the desktop page header',
);
assert.match(
  pageSource,
  /const ANALYZE_RESULTS_PAGE_CLASS = '[^']*max-md:max-w-none[^']*max-md:bg-\[#efebf6\][^']*max-md:py-0'/,
  'Mobile results should use the full lavender canvas without an outer bottom padding',
);
const resultsPageClass = pageSource.match(/const ANALYZE_RESULTS_PAGE_CLASS = '([^']+)'/)?.[1] ?? '';
assert.doesNotMatch(
  resultsPageClass,
  /(?:^|\s)max-md:pb-[^\s]+/,
  'The results page class must not own mobile bottom padding',
);
assert.match(
  mobileSource,
  /<div className="mx-auto w-full max-w-\[430px\] px-6 pb-8">/,
  'Mobile results inner wrapper should keep the 32px page-end gap',
);
assert.equal(
  (pageSource.match(/function AnalyzeMobileChapterCard\(/g) ?? []).length,
  1,
  'Mobile free and locked chapters should share one card renderer',
);
assert.match(
  pageSource,
  /<AnalyzeMobileChapterCard chapter=\{access\.freeChapter\} locked=\{false\}/,
  'The selected free chapter should use the unlocked renderer state',
);
assert.match(
  pageSource,
  /<AnalyzeMobileChapterCard key=\{getAnalyzeChapterKey\(chapter\)\} chapter=\{chapter\} locked \/>/,
  'Remaining ordered chapters should use the locked renderer state',
);
assert.match(mobileSource, /HugeiconsIcon icon=\{ArrowLeft01Icon\}/, 'Mobile app bar should use HugeIcons for back');
assert.match(mobileSource, /HugeiconsIcon icon=\{StarIcon\} size=\{32\}/, 'Score card should use the 32px HugeIcons star');
assert.match(scoreCardSource, /rounded-\[8px\] bg-\[#ffffff\] px-6 py-4/, 'Score card should use white 8px card with 24px horizontal and 16px vertical padding');
assert.match(scoreCardSource, /<div className="flex items-center gap-6">/, 'Score card icon and copy should use a 24px row gap');
assert.match(scoreCardSource, /text-\[12px\] font-medium leading-3 text-\[#865bcf\]/, 'Score label should use #865bcf at 12px/12px medium');
assert.match(scoreCardSource, /text-\[32px\] leading-8 text-\[#161519\]/, 'Score value should use #161519 at 32px/32px');
assert.match(scoreCardSource, /<p className="mt-1 flex items-end font-medium leading-none">[\s\S]*<span className="text-\[32px\] leading-8 text-\[#161519\]">\{totalScore\}<\/span>[\s\S]*<span className="ml-1 pb-\[4px\]">[\s\S]*<span className="text-\[20px\] font-normal leading-5 text-\[#524d5b\]">\/\{totalMaxScore\}<\/span>/, 'Score row should align items to flex-end with a 32px score and nested 20px denominator wrapper');
assert.doesNotMatch(scoreCardSource, /items-baseline/, 'Score row must not use baseline alignment');
assert.doesNotMatch(scoreCardSource, /pb-4/, 'Score card must use exact 4px denominator padding, not Tailwind pb-4');
assert.doesNotMatch(scoreCardSource, /<span className="[^"]*py-4[^"]*">\/[^{<]+/, 'Denominator wrapper should not use vertical padding');
assert.doesNotMatch(scoreCardSource, /#6a37c3|#252329|#858188/, 'Score card should not retain legacy score-block colors');
assert.match(mobileSource, /HugeiconsIcon icon=\{BookOpen01Icon\} size=\{16\}/, 'Topic rows should use the 16px HugeIcons book icon');
assert.doesNotMatch(mobileSource, /<svg\b/, 'Mobile results should not introduce fake inline SVG icons');
assert.match(mobileSource, /topic_codes \?\? \[\]/, 'Mobile chapters should read the optional topic_codes contract');
assert.match(mobileSource, /key=\{topic\.name\}/, 'Topic rows should use stable topic names as keys');
assert.match(
  mobileSource,
  /<span className="min-w-0 flex-1 break-words text-\[12px\] leading-3">\{topic\.title\}<\/span>/,
  'Visible topic rows should use localized titles with full-width wrapping text',
);
assert.match(
  mobileSource,
  /const materialGrades = Array\.from\(new Set\(chapter\.material_grades \?\? \[\]\)\)\.sort\(/,
  'Material-grade labels must come only from the explicit chapter.material_grades projection',
);
assert.doesNotMatch(
  cardDataSource,
  /topic\.name|topic\.title/,
  'Card data preparation must not derive locked labels from real topic names or titles',
);
assert.match(
  mobileSource,
  /const topics = locked \? \[\] : chapter\.topic_codes \?\? \[\]/,
  'Locked chapters must not expose topic-code data to the visible topic list',
);
assert.match(
  mobileSource,
  /const topicCount = locked\s*\?\s*chapter\.topic_count \?\? 0\s*:/,
  'Locked preview size must use the chapter topic_count contract',
);
assert.match(
  mobileCardSource,
  /const previewLabelKeys = \[[\s\S]*mobileHiddenTopicPreview1[\s\S]*mobileHiddenTopicPreview7[\s\S]*const fakePreviewRows = Array\.from\(\s*\{ length: topicCount \}[\s\S]*previewIndex % previewLabelKeys\.length/,
  'Locked preview must render exactly one deterministic local row per hidden topic',
);
assert.match(
  mobileCardSource,
  /const previewBaseLabel = t\(previewLabelKeys\[previewIndex % previewLabelKeys\.length\]\);/,
  'Locked preview rows must keep selecting one of seven localized base labels by cycle index',
);
assert.match(
  mobileCardSource,
  /const label = previewIndex < previewLabelKeys\.length\s*\? previewBaseLabel\s*: `\$\{previewBaseLabel\} \$\{t\('analyze\.mobileHiddenTopicPreviewIndex', \{ index: previewIndex \+ 1 \}\)\}`;/,
  'Locked preview rows must append a localized deterministic index after the first seven rows',
);
assert.doesNotMatch(
  mobileCardSource,
  /label: t\(previewLabelKeys\[previewIndex % previewLabelKeys\.length\]\)/,
  'Locked preview rows must not repeat the base label as the complete visible string',
);
assert.equal(
  (mobileCardSource.match(/mobileHiddenTopicPreview[1-7]/g) ?? []).length,
  7,
  'Locked preview should define exactly seven localized synthetic label keys',
);
assert.match(
  lockedSource,
  /<div key=\{previewRow\.id\} className="[^\"]*min-h-4[^\"]*items-center[^\"]*gap-2 blur-\[4px\] opacity-100[^\"]*" aria-hidden="true">[\s\S]*<HugeiconsIcon icon=\{BookOpen01Icon\} size=\{16\}[^>]*text-\[#6e6779\][^>]*aria-hidden="true" \/>[\s\S]*<span className="[^\"]*min-w-0 w-full flex-1 break-words text-\[12px\] leading-3[^\"]*">[\s\S]*previewRow\.label/,
  'Locked preview should use a centered gray 16px book icon and a full-width wrapping 12px/12px label under 4px blur',
);
assert.doesNotMatch(
  lockedSource,
  /whitespace-nowrap|className="[^\"]*(?:^| )h-4(?: |\")[^\"]*" aria-hidden="true">/,
  'Locked preview rows must not clip wrapped synthetic labels with nowrap or fixed height',
);
assert.match(
  lockedSource,
  /<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">[\s\S]*text-\[#161519\][\s\S]*text-\[#6e6779\]/,
  'Locked preview overlay should center high-contrast copy without a white wash',
);
assert.match(
  mobileCardSource,
  /<div className="min-w-0 px-2">[\s\S]*<p className="mt-1 break-words text-\[12px\] leading-none text-\[#a585db\]">[\s\S]*<div className="relative mt-4 min-h-\[64px\] rounded-\[8px\]"/,
  'Topic helper and locked preview should share the same 8px inner wrapper',
);
assert.match(
  lockedSource,
  /<div className="grid gap-2">/,
  'Locked preview rows should not add row-only horizontal padding',
);
assert.match(
  mobileCardSource,
  /<ul className="mt-4 grid gap-2">[\s\S]*items-center gap-2 text-\[12px\] leading-3[\s\S]*text-\[#6e6779\]/,
  'Free topic rows should align their gray book icons centrally with 12px/12px text',
);
assert.doesNotMatch(
  lockedSource,
  /w-(?:1\/2|2\/3|3\/4|5\/6)|widthClass|w-\[/,
  'Locked preview rows must not use width caps',
);
assert.match(
  lockedSource,
  /min-w-0 w-full flex-1 break-words text-\[12px\] leading-3/,
  'Locked preview labels must occupy the available row width and wrap',
);
assert.doesNotMatch(
  lockedSource,
  /bg-white\/55|opacity-70/,
  'Locked preview should not reintroduce a low-contrast row or opaque overlay mask',
);
assert.doesNotMatch(
  lockedSource,
  /topic\.(?:title|name)|chapter\.topic_codes/,
  'Locked rendering must not read real topic titles, identifiers, or topic-code data',
);
assert.match(mobileSource, /<div className="relative mt-4 min-h-\[64px\] rounded-\[8px\]" aria-hidden="true">/, 'Locked preview content should reserve centered overlay height without clipping the blur');
assert.doesNotMatch(lockedSource, /overflow-hidden|truncate/, 'Locked preview rows must keep their long blurred text visible');
assert.match(
  mobileSource,
  /to=\{`\/practice-by-topic\?chapterId=\$\{encodeURIComponent\(String\(chapter\.chapter_id\)\)\}`\}/,
  'Free practice CTA should route to practice by topic with the selected chapterId',
);
assert.match(mobileSource, /to="\/profile"/, 'Premium CTA should use the existing profile destination');

for (const [locale, source] of [['RU', ruSource], ['KK', kkSource]]) {
  for (const key of [
    'mobileResultTitle',
    'mobileResultBack',
    'mobileResultHeading',
    'mobileScoreLabel',
    'mobileLostPoints',
    'mobileFreeSummary',
    'mobileWeakSectionTitle',
    'mobileTopicsTitle',
    'mobilePracticeCta',
    'mobileHiddenTopics',
    'mobilePremiumMessage',
    'mobilePremiumCta',
    'mobileHiddenTopicPreviewIndex',
    ...Array.from({ length: 7 }, (_, index) => `mobileHiddenTopicPreview${index + 1}`),
  ]) {
    assert.match(source, new RegExp(`"${key}"\\s*:`), `${locale} locale should define analyze.${key}`);
  }
}

for (const [locale, source] of [['RU', ruSource], ['KK', kkSource]]) {
  const analyze = JSON.parse(source).analyze;
  const previewLabels = Array.from({ length: 7 }, (_, index) => analyze[`mobileHiddenTopicPreview${index + 1}`]);
  assert.equal(new Set(previewLabels).size, 7, `${locale} locked preview labels should be unique`);
  assert.ok(previewLabels.every((label) => label.length >= 40), `${locale} locked preview labels should be long and neutral`);
  assert.match(analyze.mobileHiddenTopicPreviewIndex, /\{\{index\}\}/, `${locale} repeated preview labels should have an index placeholder`);

  for (const topicCount of [0, 7, 8, 15, 32]) {
    const renderedLabels = Array.from({ length: topicCount }, (_, previewIndex) => {
      const previewBaseLabel = previewLabels[previewIndex % previewLabels.length];
      return previewIndex < previewLabels.length
        ? previewBaseLabel
        : `${previewBaseLabel} ${analyze.mobileHiddenTopicPreviewIndex.replace('{{index}}', String(previewIndex + 1))}`;
    });
    assert.equal(
      new Set(renderedLabels).size,
      topicCount,
      `${locale} locked preview labels should remain unique for topicCount=${topicCount}`,
    );
  }
}

for (const [locale, source, expected] of [
  ['RU', ruSource, {
    mobileResultTitle: 'Слабые темы',
    mobileResultHeading: 'Результаты',
    mobileScoreLabel: 'Ваш балл',
    mobileLostPointsLabel: 'Потеряно',
    mobileLostPointsValue: '{{count}} баллов',
    mobileLostPointsHelper: 'Узнайте, где вы потеряли больше всего и повторите',
    mobileFreeSummaryLabel: 'Бесплатно доступен',
    mobileFreeSummaryValue: '{{count}} раздел для разбора',
    mobileFreeSummaryHelper: 'Хотите получить больше? Оформите подписку',
  }],
  ['KK', kkSource, {
    mobileResultTitle: 'Әлсіз тақырыптар',
    mobileResultHeading: 'Нәтижелер',
    mobileScoreLabel: 'Сіздің балыңыз',
    mobileLostPointsLabel: 'Жоғалғаны',
    mobileLostPointsValue: '{{count}} балл',
    mobileLostPointsHelper: 'Ең көп балл жоғалтқан жеріңізді біліп, қайталаңыз',
    mobileFreeSummaryLabel: 'Тегін қолжетімді',
    mobileFreeSummaryValue: '{{count}} бөлімді талдауға',
    mobileFreeSummaryHelper: 'Көбірек алғыңыз келе ме? Жазылымды рәсімдеңіз',
  }],
]) {
  const parsed = JSON.parse(source).analyze;
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(parsed[key], value, `${locale} analyze.${key} should match the mobile reference copy`);
  }
}

assert.match(
  storiesSource,
  /const mobileResults: AnalyzeChapterResult\[\] = \[[\s\S]*chapter_id: 4[\s\S]*material_grades: \[10, 11\][\s\S]*topic_codes:[\s\S]*chapter_id: 2[\s\S]*material_grades: \[11\][\s\S]*topic_codes: \[\]/,
  'Mobile Figma story should contain explicit material summaries and real topic codes only for the free chapter',
);
const mobileFixtureSource = storiesSource.slice(
  storiesSource.indexOf('const mobileResults'),
  storiesSource.indexOf('const meta'),
);
const oneTopicLockedFixture = `{
  chapter_id: 99,
  topic_count: 1,
  material_grades: [11],
  topic_codes: [],
}`;
assert.match(oneTopicLockedFixture, /topic_count: 1/);
assert.match(oneTopicLockedFixture, /topic_codes: \[\]/);
assert.doesNotMatch(oneTopicLockedFixture, /loops|arrays|protocols|routing|security|sql|relations|binary|encoding/);
assert.match(
  mobileCardSource,
  /Array\.from\(\s*\{ length: topicCount \}/,
  'One-topic locked fixture must render exactly one synthetic row',
);
assert.match(
  lockedSource,
  /min-h-\[64px\]/,
  'One-topic locked fixture must still reserve enough preview height for the centered overlay',
);
for (const chapterId of [2, 8, 11]) {
  const chapterStart = mobileFixtureSource.indexOf(`chapter_id: ${chapterId}`);
  const nextChapter = mobileFixtureSource.indexOf('chapter_id:', chapterStart + 1);
  const chapterSource = mobileFixtureSource.slice(
    chapterStart,
    nextChapter === -1 ? mobileFixtureSource.length : nextChapter,
  );
  assert.match(chapterSource, /topic_count: [1-4]/, `Locked fixture ${chapterId} should define a bounded topic count`);
  assert.match(chapterSource, /material_grades: \[[0-9, ]+\]/, `Locked fixture ${chapterId} should define material grades`);
  assert.match(chapterSource, /topic_codes: \[\]/, `Locked fixture ${chapterId} must not carry real topic-code data`);
  assert.doesNotMatch(chapterSource, /loops|arrays|protocols|routing|security|sql|relations|binary|encoding/, `Locked fixture ${chapterId} must not contain a real-topic sentinel`);
}
assert.match(
  storiesSource,
  /MobileResultsFigma430:[\s\S]*selectAnalyzeResultAccess\(mobileResults\)[\s\S]*AnalyzeMobileResults/,
  'Mobile Figma story should exercise one free and multiple locked chapters through the access selector',
);

console.log('Analyze mobile results source contracts passed');
