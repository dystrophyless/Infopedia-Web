import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');
const publicDir = path.resolve(srcDir, '../public');

const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const carouselPath = path.resolve(componentsDir, 'MobileFeatureCarousel.tsx');

assert.ok(existsSync(carouselPath), 'Mobile feature carousel component should exist');

const carouselSource = readFileSync(carouselPath, 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

const mobileToolsFeatureSource =
  landingSource.match(/function MobileToolsFeature[\s\S]*?\n\}\n\nfunction MobileHeroLanguageToggle/)?.[0] ?? '';

assert.match(
  landingSource,
  /import \{ MobileFeatureCarousel \} from '\.\.\/components\/MobileFeatureCarousel';/,
  'Landing should import the mobile feature carousel component',
);

assert.match(
  mobileToolsFeatureSource,
  /<MobileFeatureCarousel isAuthenticated=\{isAuthenticated\} \/>/,
  'Mobile tools section should render the feature carousel with auth-aware routes',
);

assert.doesNotMatch(
  mobileToolsFeatureSource,
  /mobile-weak-topics-illustration\.png|mobileToolWeakTopicsTitle[\s\S]*mobileToolWeakTopicsDesc[\s\S]*mobileToolWeakTopicsCta/,
  'Mobile tools section should not keep the old single static weak-topics card',
);

assert.match(
  carouselSource,
  /const AUTO_ADVANCE_MS = 2000;/,
  'Feature carousel should auto-advance every 2 seconds',
);

assert.match(
  carouselSource,
  /const DRAG_THRESHOLD_PX = 48;/,
  'Feature carousel should have a deliberate drag threshold',
);

assert.match(
  carouselSource,
  /const loopSlides = useMemo\(\(\) => \[featureCards\[featureCards\.length - 1\], \.\.\.featureCards, featureCards\[0\]\]/,
  'Feature carousel should render duplicate end-caps for an infinite loop',
);

assert.match(
  carouselSource,
  /setTrackIndex\(1\);[\s\S]*setActiveIndex\(0\);/,
  'Feature carousel should jump from the trailing clone back to the first real card',
);

assert.match(
  carouselSource,
  /setTrackIndex\(featureCards\.length\);[\s\S]*setActiveIndex\(featureCards\.length - 1\);/,
  'Feature carousel should jump from the leading clone back to the last real card',
);

for (const handler of [
  'onPointerDown={handlePointerDown}',
  'onPointerMove={handlePointerMove}',
  'onPointerUp={handlePointerUp}',
  'onPointerCancel={handlePointerCancel}',
]) {
  assert.match(carouselSource, new RegExp(handler.replace(/[{}]/g, '\\$&')), `Feature carousel should wire ${handler}`);
}

assert.match(
  carouselSource,
  /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/,
  'Feature carousel should honor reduced motion preferences',
);

assert.match(
  carouselSource,
  /transitionDuration: activeProgressIndex === index \? `\$\{AUTO_ADVANCE_MS\}ms` : '0ms'/,
  'Only the active indicator fill should animate; inactive indicators should reset instantly to empty',
);

assert.doesNotMatch(
  carouselSource,
  /transitionDuration: `\$\{AUTO_ADVANCE_MS\}ms`/,
  'Inactive indicator fills should not inherit the 2s duration and visually drain backward',
);

assert.match(
  carouselSource,
  /transform: `scaleX\(\$\{activeProgressIndex === index \? 1 : 0\}\)`/,
  'Active indicator fill should animate linearly from empty to full',
);

assert.match(
  carouselSource,
  /function scheduleTransitionRestore[\s\S]*window\.requestAnimationFrame\(\(\) => \{[\s\S]*window\.requestAnimationFrame\(\(\) => \{[\s\S]*setIsTransitioning\(true\);/,
  'Loop reset should keep transitions disabled for two animation frames before re-enabling them',
);

assert.match(
  carouselSource,
  /handleTrackTransitionEnd = useCallback\(\(event: TransitionEvent<HTMLUListElement>\)/,
  'Track transition end handler should receive the real transition event',
);

assert.match(
  carouselSource,
  /if \(event\.target !== event\.currentTarget\) return;/,
  'Track transition end handler should ignore bubbled child transitions',
);

const featureKeyGroups = [
  ['mobileToolWeakTopicsTitle', 'mobileToolWeakTopicsDesc', 'mobileToolWeakTopicsCta'],
  ['mobileToolTestsTitle', 'mobileToolTestsDesc', 'mobileToolTestsCta'],
  ['mobileToolTermTitle', 'mobileToolTermDesc', 'mobileToolTermCta'],
  ['mobileToolSemanticTitle', 'mobileToolSemanticDesc', 'mobileToolSemanticCta'],
];

for (const keyGroup of featureKeyGroups) {
  for (const key of keyGroup) {
    assert.match(carouselSource, new RegExp(`landing\\.${key}`), `Carousel should render landing.${key}`);
    assert.ok(ruLocale.landing[key], `RU locale should define landing.${key}`);
    assert.ok(kkLocale.landing[key], `KK locale should define landing.${key}`);
  }
}

for (const asset of [
  'mobile-feature-weak-topics.png',
  'mobile-feature-tests.png',
  'mobile-feature-term.png',
  'mobile-feature-semantic.png',
]) {
  assert.match(carouselSource, new RegExp(`/${asset}`), `Carousel should reference ${asset}`);
  assert.ok(existsSync(path.resolve(publicDir, asset)), `${asset} should be stored in public assets`);
}
