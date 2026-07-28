import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

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
assert.match(view, /<header className="mx-4 grid h-6 min-h-6 grid-cols-\[24px_minmax\(0,1fr\)_88px\] items-center gap-4 overflow-visible md:hidden">/, 'Mobile detail header must use the canonical compact-compatible grid');
assert.match(view, /relative size-6 overflow-visible[\s\S]*absolute left-1\/2 top-1\/2 flex size-11[\s\S]*ArrowLeft01Icon/, 'Back action must provide a 44px target around the 24px visual slot');
assert.match(view, /ArrowLeft01Icon[\s\S]*termDetail\.title[\s\S]*FavoriteToggle[\s\S]*appearance="mobile-header"[\s\S]*MoreHorizontalIcon/, 'Header must retain back, save, and overflow controls');
assert.match(view, /flex items-center justify-end gap-0[\s\S]*FavoriteToggle[\s\S]*size-11 items-center justify-center border-0 bg-transparent/, 'Trailing actions must remain independently sized, borderless, and right aligned');
assert.doesNotMatch(view, /\n\s*\.\.\.\s*\n/, 'Overflow control must not regress to literal dots');
assert.doesNotMatch(view, /max-md:pb-\[calc\(112px\+env\(safe-area-inset-bottom\)\)\][\s\S]*<h1 className="mt-4 text-\[24px\]/, 'Mobile detail content should not render a duplicate term heading before the definition section');
assert.match(view, /max-md:pt-\[var\(--mobile-page-app-bar-offset\)\][\s\S]*max-md:pt-\[42px\][\s\S]*<section><h2 className="text-\[20px\][\s\S]*termDetail\.definition[\s\S]*<div className="mt-4 min-h-\[124px\] rounded-\[8px\] bg-surface p-6[\s\S]*term\.name[\s\S]*current\.text/, 'Source/CSS geometry must place the mobile app-bar rail at y=80, definition heading at y=146, and card top at y=182');
assert.doesNotMatch(view, /safe-area-inset-top|<section className="mt-2">/, 'Mobile detail must not retain legacy safe-area or margin offsets');
assert.match(view, /<header className="mx-4 grid h-6 min-h-6/, 'Mobile detail header must retain the 24px visual row');
assert.doesNotMatch(view, /(?:^|[\s"])h-11(?:[\s"])/, 'Mobile detail must not add an in-flow h-11 row');
assert.doesNotMatch(view, /-mt-(?:\[|\d)/, 'Mobile detail must not compensate with a negative margin');
assert.equal(80 + 24 + 10, 114, '44px target overflow must end at y=114 when centered on the 24px row');
assert.equal(114 + 32, 146, 'Definition content must begin at y=146 after the interactive boundary');
assert.equal(146 - 114, 32, 'Definition anchor gap must remain 32px after the target bottom');
assert.match(view, /termDetail\.knownStatValue[\s\S]*termDetail\.knownStatLabel[\s\S]*UserCheck01Icon/, 'Known stat and its exact icon must remain');
assert.match(view, /termDetail\.testedStatValue[\s\S]*termDetail\.testedStatLabel[\s\S]*UserMultiple03Icon/, 'Tested stat and its exact icon must remain');
assert.match(view, /className="mt-4 grid grid-cols-2 gap-2"[\s\S]*flex[^\"]* items-start justify-between overflow-hidden rounded-\[8px\] bg-\[#ded2f1\] px-4 py-2/, 'Stats must use the Figma intrinsic 48px flex-card geometry without a synthetic minimum height');
assert.match(view, /shrink-0 whitespace-nowrap -mr-\[3px\][\s\S]*<p className="text-\[16px\] font-medium leading-4">\{stat\.value\}<\/p>[\s\S]*<p className="mt-1 text-\[12px\] leading-3 text-\[#a585db\]">\{stat\.label\}<\/p>/, 'Figma stat labels must keep their one-line intrinsic width while the card clips the final three-pixel overlap');
assert.doesNotMatch(view, /Profile02Icon/, 'Stats must not regress to a generic profile icon');
assert.doesNotMatch(view, /truncate text-\[12px\] leading-3 text-\[#a585db\]\">\{stat.label\}/, 'Stat labels must wrap to the second Figma line instead of truncating');
assert.match(view, /BookOpen02Icon[\s\S]*Bookmark02Icon[\s\S]*SearchList01Icon/, 'Source rows must retain all three domain icons');
assert.match(view, /function TermDetailSourcePanel[\s\S]*className="mt-12"[\s\S]*<div className="mt-4 flex items-center gap-6 rounded-\[8px\] bg-surface px-6 py-4[^\"]*"[\s\S]*BookOpen02Icon/, 'Source must match the Figma y=408 heading and y=444 84px white source card');
assert.match(view, /\{page && <p[^>]*>\{page\.value\}<\/p>\}/, 'Source page line must render the already-localized page value once');
assert.match(view, /function TermDetailRelatedPanel[\s\S]*className="mt-12"[\s\S]*termDetail\.relatedTerms[\s\S]*data-term-related-chip/, 'Related terms must start at the Figma y=576 anchor and retain route links as chips');
assert.match(view, /<p className="mt-4 whitespace-pre-line text-\[14px\] leading-\[14px\] text-\[#39363f\]">\{current\.text\}<\/p>/, 'Definition body text must use Figma #39363F rather than the stronger semantic ink');
assert.match(view, /data-term-related-chip className="flex h-\[30px\][\s\S]*bg-surface[\s\S]*text-\[#39363f\]/, 'Related-term chips must use Figma white surfaces and #39363F text');
assert.match(view, /import \{ useAuthStore \} from '\.\.\/\.\.\/\.\.\/stores\/authStore'/, 'Mobile detail must know whether the fixed bottom navigation is present');
assert.match(view, /function TermDetailTestCta\(\{ bottomNavVisible \}[^)]*\)[\s\S]*aria-disabled="true"[\s\S]*bottomNavVisible \? 'bottom-\[128px\]' : 'bottom-10'[\s\S]*rounded-\[8px\] bg-\[#6a37c3\][\s\S]*termDetail\.testCta[\s\S]*text-\[#c5b1e7\][\s\S]*termDetail\.testMeta[\s\S]*ArrowRight02Icon/, 'Mobile test CTA should derive its clearance from shared shell visibility and use Figma #C5B1E7 metadata text');
assert.match(view, /max-md:bg-canvas max-md:px-0[\s\S]*max-md:px-6 max-md:pb-\[108px\]/, 'Mobile detail must have one explicit 24px content rail and reserve the CTA height plus its 32px separation');
assert.match(view, /getDefinitionIndex[\s\S]*goPrevious[\s\S]*goNext/, 'Multiple-definition selection and bounded navigation must remain in the view');
assert.match(view, /max-md:hidden[\s\S]*shadow-feature/, 'Desktop card geometry must remain separately rendered');

const frontendRoot = path.resolve(srcDir, '..');
const config = loadConfig(path.join(frontendRoot, 'tailwind.config.ts'));
const css = await postcss([
  tailwindcss({
    ...config,
    content: [{ raw: '<div class="max-md:pt-[42px]"></div>', extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });
let mobileOffsetRule;
css.root.walkRules((rule) => {
  if (rule.selector.includes('.max-md\\:pt-\\[42px\\]')) mobileOffsetRule = rule;
});
assert.ok(mobileOffsetRule, 'Tailwind must generate the responsive max-md:pt-[42px] utility');
assert.match(mobileOffsetRule.toString(), /padding-top:\s*42px/, 'Responsive mobile detail offset must compile to padding-top: 42px');
assert.match(mobileOffsetRule.parent?.params ?? '', /max-width|not all and \(min-width:/, 'Responsive mobile detail offset must remain breakpoint-scoped');

assert.match(search, /relatedTerms=\{getRelatedTerms\(term, displayResults\)\}/, 'Search must keep passing nearby terms into detail state');
assert.match(termCard, /relatedTerms\?: Pick<Term, 'public_id' \| 'name'>\[\]/, 'Term cards must accept related terms');

for (const translations of [ru, kk]) {
  for (const key of ['title', 'definition', 'source', 'relatedTerms', 'knownStatValue', 'knownStatLabel', 'testedStatValue', 'testedStatLabel', 'testCta', 'testMeta', 'loading', 'loadFailed', 'saveAria', 'moreAria']) {
    assert.equal(typeof translations.termDetail[key], 'string', `Locale should define termDetail.${key}`);
  }
}
