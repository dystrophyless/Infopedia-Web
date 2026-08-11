import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(import.meta.dirname, 'useTermSearchController.ts'),
  'utf8',
);

assert.match(
  source,
  /const requestBookCatalog = searchFilterSelections\.book\.length > 0 \? bookCatalogSnapshot : null/,
  'catalog refreshes without a selected publisher must not recreate the active search dependency',
);
assert.match(
  source,
  /bookCatalog: requestBookCatalog/,
  'request descriptor should resolve publishers only when a publisher is selected',
);

console.log('Term search catalog-refresh race contract passed');
