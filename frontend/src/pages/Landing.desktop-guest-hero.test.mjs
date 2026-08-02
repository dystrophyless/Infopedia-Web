import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landing = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');

function sourceBetween(start, end) {
  const startIndex = landing.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} should be defined`);
  const endIndex = landing.indexOf(end, startIndex + start.length);
  return endIndex === -1 ? landing.slice(startIndex) : landing.slice(startIndex, endIndex);
}

const authenticated = sourceBetween('function DesktopAuthenticatedLanding', 'function DesktopGuestLanding');
const guest = sourceBetween('function DesktopGuestLanding', 'function MobileHome');
const hero = sourceBetween('function DesktopGuestHero', 'function DesktopGuestSections');
const sections = sourceBetween('function DesktopGuestSections', 'function DesktopFeatureCards');
const features = sourceBetween('function DesktopFeatureCards', 'function DesktopSourceProof');
const sourceProof = sourceBetween('function DesktopSourceProof', 'function DesktopEntAnalysis');
const analyze = sourceBetween('function DesktopEntAnalysis', 'function MobileHome');

assert.match(
  landing,
  /md:hidden[\s\S]*hidden md:block[\s\S]*isAuthenticated \? <DesktopAuthenticatedLanding \/> : <DesktopGuestLanding \/>/,
  'Landing should preserve separate mobile and desktop route branches',
);
assert.match(
  authenticated,
  /<DesktopGuestLanding isAuthenticated=\{isAuthenticated\} \/>/,
  'Authenticated desktop CTA routing should remain auth-aware',
);
assert.match(
  sections,
  /<DesktopFeatureCards \/>[\s\S]*<DesktopSourceProof isAuthenticated=\{isAuthenticated\} \/>[\s\S]*<DesktopEntAnalysis isAuthenticated=\{isAuthenticated\} \/>/,
  'Desktop guest sections should follow the Figma feature, source, analysis order',
);

assert.match(hero, /min-h-\[656px\]/, 'Hero should preserve the 656px canvas below the 80px header');
assert.match(hero, /text-\[72px\][\s\S]*leading-\[72px\]/, 'Hero should use the Figma 72px two-line display type');
assert.match(hero, /landing\.desktopEyebrow[\s\S]*landing\.desktopHeroLine1[\s\S]*landing\.desktopHeroLine2Accent/);
assert.match(hero, /landingCtaTarget\('\/search', isAuthenticated\)[\s\S]*href="#desktop-analysis"/);
assert.match(hero, /h-\[48px\][\s\S]*w-\[200px\][\s\S]*rounded-\[16px\]/);

assert.match(
  features,
  /mx-auto w-full max-w-\[1120px\]/,
  'Feature rail should use the shared centered 1120px canvas',
);
assert.doesNotMatch(features, /pl-\[clamp\(|pr-\[clamp\(|calc\(50vw|max-w-\[1560px\]/);
assert.match(features, /gap-\[32px\]/);
assert.match(features, /h-\[493px\][\s\S]*w-\[366px\]/);
assert.match(features, /pb-\[64px\]/, 'The feature rail should leave the Figma 64px gap before the term heading');
assert.match(features, /scrollBy\(\{[\s\S]*behavior: prefersReducedMotion \? 'auto' : 'smooth'/, 'Feature controls should move the rail and honor reduced motion');
assert.match(features, /overflow-x-auto[\s\S]*motion-reduce:scroll-auto/, 'Feature rail should expose native scrolling and reduced-motion behavior');
assert.match(features, /snap-x[\s\S]*snap-mandatory/, 'Every clipped feature card should stay reachable through the snap rail');
assert.match(features, /landing\.desktopFeaturesPrevious[\s\S]*landing\.desktopFeaturesNext/, 'Feature rail should expose localized previous and next controls');
assert.match(features, /role="region"[\s\S]*aria-roledescription=\{t\('landing\.desktopFeaturesCarouselRole'\)\}/, 'Feature rail should expose region and carousel semantics');
assert.match(features, /disabled=\{featureRailState\.atStart\}[\s\S]*disabled=\{featureRailState\.atEnd\}/, 'Feature controls should expose endpoint state');
assert.match(features, /onScroll=\{syncFeatureRailState\}/, 'Native rail scrolling should keep endpoint state synchronized');
for (const asset of [
  'mobile-feature-weak-topics.png',
  'mobile-feature-tests.png',
  'mobile-feature-term.png',
  'mobile-feature-semantic.png',
]) {
  assert.match(features, new RegExp(`/${asset}`), `Desktop feature rail should use ${asset}`);
}

assert.match(sourceProof, /max-w-\[1120px\]/);
assert.match(sourceProof, /grid-cols-\[minmax\(0,720px\)_minmax\(0,400px\)\]/);
assert.match(sourceProof, /<TermCardCarousel variant="guestLanding" \/>/);
assert.match(sourceProof, /landingCtaTarget\('\/search', isAuthenticated\)/);
assert.match(sourceProof, /pb-\[88px\]/, 'The term rail should leave the Figma 88px gap before analysis');

assert.match(analyze, /data-analysis-stage[\s\S]*xl:h-\[327px\]/, 'Analysis stage should preserve the 2117-to-2444 Figma composition');
assert.match(analyze, /data-analysis-snippet="result"[\s\S]*xl:left-\[803px\][\s\S]*xl:top-0[\s\S]*xl:w-\[292px\]/, 'Result panel should land at x≈963 in the 1120px canvas');
assert.match(analyze, /data-analysis-snippet="registration"[\s\S]*xl:left-\[29px\][\s\S]*xl:top-\[223px\][\s\S]*xl:w-\[284px\]/, 'Registration snippet should preserve the lower-left Figma placement');
assert.match(analyze, /data-analysis-snippet="upload"[\s\S]*xl:left-\[410px\][\s\S]*xl:top-\[135px\][\s\S]*xl:w-\[300px\]/, 'Upload snippet should preserve the centered Figma placement');
assert.match(analyze, /desktopAnalyzeResultPrep[\s\S]*desktopAnalyzeResultGrade/);
assert.match(analyze, /desktopAnalyzeResultItem1[\s\S]*desktopAnalyzeResultItem2[\s\S]*desktopAnalyzeResultItem3[\s\S]*desktopAnalyzeResultItem4/);
assert.match(analyze, /landingCtaTarget\('\/practice-by-topic', isAuthenticated\)[\s\S]*desktopAnalyzeResultCta/, 'Result panel should expose the Figma practice action');
for (const snippet of ['registration', 'upload', 'result']) {
  assert.match(analyze, new RegExp(`data-analysis-snippet="${snippet}"`));
}
assert.match(analyze, /<ol[\s\S]*step\.number[\s\S]*step\.title[\s\S]*step\.description/);
assert.doesNotMatch(analyze, /<img|image [123]\.png/, 'ENT analysis should be native UI, not raster screenshots');

assert.doesNotMatch(
  guest,
  /desktop-landing\/feature-|https:\/\/www\.figma\.com\/api\/mcp\/asset|<MobileFeatureCarousel[^>]*variant="desktop"/,
  'Desktop guest runtime should not use invalid exports, expiring URLs, or the superseded one-card carousel',
);

console.log('Landing desktop guest Figma contract passed');
