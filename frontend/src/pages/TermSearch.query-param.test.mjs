import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const searchSource = readFileSync(
  path.resolve(import.meta.dirname, 'TermSearch.tsx'),
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
  searchSource,
  /setQuery\(initialQuery\)/,
  'TermSearch should place the URL query into the shared search store',
);
