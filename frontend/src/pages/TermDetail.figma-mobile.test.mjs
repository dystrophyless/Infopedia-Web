import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');

const termDetailSource = readFileSync(path.resolve(pagesDir, 'TermDetail.tsx'), 'utf8');
const termSearchSource = readFileSync(path.resolve(pagesDir, 'TermSearch.tsx'), 'utf8');
const termCardSource = readFileSync(path.resolve(componentsDir, 'TermCard.tsx'), 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

assert.match(
  termDetailSource,
  /import \{ getTerm \} from '\.\.\/api\/terms';/,
  'Term detail should fetch the API term when router state is missing',
);

assert.match(
  termDetailSource,
  /getTerm\(termRef\)/,
  'Term detail should load /api/terms/:publicId for direct or refreshed term routes',
);

assert.doesNotMatch(
  termDetailSource,
  /<Navigate\b/,
  'Term detail should not redirect away when the term can be fetched by public id',
);

assert.match(
  termDetailSource,
  /max-md:bg-\[#efebf6\]/,
  'Mobile term detail should use the Figma pale purple background',
);

assert.match(
  termDetailSource,
  /md:hidden[\s\S]*ArrowLeft01Icon[\s\S]*termDetail\.title[\s\S]*Bookmark02Icon/,
  'Mobile term detail should render the Figma app header with back and save controls',
);

assert.match(
  termDetailSource,
  /<header className="mx-2 flex h-\[72px\] items-center justify-between md:hidden">/,
  'Mobile term detail header should align with the Figma mobile content rail',
);

assert.match(
  termDetailSource,
  /MoreHorizontalIcon/,
  'Mobile term detail should use the Hugeicons overflow icon instead of text dots',
);

assert.doesNotMatch(
  termDetailSource,
  /\n\s*\.\.\.\s*\n/,
  'Mobile term detail overflow action should not render literal text dots',
);

assert.match(
  termDetailSource,
  /text-\[24px\] font-medium leading-6 text-\[#161519\]/,
  'Mobile term detail title should match the compact Figma title style',
);

assert.match(
  termDetailSource,
  /termDetail\.definition[\s\S]*rounded-\[8px\] bg-\[#fbfbfb\] p-4/,
  'Mobile term detail should render the Figma definition card',
);

assert.match(
  termDetailSource,
  /UserCheck01Icon/,
  'Mobile term detail should use the Figma user-check icon for the known-term stat',
);

assert.match(
  termDetailSource,
  /UserMultiple03Icon/,
  'Mobile term detail should use the Figma user-multiple icon for the tested-term stat',
);

assert.doesNotMatch(
  termDetailSource,
  /Profile02Icon/,
  'Mobile term detail stats should not use the generic profile icon',
);

assert.match(
  termDetailSource,
  /termDetail\.knownStatValue[\s\S]*termDetail\.knownStatLabel[\s\S]*UserCheck01Icon[\s\S]*bg-\[#865bcf\]/,
  'Mobile term detail should render the first Figma stat tile',
);

assert.match(
  termDetailSource,
  /termDetail\.testedStatValue[\s\S]*termDetail\.testedStatLabel[\s\S]*UserMultiple03Icon[\s\S]*bg-\[#865bcf\]/,
  'Mobile term detail should render the second Figma stat tile',
);

assert.match(
  termDetailSource,
  /BookOpen02Icon[\s\S]*Bookmark02Icon[\s\S]*SearchList01Icon[\s\S]*termDetail\.source[\s\S]*bg-\[#6a37c3\]/,
  'Mobile term detail source card should match the Figma two-column source panel with purple rail',
);

assert.match(
  termDetailSource,
  /termDetail\.relatedTerms[\s\S]*data-term-related-chip/,
  'Mobile term detail should render related search terms as Figma chips when they are available',
);

assert.match(
  termDetailSource,
  /termDetail\.testCta[\s\S]*termDetail\.testMeta[\s\S]*ArrowRight02Icon/,
  'Mobile term detail should render the Figma dark test CTA',
);

assert.match(
  termSearchSource,
  /relatedTerms=\{getRelatedTerms\(term, displayResults\)\}/,
  'Term search should pass nearby search results into term detail as related terms',
);

assert.match(
  termCardSource,
  /relatedTerms\?: Pick<Term, 'public_id' \| 'name'>\[\]/,
  'Desktop term cards should accept related search terms for the detail route state',
);

for (const translations of [ruLocale, kkLocale]) {
  for (const key of [
    'title',
    'definition',
    'source',
    'relatedTerms',
    'knownStatValue',
    'knownStatLabel',
    'testedStatValue',
    'testedStatLabel',
    'testCta',
    'testMeta',
    'loading',
    'loadFailed',
    'saveAria',
    'moreAria',
  ]) {
    assert.equal(
      typeof translations.termDetail[key],
      'string',
      `Locale should define termDetail.${key}`,
    );
  }
}
