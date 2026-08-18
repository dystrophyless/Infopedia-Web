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
  /return null;/,
  'Authenticated desktop home should be intentionally empty',
);
assert.doesNotMatch(
  authenticated,
  /DesktopGuestLanding|DesktopGuestHero|DesktopGuestSections/,
  'Authenticated desktop home should not render the guest landing composition',
);
assert.match(
  sections,
  /<DesktopFeatureCards \/>[\s\S]*<DesktopSourceProof isAuthenticated=\{isAuthenticated\} \/>[\s\S]*<DesktopEntAnalysis isAuthenticated=\{isAuthenticated\} \/>/,
  'Desktop guest sections should follow the Figma feature, source, analysis order',
);

assert.match(hero, /min-h-\[656px\]/, 'Hero should preserve the 656px canvas below the 80px header');
assert.match(
  hero,
  /<div[^>]*data-desktop-content-rail[^>]*className="mx-auto flex w-full max-w-\[1152px\] flex-col items-center px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0"/,
  'Hero content should use the centered responsive desktop rail',
);
assert.doesNotMatch(hero, /px-\[160px\]/, 'Hero should not use the fixed 160px desktop gutter');
assert.match(hero, /text-\[72px\][\s\S]*leading-\[72px\]/, 'Hero should use the Figma 72px two-line display type');
assert.match(hero, /landing\.desktopEyebrow[\s\S]*landing\.desktopHeroLine1[\s\S]*landing\.desktopHeroLine2Accent/);
assert.match(hero, /landingCtaTarget\('\/search', isAuthenticated\)[\s\S]*href="#desktop-analysis"/);
assert.match(hero, /h-\[48px\][\s\S]*w-\[200px\][\s\S]*rounded-\[16px\]/);

assert.match(
  features,
  /data-desktop-content-rail[^>]*className="mx-auto w-full max-w-\[1152px\] px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0"/,
  'Feature rail should use the shared centered 1152px/24px canvas',
);
assert.doesNotMatch(features, /px-\[160px\]/, 'Feature section should not use the fixed 160px desktop gutter');
assert.doesNotMatch(features, /pl-\[clamp\(|pr-\[clamp\(|calc\(50vw|max-w-\[1560px\]/);
assert.match(features, /className="grid h-full w-full min-w-0 grid-cols-3 gap-\[32px\]"/);
assert.match(features, /h-\[493px\][\s\S]*min-w-0[\s\S]*flex-col/);
assert.doesNotMatch(features, /ref=\{featureRailRef\}|overflow-x-auto|overflow-y-hidden|w-max|snap-x|snap-mandatory|snap-start|scroll-smooth/);
assert.match(features, /rounded-\[16px\]/);
assert.match(features, /pb-\[64px\]/, 'The feature rail should leave the Figma 64px gap before the term heading');
assert.doesNotMatch(features, /landing\.desktopFeaturesPrevious|landing\.desktopFeaturesNext|aria-roledescription|role="region"|featureRailState|syncFeatureRailState|scrollBy|onScroll/);
assert.equal((features.match(/image: '/g) ?? []).length, 3, 'Desktop feature rail should render exactly three feature objects');
assert.doesNotMatch(features, /ArrowLeft01Icon|ArrowRight01Icon|mobile-feature-semantic\.png/);
assert.doesNotMatch(landing, /ArrowLeft01Icon|ArrowRight01Icon/);

assert.match(sourceProof, /data-desktop-content-rail[^>]*className="mx-auto w-full max-w-\[1152px\] px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0"/);
assert.doesNotMatch(sourceProof, /px-\[160px\]/);
assert.match(sourceProof, /grid-cols-\[minmax\(0,720px\)_minmax\(0,400px\)\]/);
const sourceProofCardClass = sourceProof.match(/data-source-proof-card\s+className="([^"]+)"/)?.[1] ?? '';
assert.match(sourceProofCardClass, /\bw-full\b/);
assert.doesNotMatch(sourceProofCardClass, /min-\[1440px\]:w-\[1120px\]|min-\[1440px\]:-ml-2/, 'Source proof card must not compensate for an incorrectly sized root rail');
assert.doesNotMatch(
  sourceProof,
  /min-h-\[264px\]/,
  'Desktop source-proof panels must remain content-driven without restoring the legacy 264px minimum height',
);
assert.match(sourceProof, /data-source-proof-card/);
assert.match(sourceProof, /data-source-proof-left/);
assert.match(sourceProof, /data-source-proof-right/);
assert.match(sourceProof, /<TermCardCarousel variant="guestLanding" \/>/);
assert.match(sourceProof, /landingCtaTarget\('\/search', isAuthenticated\)/);
assert.match(sourceProof, /pb-\[88px\]/, 'The term rail should leave the Figma 88px gap before analysis');

assert.match(analyze, /data-analysis-stage[\s\S]*xl:h-\[327px\]/, 'Analysis stage should preserve the 2117-to-2444 Figma composition');
assert.match(analyze, /data-desktop-content-rail[^>]*className="mx-auto w-full max-w-\[1152px\] px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0"/);
assert.doesNotMatch(analyze, /px-\[160px\]/);
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
