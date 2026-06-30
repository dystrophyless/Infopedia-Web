import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const componentsDir = path.resolve(pagesDir, '../components');
const srcDir = path.resolve(pagesDir, '..');

const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const termSearchSource = readFileSync(path.resolve(pagesDir, 'TermSearch.tsx'), 'utf8');
const semanticSearchSource = readFileSync(path.resolve(pagesDir, 'SemanticSearch.tsx'), 'utf8');
const analyzeSource = readFileSync(path.resolve(pagesDir, 'Analyze.tsx'), 'utf8');
const profileSource = readFileSync(path.resolve(pagesDir, 'Profile.tsx'), 'utf8');
const termDetailSource = readFileSync(path.resolve(pagesDir, 'TermDetail.tsx'), 'utf8');
const authShellSource = readFileSync(path.resolve(componentsDir, 'AuthShell.tsx'), 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

const mobileHeroLocaleKeys = [
  'mobileHeroScoreValue',
  'mobileHeroScoreLabel',
  'mobileHeroTitle',
  'mobileHeroSubtitle',
  'mobileHeroPrimaryCta',
  'mobileHeroSecondaryCta',
];

const mobileGuestHeroSource =
  landingSource.match(/function MobileConversionHeroHome\(\) \{([\s\S]*?)\n\}\n\nfunction MobileAppHome/)?.[1] ?? '';

assert.match(
  landingSource,
  /md:hidden[\s\S]*<MobileHome/,
  'Landing should render a dedicated mobile home branch instead of shrinking desktop sections',
);

assert.match(
  landingSource,
  /hidden md:block[\s\S]*isAuthenticated \? <DesktopAuthenticatedLanding \/> : <DesktopGuestLanding \/>/,
  'Landing should split desktop authenticated users from the guest conversion landing',
);

assert.match(
  landingSource,
  /function DesktopAuthenticatedLanding\(\)[\s\S]*<Hero \/>/,
  'Landing should keep the current desktop landing branch for authenticated md and wider users',
);

assert.match(
  landingSource,
  /function DesktopGuestLanding\(\)[\s\S]*<DesktopGuestHero \/>/,
  'Landing should render the Figma-inspired guest conversion landing for desktop guests',
);

assert.match(
  landingSource,
  /isAuthenticated \? <MobileAppHome \/> : <MobileConversionHeroHome \/>/,
  'Mobile landing should split authenticated app home from the guest conversion hero',
);

assert.ok(
  mobileGuestHeroSource,
  'Landing should define a dedicated guest-only mobile conversion hero branch',
);

assert.match(
  mobileGuestHeroSource,
  /to="\/register"/,
  'Guest mobile hero primary CTA should send visitors to registration',
);

assert.match(
  mobileGuestHeroSource,
  /href="#mobile-tools"/,
  'Guest mobile hero secondary CTA should scroll to the visible Figma tools section',
);

assert.match(
  landingSource,
  /id="mobile-proof"/,
  'Guest mobile proof sections should expose an anchor for the secondary CTA',
);

assert.doesNotMatch(
  mobileGuestHeroSource,
  /\b(?:shadow(?:-|\\\[)|border(?:-|\\\[))/,
  'Guest mobile hero should stay flat with no decorative shadow or border classes',
);

for (const key of mobileHeroLocaleKeys) {
  assert.match(
    mobileGuestHeroSource,
    new RegExp(`landing\\.${key}`),
    `Guest mobile hero should render landing.${key}`,
  );
  assert.ok(ruLocale.landing[key], `RU locale should define landing.${key}`);
  assert.ok(kkLocale.landing[key], `KK locale should define landing.${key}`);
}

assert.match(
  landingSource,
  /function MobileAppHome\(\)[\s\S]*setSearchModalOpen\(true\)/,
  'Authenticated mobile home should keep the app-style search CTA and bottom-sheet trigger',
);

assert.match(
  landingSource,
  /landing\.termExamples[\s\S]*<TermCardCarousel variant="guest"/,
  'Guest mobile home should place the Figma-sized terms carousel immediately after the hero',
);

assert.match(
  landingSource,
  /id="mobile-proof"[\s\S]*flex flex-col gap-7[\s\S]*className="w-full overflow-hidden"[\s\S]*<TermCardCarousel variant="guest"/,
  'Guest mobile terms carousel should clip the animated track inside a full-width gap-based proof strip',
);

assert.doesNotMatch(
  landingSource,
  /(?:translate-x-\[-53px\]|max-w-\[430px\] overflow-hidden pl-8)[\s\S]*<TermCardCarousel variant="guest"/,
  'Guest mobile terms carousel wrapper should not create a left-clipped partial card',
);

assert.doesNotMatch(
  landingSource,
  /className="-mx-4 mt-3"[\s\S]*<TermCardCarousel variant="mobile"/,
  'Mobile terms carousel should not bleed left past the shared page gutter',
);

for (const [name, source] of [
  ['TermSearch', termSearchSource],
  ['SemanticSearch', semanticSearchSource],
  ['Analyze', analyzeSource],
  ['Profile', profileSource],
  ['TermDetail', termDetailSource],
]) {
  assert.doesNotMatch(
    source,
    /max-md:pb-\[calc\(theme\(spacing\.24\)\+env\(safe-area-inset-bottom\)\)\]/,
    `${name} should rely on Layout for fixed bottom-nav scroll space instead of stacking page-level bottom padding`,
  );
}

for (const [name, source] of [
  ['TermSearch', termSearchSource],
  ['SemanticSearch', semanticSearchSource],
  ['Analyze', analyzeSource],
  ['Profile', profileSource],
  ['TermDetail', termDetailSource],
  ['AuthShell', authShellSource],
]) {
  assert.match(
    source,
    /max-md:px-4/,
    `${name} should keep a consistent mobile horizontal page gutter`,
  );
}

assert.match(
  analyzeSource,
  /MobileBookCoverageList/,
  'Analyze mobile results should replace the wide book table with a card/list representation',
);

assert.match(
  analyzeSource,
  /max-md:hidden[\s\S]*<table/,
  'Analyze desktop book table should be hidden on mobile',
);

assert.match(
  profileSource,
  /MobileProfileDashboard/,
  'Profile should provide a mobile settings/dashboard structure instead of desktop tabs',
);

assert.match(
  profileSource,
  /LanguageSettingsPanel/,
  'Profile settings should own mobile language switching',
);

assert.doesNotMatch(
  authShellSource,
  /<LanguageSwitcher \/>/,
  'Auth shell should not expose language switching before login on mobile-only language policy',
);

assert.match(
  authShellSource,
  /max-md:border-0/,
  'Auth shell should flatten the mobile auth card instead of showing desktop framing',
);

assert.match(
  termDetailSource,
  /max-md:rounded-\[12px\]/,
  'Term detail should use a mobile-specific flat article shape',
);
