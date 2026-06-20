import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const termSearchSource = readFileSync(
  path.resolve(import.meta.dirname, 'TermSearch.tsx'),
  'utf8',
);
const semanticSearchSource = readFileSync(
  path.resolve(import.meta.dirname, 'SemanticSearch.tsx'),
  'utf8',
);
const termDetailSource = readFileSync(
  path.resolve(import.meta.dirname, 'TermDetail.tsx'),
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
const heroSource = readFileSync(
  path.resolve(import.meta.dirname, '../components/Hero.tsx'),
  'utf8',
);

assert.match(
  termSearchSource,
  /mx-auto max-w-\[900px\] px-6 py-14/,
  'Term search establishes the shared page top spacing',
);

assert.match(
  semanticSearchSource,
  /mx-auto max-w-\[900px\] px-6 py-14/,
  'Semantic search should match term search page spacing',
);

assert.match(
  termDetailSource,
  /mx-auto max-w-\[860px\] px-6 py-14/,
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
  /min-h-\[calc\(100vh-80px\)\] bg-bg px-6 pb-16 pt-14 max-md:px-4/,
  'Profile should match term search top spacing',
);

assert.match(
  heroSource,
  /w-full bg-bg px-6 pb-\[72px\] pt-14/,
  'Landing hero should match term search top spacing',
);

for (const [name, source] of [
  ['Analyze', analyzeSource],
  ['Profile', profileSource],
  ['Hero', heroSource],
]) {
  assert.doesNotMatch(
    source,
    /py-8 max-lg:h-auto|max-md:pt-8|max-md:py-6/,
    `${name} should not keep a custom vertical offset from the navbar`,
  );
}
