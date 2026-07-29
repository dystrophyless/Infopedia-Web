import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const visualRunner = readFileSync(path.resolve(import.meta.dirname, 'Analyze.upload-responsive.visual.mjs'), 'utf8');

assert.match(
  source,
  /max-md:px-6[^']*max-\[359px\]:px-4/,
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

assert.match(
  visualRunner,
  /await page\.waitForTimeout\(100\)[\s\S]*bottom\.bottom <= bottom\.navTop - 24/,
  'Responsive visual runner must verify the post-scroll card viewport against the fixed nav clearance',
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
