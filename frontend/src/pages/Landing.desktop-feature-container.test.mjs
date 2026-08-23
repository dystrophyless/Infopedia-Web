import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landing = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const start = landing.indexOf('function DesktopFeatureCards');
const end = landing.indexOf('function DesktopSourceProof', start);
assert.notEqual(start, -1, 'DesktopFeatureCards should be defined');
const features = landing.slice(start, end === -1 ? landing.length : end);

const desktopSections = [
  ['DesktopGuestHero', landing.slice(landing.indexOf('function DesktopGuestHero'), landing.indexOf('function DesktopGuestSections'))],
  ['DesktopFeatureCards', features],
  ['DesktopSourceProof', landing.slice(landing.indexOf('function DesktopSourceProof'), landing.indexOf('function DesktopEntAnalysis'))],
  ['DesktopEntAnalysis', landing.slice(landing.indexOf('function DesktopEntAnalysis'), landing.indexOf('function MobileHome'))],
];

for (const [name, source] of desktopSections) {
  assert.match(
    source,
    /<div[^>]*data-desktop-content-rail[^>]*className="[^\"]*mx-auto[^\"]*max-w-\[1152px\][^\"]*px-\[24px\][^\"]*min-\[1440px\]:max-w-\[1120px\][^\"]*min-\[1440px\]:px-0/,
    `${name} must place desktop content inside the centered fallback rail with the 1440px 1120px override`,
  );
  assert.doesNotMatch(source, /px-\[160px\]/, `${name} must not retain the fixed 160px desktop gutter`);
}

assert.match(
  features,
  /<div[^>]*data-desktop-content-rail[^>]*className="mx-auto w-full max-w-\[1152px\] px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0"[\s\S]*<h2[\s\S]*Всё, что нужно для подготовки/,
  'Desktop feature heading and cards should share the centered responsive rail',
);
assert.doesNotMatch(features, /pl-\[clamp\(|pr-\[clamp\(|calc\(50vw|w-\[1560px\]|max-w-\[1560px\]/);
assert.match(features, /className="mt-10 w-full overflow-visible"/);
assert.doesNotMatch(features, /left-1\/2|w-\[min\(1184px,100vw\)\]|-translate-x-1\/2/, 'Feature cards must stay inside the centered page rail');
assert.match(
  features,
  /id="desktop-feature-rail"[\s\S]*className="h-\[517px\] w-full overflow-visible/,
  'Desktop feature rail must keep transformed hover cards visible beyond its layout box',
);
assert.doesNotMatch(
  features,
  /id="desktop-feature-rail"[\s\S]*className="h-\[517px\] w-full overflow-hidden/,
  'Desktop feature rail must not clip transformed hover cards',
);
assert.doesNotMatch(features, /id="desktop-feature-rail"[\s\S]*px-2/, 'Feature rail must start cards at its content edge');
assert.match(features, /className="grid h-full w-full min-w-0 grid-cols-3 gap-\[32px\]"/);
assert.doesNotMatch(features, /ref=\{featureRailRef\}|overflow-x-auto|overflow-y-hidden|w-max|snap-x|snap-mandatory|snap-start|scroll-smooth/);
assert.match(
  features,
  /<Link[\s\S]*to=\{ONBOARDING_TARGET\}[\s\S]*className="group relative flex h-\[493px\] min-w-0 flex-col/,
  'Desktop feature cards must fit equal fractional grid columns with the approved 493px height',
);
assert.match(
  features,
  /className="group relative flex h-\[493px\][^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100/,
  'Desktop feature hover must scale the whole interactive card with reduced-motion fallback',
);
assert.match(
  features,
  /pointer-events-none absolute inset-x-0 top-0 z-10 flex h-\[300px\] items-center justify-center overflow-hidden[\s\S]*<img[\s\S]*className="h-full w-full object-contain"/,
  'Desktop feature artwork should remain static while the whole card scales',
);
assert.doesNotMatch(features, /<img[\s\S]*transition-transform|group-hover:scale-\[1\.01\][\s\S]*<\/img>/);
assert.doesNotMatch(features, /<article/);
assert.equal((features.match(/image: '/g) ?? []).length, 3, 'Desktop feature rail should render exactly three feature objects');
assert.doesNotMatch(features, /mobile-feature-semantic\.png/);
assert.doesNotMatch(features, /ArrowLeft01Icon|ArrowRight01Icon|scrollBy|onScroll|aria-roledescription|role="region"|featureRailState|syncFeatureRailState/);
assert.doesNotMatch(landing, /ArrowLeft01Icon|ArrowRight01Icon/);

const analyze = desktopSections.find(([name]) => name === 'DesktopEntAnalysis')?.[1] ?? '';
assert.match(analyze, /<ol[^>]*data-analysis-steps[^>]*className="[^"]*grid-cols-1[^"]*lg:grid-cols-3[^"]*lg:items-end[^"]*lg:gap-\[clamp\(32px,4vw,64px\)\]/);
assert.match(analyze, /data-analysis-snippet="registration"[\s\S]*data-analysis-snippet="upload"[\s\S]*data-analysis-snippet="result"/);
assert.match(analyze, /<li key=\{step\.number\} data-analysis-step=\{step\.number\}[\s\S]*data-analysis-visual[\s\S]*\{step\.number\}/);
assert.match(
  analyze,
  /data-analysis-snippet="(?:registration|upload|result)"[^>]*className="[^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100/,
  'Analyze visual shells should share the whole-shell hover treatment',
);
assert.doesNotMatch(analyze, /xl:absolute|xl:left-\[|xl:top-\[/, 'Analyze columns must not rely on global fixed offsets');

console.log('Landing desktop feature container contract passed');
