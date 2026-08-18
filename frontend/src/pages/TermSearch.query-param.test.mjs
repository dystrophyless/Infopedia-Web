import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const searchSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/search/pages/TermSearchPage.tsx'),
  'utf8',
);
const searchControllerSource = readFileSync(
  path.resolve(
    import.meta.dirname,
    '../features/search/hooks/useTermSearchController.ts',
  ),
  'utf8',
);

assert.match(
  searchSource,
  /useSearchParams/,
  'TermSearch should read query params for deep links from weak topic CTAs',
);

assert.match(
  searchSource,
  /searchParams\.get\('query'\)/,
  'TermSearch should support ?query= prefilling',
);

assert.match(
  searchControllerSource,
  /setQuery\(initialQuery\)/,
  'TermSearch should place the URL query into the shared search store',
);

assert.match(
  searchSource,
  /useTermSearchController\(initialQuery\)/,
  'TermSearch should pass its URL query into the feature controller',
);
