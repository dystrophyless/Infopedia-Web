import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const container = readFileSync(path.resolve(pagesDir, 'TermDetail.tsx'), 'utf8');
const view = readFileSync(path.resolve(srcDir, 'features/terms/components/TermDetailView.tsx'), 'utf8');
const termCard = readFileSync(path.resolve(srcDir, 'features/terms/components/TermCard.tsx'), 'utf8');
const search = readFileSync(path.resolve(srcDir, 'features/search/pages/TermSearchPage.tsx'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'));

assert.match(container, /import \{ getTerm \} from '\.\.\/api\/terms'/, 'Route container must own direct-link API loading');
assert.match(container, /routeStateTerm\?\.public_id === termRef/, 'Matching router state must remain the fast path');
assert.match(container, /getTerm\(termRef\)/, 'Missing router state must fetch by public ID');
assert.doesNotMatch(container, /<Navigate\b/, 'A deep link must not redirect away');
assert.match(container, /state\?\.backTo \?\? \(isAuthenticated \? '\/search' : '\/'\)/, 'Back route must retain authenticated and guest defaults');
assert.match(container, /<TermDetailView/, 'Route must delegate rendering to the feature view');

assert.match(view, /max-md:bg-canvas/, 'Mobile detail must use the semantic token exactly matching the Figma canvas');
assert.match(view, /<header className="mx-2 flex h-\[72px\] items-center justify-between md:hidden">/, 'Mobile app header geometry must remain exact');
assert.match(view, /ArrowLeft01Icon[\s\S]*termDetail\.title[\s\S]*Bookmark02Icon[\s\S]*MoreHorizontalIcon/, 'Header must retain back, save, and overflow controls');
assert.doesNotMatch(view, /\n\s*\.\.\.\s*\n/, 'Overflow control must not regress to literal dots');
assert.match(view, /text-\[24px\] font-medium leading-6 text-text-body/, 'Mobile term title must keep compact Figma typography with its exact semantic color');
assert.match(view, /termDetail\.definition[\s\S]*rounded-\[8px\] bg-surface-subtle p-4/, 'Definition panel must retain accepted geometry and exact surface token');
assert.match(view, /termDetail\.knownStatValue[\s\S]*termDetail\.knownStatLabel[\s\S]*UserCheck01Icon/, 'Known stat and its exact icon must remain');
assert.match(view, /termDetail\.testedStatValue[\s\S]*termDetail\.testedStatLabel[\s\S]*UserMultiple03Icon/, 'Tested stat and its exact icon must remain');
assert.match(view, /bg-\[#865bcf\]/, 'Stats must keep the reference color because no exact semantic token exists');
assert.doesNotMatch(view, /Profile02Icon/, 'Stats must not regress to a generic profile icon');
assert.match(view, /BookOpen02Icon[\s\S]*Bookmark02Icon[\s\S]*SearchList01Icon/, 'Source rows must retain all three domain icons');
assert.match(view, /termDetail\.source[\s\S]*grid-cols-\[117px_minmax\(0,1fr\)\][\s\S]*bg-action-selected/, 'Source panel must retain two columns and the exact purple rail token');
assert.match(view, /termDetail\.relatedTerms[\s\S]*data-term-related-chip/, 'Related terms must remain route links rendered as chips');
assert.match(view, /termDetail\.testCta[\s\S]*termDetail\.testMeta[\s\S]*ArrowRight02Icon/, 'Test CTA copy and icon must remain');
assert.match(view, /getDefinitionIndex[\s\S]*goPrevious[\s\S]*goNext/, 'Multiple-definition selection and bounded navigation must remain in the view');
assert.match(view, /max-md:hidden[\s\S]*shadow-feature/, 'Desktop card geometry must remain separately rendered');

assert.match(search, /relatedTerms=\{getRelatedTerms\(term, displayResults\)\}/, 'Search must keep passing nearby terms into detail state');
assert.match(termCard, /relatedTerms\?: Pick<Term, 'public_id' \| 'name'>\[\]/, 'Term cards must accept related terms');

for (const translations of [ru, kk]) {
  for (const key of ['title', 'definition', 'source', 'relatedTerms', 'knownStatValue', 'knownStatLabel', 'testedStatValue', 'testedStatLabel', 'testCta', 'testMeta', 'loading', 'loadFailed', 'saveAria', 'moreAria']) {
    assert.equal(typeof translations.termDetail[key], 'string', `Locale should define termDetail.${key}`);
  }
}
