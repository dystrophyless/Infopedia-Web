import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopUploadGuide.tsx'), 'utf8');
const pageSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const storiesSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.stories.tsx'), 'utf8');
const visualRunner = readFileSync(path.resolve(import.meta.dirname, 'Analyze.upload-responsive.visual.mjs'), 'utf8');

assert.match(
  source,
  /max-md:px-6[^\"]*max-\[359px\]:px-4/,
  'Analyze upload rail should use 16px side padding at 320px and 24px at wider mobile widths',
);

assert.match(
  source,
  /<div className="mt-6 grid grid-cols-1 gap-4[^\"]*min-\[360px\]:grid-cols-2[^\"]*min-\[360px\]:gap-2/,
  'Analyze benefits should stack at 320px and use a 2+1 grid from 360px',
);

assert.match(
  source,
  /className="[^\"]*min-h-\[96px\][^\"]*"/,
  'Analyze benefit cards should use a natural height with a 96px minimum',
);

assert.doesNotMatch(
  source,
  /<article className="[^\"]*\bh-24\b/,
  'Analyze benefit cards must not use a fixed 96px height that clips localized copy',
);

assert.match(source, /data-analyze-adaptive-upload/, 'the controlled upload component should expose one adaptive root');
assert.match(source, /md:w-full[\s\S]*min-\[1440px\]:w-\[990px\]/, 'intermediate desktop should stay fluid while 1440 preserves the 990px Figma width');
assert.doesNotMatch(pageSource, /hidden min-\[1440px\]:block[\s\S]*AnalyzeDesktopUploadGuide|showDesktopUploadGuide/, 'Analyze should not hide the adaptive guide at intermediate widths');
assert.match(storiesSource, /export const UploadEmptyDesktop1231:/, 'Storybook should expose the intermediate desktop composition');
assert.match(visualRunner, /\['desktop-1231x800', 'ru', 1231, 800\]/, 'responsive evidence should cover the reported 1231px viewport');
assert.match(visualRunner, /\['desktop-1439x900', 'ru', 1439, 900\]/, 'responsive evidence should cover the last intermediate pixel');

assert.match(
  visualRunner,
  /\['ru-375x667', 'ru', 375, 667\]/,
  'Responsive visual runner must cover the short 375x667 viewport',
);

assert.match(
  visualRunner,
  /\['ru-375x812', 'ru', 375, 812\]/,
  'Responsive visual runner must retain the canonical 375x812 viewport',
);

assert.match(
  visualRunner,
  /await page\.waitForTimeout\(100\)[\s\S]*bottom\.bottom <= bottom\.navTop - 32/,
  'Responsive visual runner must verify 32px post-scroll fixed-nav clearance',
);

assert.doesNotMatch(
  visualRunner,
  /Math\.max\(navTop - card\.bottom, documentClearance\)/,
  'Responsive visual runner must not substitute document-relative clearance for post-scroll viewport geometry',
);

assert.doesNotMatch(
  source,
  /<article className="[^\"]*(?:overflow-hidden|line-clamp|text-ellipsis|truncate|whitespace-nowrap)/,
  'Analyze benefit cards should not clip or ellipsize localized copy',
);
