import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const navbarSource = readFileSync(
  path.resolve(import.meta.dirname, 'Navbar.tsx'),
  'utf8',
);

assert.match(
  navbarSource,
  /const SEARCH_NAV_PATHS = new Set\(\['\/search', '\/semantic-search'\]\);/,
  'Navbar search item should treat both search pages as the same navigation section',
);

assert.match(
  navbarSource,
  /const searchNavIsActive = SEARCH_NAV_PATHS\.has\(location\.pathname\);/,
  'Navbar should derive search active state from the shared search route set',
);

assert.match(
  navbarSource,
  /searchNavIsActive\s*\?\s*'font-medium text-accent'/,
  'Authenticated search nav button should use the shared active state',
);

assert.doesNotMatch(
  navbarSource,
  /location\.pathname === '\/search'/,
  'Navbar should not only mark the title-search route as active',
);
