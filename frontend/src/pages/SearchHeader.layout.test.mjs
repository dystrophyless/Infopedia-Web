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
const ruTranslations = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../locales/ru/translation.json'),
    'utf8',
  ),
);
const kkTranslations = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../locales/kk/translation.json'),
    'utf8',
  ),
);

assert.match(
  termSearchSource,
  /<header className="mb-8 text-left">[\s\S]*text-\[14px\] font-medium uppercase leading-none tracking-\[0\.12em\] text-muted[\s\S]*t\('search\.eyebrow'\)[\s\S]*t\('search\.title'\)[\s\S]*t\('search\.description'\)[\s\S]*<\/header>/,
  'Term search should render a left-aligned eyebrow, title, and description block',
);

assert.match(semanticSearchSource, /MobilePageFrame[\s\S]*desktopHeader:[\s\S]*semanticSearch\.description/, 'Semantic search should use the shared responsive frame desktop header');

const termSearchHeader = termSearchSource.match(
  /<header className="mb-8 text-left">[\s\S]*?<\/header>/,
)?.[0];

assert.ok(termSearchHeader, 'Term search header should be present');
assert.doesNotMatch(
  termSearchHeader,
  /\btext-center\b/,
  'Term search title should not stay centered',
);

assert.doesNotMatch(
  semanticSearchSource,
  /Brain01Icon|justify-center[\s\S]*t\('semanticSearch\.title'\)/,
  'Semantic search title should not keep the old icon-title heading',
);

for (const translations of [ruTranslations, kkTranslations]) {
  assert.equal(
    typeof translations.search.eyebrow,
    'string',
    'Term search eyebrow should be localized',
  );
  assert.ok(
    translations.search.eyebrow.length > 3,
    'Term search eyebrow should name the title-search mode',
  );
  assert.equal(
    typeof translations.search.description,
    'string',
    'Term search description should be localized',
  );
  assert.ok(
    translations.search.description.length > 20,
    'Term search description should explain the search mode',
  );
  assert.equal(
    typeof translations.semanticSearch.eyebrow,
    'string',
    'Semantic search eyebrow should be localized',
  );
  assert.ok(
    translations.semanticSearch.eyebrow.length > 3,
    'Semantic search eyebrow should name the description-search mode',
  );
  assert.equal(
    typeof translations.semanticSearch.description,
    'string',
    'Semantic search description should be localized',
  );
  assert.ok(
    translations.semanticSearch.description.length > 20,
    'Semantic search description should explain the search mode',
  );
}
