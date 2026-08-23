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
assert.match(
  analyze,
  /<div data-analysis-stage className="grid gap-6 md:grid-cols-2 xl:relative xl:block xl:h-\[327px\]">/,
  'Analyze should retain the original positioned 1120x327 stage',
);
assert.match(
  analyze,
  /<h2[^>]*className="[^"]*md:col-span-2[^"]*xl:absolute xl:left-0 xl:top-0"/,
  'Analyze title should remain the first positioned stage sibling',
);
assert.match(
  analyze,
  /<div data-analysis-snippet="result" className="rounded-\[8px\] bg-white p-6 md:col-start-2 md:row-start-2 md:w-\[292px\] md:justify-self-end xl:absolute xl:left-\[803px\] xl:top-0 xl:w-\[292px\][^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100"/,
  'Analyze result shell should keep the oracle offset and whole-shell hover treatment',
);
assert.match(
  analyze,
  /<div data-analysis-snippet="registration" className="grid w-full max-w-\[284px\] gap-2 md:col-start-1 md:row-start-2 md:self-end xl:absolute xl:left-\[29px\] xl:top-\[223px\] xl:h-\[88px\] xl:w-\[284px\] xl:max-w-none[^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100"/,
  'Analyze registration shell should keep the oracle offset and whole-shell hover treatment',
);
assert.match(
  analyze,
  /<div data-analysis-snippet="upload" className="flex h-44 w-full max-w-\[300px\][^"]*md:col-span-2 md:mx-auto xl:absolute xl:left-\[410px\] xl:top-\[135px\] xl:m-0 xl:h-\[176px\] xl:w-\[300px\] xl:max-w-none[^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100"/,
  'Analyze upload shell should keep the oracle offset and whole-shell hover treatment',
);
assert.match(analyze, /data-analysis-snippet="result"[\s\S]*data-analysis-snippet="registration"[\s\S]*data-analysis-snippet="upload"/);
assert.match(
  analyze,
  /<ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 xl:mt-0 xl:gap-12">[\s\S]*<li key=\{step\.number\} className="flex flex-col items-center gap-4 px-6 py-8 text-center">/,
  'Analyze step copy should remain in a separate oracle ol below the visual stage',
);
assert.doesNotMatch(analyze, /data-analysis-steps|data-analysis-step=|data-analysis-visual|lg:grid-cols-3|lg:items-end|lg:gap-\[clamp/);

console.log('Landing desktop feature container contract passed');
