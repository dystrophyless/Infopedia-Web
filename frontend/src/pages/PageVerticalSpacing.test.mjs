import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const termSearchSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/search/pages/TermSearchPage.tsx'),
  'utf8',
);
const semanticSearchSource = readFileSync(
  path.resolve(import.meta.dirname, 'SemanticSearch.tsx'),
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
  /mx-auto max-w-\[900px\] px-6 pb-14 md:pt-14/,
  'Term search establishes the shared desktop top spacing and mobile page-frame offset',
);

assert.match(
  semanticSearchSource,
  /mx-auto max-w-\[900px\] px-6 py-14 pb-14 pt-2 md:pt-0/,
  'Semantic search should match term search page spacing',
);

assert.match(
  termDetailSource,
  /mx-auto max-w-\[860px\] bg-canvas px-6 pb-8 pt-\[var\(--mobile-page-app-bar-offset\)\][\s\S]*md:py-14/,
  'Term detail should match term search page spacing',
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
  /min-h-\[calc\(100vh-80px\)\] bg-bg px-6 pb-16 pt-14 max-md:min-h-screen max-md:px-0 max-md:pt-0/,
  'Profile should match term search top spacing',
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
