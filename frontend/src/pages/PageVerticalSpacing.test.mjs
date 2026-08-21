import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const termSearchSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/search/pages/TermSearchPage.tsx'),
  'utf8',
);
const termDetailSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/terms/components/TermDetailView.tsx'),
  'utf8',
);
const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);
const profileSource = readFileSync(
  path.resolve(import.meta.dirname, 'Profile.tsx'),
  'utf8',
);
const landingSource = readFileSync(path.resolve(import.meta.dirname, 'Landing.tsx'), 'utf8');

assert.match(
  termSearchSource,
  /mx-auto max-w-\[900px\] px-6 md:pb-14 md:pt-14/,
  'Term search retains desktop bottom spacing while the mobile page frame owns the content-end inset',
);


assert.match(
  termDetailSource,
  /px-0 pb-\[108px\] pt-\[42px\] max-md:px-6 max-md:pb-\[108px\] max-md:pt-\[42px\] md:px-2/,
  'Term detail must preserve its approved 42px mobile offset, leaving 32px from the 44px action-target boundary at y=114 to content at y=146',
);

assert.match(
  analyzeSource,
  /ANALYZE_UPLOAD_PAGE_CLASS = 'mx-auto flex h-\[calc\(100dvh-80px\)\] w-full max-w-\[1180px\] flex-col overflow-hidden px-6 py-14/,
  'Analyze upload should match term search top spacing',
);

assert.match(
  analyzeSource,
  /ANALYZE_PAGE_CLASS = 'mx-auto w-full max-w-\[1180px\] overflow-x-hidden px-6 py-14 max-md:px-4'/,
  'Analyze result states should match term search top spacing',
);

assert.match(
  profileSource,
  /min-h-\[calc\(100vh-80px\)\] bg-bg px-6 pb-16 pt-14 max-md:min-h-screen max-md:px-0 max-md:pb-\[var\(--mobile-page-content-end-inset,0px\)\] max-md:pt-0/,
  'Profile must retain desktop spacing while consuming the shared mobile content-end inset',
);

assert.match(landingSource, /bg-\[#efebf6\]/, 'Landing should keep the canonical guest surface');

for (const [name, source] of [
  ['Analyze', analyzeSource],
  ['Profile', profileSource],
]) {
  assert.doesNotMatch(
    source,
    /py-8 max-lg:h-auto|max-md:pt-8|max-md:py-6/,
    `${name} should not keep a custom vertical offset from the navbar`,
  );
}
