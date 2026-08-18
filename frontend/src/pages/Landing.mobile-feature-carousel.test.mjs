import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');
const publicDir = path.resolve(srcDir, '../public');

const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const carouselPath = path.resolve(componentsDir, 'MobileFeatureCarousel.tsx');

assert.ok(existsSync(carouselPath), 'Mobile feature carousel component should exist');

const carouselSource = readFileSync(carouselPath, 'utf8');
const desktopFeatureCardSource =
  carouselSource.match(/if \(isDesktop\) \{[\s\S]*?\n  \}\n\n  return \(/)?.[0] ?? '';
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

const mobileToolsFeatureSource =
  landingSource.match(/function MobileToolsFeature[\s\S]*?\r?\n\}\r?\n\r?\nfunction MobileHeroLanguageToggle/)?.[0] ?? '';
const desktopToolsFeatureSource =
  landingSource.match(/function DesktopFeatureCards[\s\S]*?\r?\n\}\r?\n\r?\nfunction DesktopSourceProof/)?.[0] ?? '';

function decodePngRgba(filePath) {
  const png = readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    offset += 4;
    const type = png.toString('ascii', offset, offset + 4);
    offset += 4;
    const data = png.subarray(offset, offset + length);
    offset += length + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  assert.equal(bitDepth, 8, `${path.basename(filePath)} should use 8-bit PNG color`);
  assert.equal(colorType, 6, `${path.basename(filePath)} should be an RGBA PNG`);

  const raw = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const rgba = Buffer.alloc(width * height * bytesPerPixel);
  let readOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[readOffset];
    readOffset += 1;
    const row = Buffer.from(raw.subarray(readOffset, readOffset + stride));
    readOffset += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previousRow[x];
      const upLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] : 0;
      let value = row[x];

      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const leftDistance = Math.abs(up - upLeft);
        const upDistance = Math.abs(left - upLeft);
        const diagonalDistance = Math.abs(left + up - 2 * upLeft);
        const predictor =
          leftDistance <= upDistance && leftDistance <= diagonalDistance
            ? left
            : upDistance <= diagonalDistance
              ? up
              : upLeft;
        value = (value + predictor) & 255;
      }

      row[x] = value;
    }

    row.copy(rgba, y * stride);
    previousRow = row;
  }

  return { width, height, rgba };
}

function countRedMarkerPixels(filePath) {
  const { width, height, rgba } = decodePngRgba(filePath);
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = rgba[index];
      const green = rgba[index + 1];
      const blue = rgba[index + 2];
      const alpha = rgba[index + 3];

      if (alpha > 8 && red > 200 && green < 80 && blue < 80) count += 1;
    }
  }

  return count;
}

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

assert.match(
  desktopToolsFeatureSource,
  /mobile-feature-weak-topics\.png[\s\S]*mobile-feature-tests\.png[\s\S]*mobile-feature-term\.png/,
  'Desktop tools section should render exactly the three approved feature assets',
);

assert.doesNotMatch(
  desktopToolsFeatureSource,
  /mobile-feature-semantic\.png|ArrowLeft01Icon|ArrowRight01Icon|overflow-x-auto|w-max|snap-x|snap-mandatory|aria-roledescription/,
  'Desktop tools section should not include the removed fourth card or carousel behavior',
);

assert.match(
  desktopToolsFeatureSource,
  /grid h-full w-full min-w-0 grid-cols-3 gap-\[32px\][\s\S]*h-\[493px\] min-w-0/,
  'Desktop tools section should render three equal-width cards in a fitting grid',
);

assert.doesNotMatch(
  desktopToolsFeatureSource,
  /desktop-landing\/feature-|<MobileFeatureCarousel[^>]*variant="desktop"/,
  'Desktop tools should not use the invalid exports or superseded single-card carousel',
);

assert.match(
  carouselSource,
  /variant\?: 'mobile' \| 'desktop'/,
  'Feature carousel should expose a desktop variant while preserving mobile as the default',
);

assert.match(
  carouselSource,
  /variant = 'mobile'/,
  'Feature carousel should default to the mobile layout',
);

assert.match(
  carouselSource,
  /const isDesktop = variant === 'desktop';/,
  'Feature carousel should branch sizing from a desktop variant flag',
);

assert.match(
  carouselSource,
  /isDesktop[\s\S]*\? 'relative w-\[min\(880px,calc\(100vw_-_96px\)\)\] self-center overflow-hidden'/,
  'Desktop feature carousel viewport should match the wide centered reference card',
);

assert.doesNotMatch(
  carouselSource,
  /max-w-\[540px\]|self-start|w-\[min\((720|780|920|1100)px,calc\(100vw_-_96px\)\)\]/,
  'Desktop feature carousel should not keep a previous wrong-width or left-aligned viewport',
);

assert.match(
  carouselSource,
  /transitionDuration: `\$\{!isDesktop && isTransitioning && !isDragging \? TRACK_TRANSITION_MS : 0\}ms`/,
  'Desktop feature carousel should switch without sliding neighboring cards through the viewport',
);

assert.doesNotMatch(
  mobileToolsFeatureSource,
  /mobile-weak-topics-illustration\.png|mobileToolWeakTopicsTitle[\s\S]*mobileToolWeakTopicsDesc[\s\S]*mobileToolWeakTopicsCta/,
  'Mobile tools section should not keep the old single static weak-topics card',
);

assert.match(
  carouselSource,
  /const AUTO_ADVANCE_MS = 5000;/,
  'Feature carousel should auto-advance every 5 seconds on desktop and mobile',
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
  /const handleCtaPointerDown = useCallback\(\(event: PointerEvent<HTMLAnchorElement>\) => \{[\s\S]*event\.stopPropagation\(\);[\s\S]*wasDraggedRef\.current = false;/,
  'Feature carousel CTA should not start carousel dragging and should clear stale drag state before click',
);

assert.match(
  carouselSource,
  /<FeatureSlideCard[\s\S]*onPointerDown=\{handleCtaPointerDown\}/,
  'Feature carousel should pass the CTA pointer guard into slide cards',
);

assert.match(
  carouselSource,
  /<Link[\s\S]*to=\{card\.href\}[\s\S]*onPointerDown=\{onPointerDown\}[\s\S]*onClick=\{onClick\}/,
  'Feature carousel CTA links should stop pointerdown before the carousel captures the pointer',
);

assert.match(
  carouselSource,
  /const isAriaHidden = isClone \|\| realIndex !== activeIndex;[\s\S]*aria-hidden=\{isAriaHidden\}[\s\S]*ctaInteractive=\{!isAriaHidden\}/,
  'Every aria-hidden slide should pass a noninteractive CTA state to its card',
);

assert.match(
  carouselSource,
  /ctaInteractive \? \([\s\S]*?<Link[\s\S]*?to=\{card\.href\}[\s\S]*?\) : \([\s\S]*?<span[\s\S]*?\{card\.cta\}/,
  'Only the active visible slide CTA should be a route link; hidden clones and inactive slides should use styled spans',
);

assert.doesNotMatch(
  carouselSource,
  /tabIndex=\{clone \? -1 : undefined\}/,
  'Loop-clone CTAs should not rely on tabIndex alone to become noninteractive',
);

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
  'Inactive indicator fills should not inherit the 5s duration and visually drain backward',
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

assert.match(
  carouselSource,
  /if \(isDesktop\) \{[\s\S]*relative (?:block )?h-\[372px\][\s\S]*absolute inset-x-0 bottom-0 h-\[280px\][\s\S]*bg-\[#f8f5fc\]/,
  'Desktop feature card should use a taller stage with the white panel anchored to the bottom',
);

assert.match(
  desktopFeatureCardSource,
  /<div[\s\S]*className="relative h-\[372px\][\s\S]*<Link[\s\S]*to=\{card\.href\}[\s\S]*h-\[48px\][\s\S]*card\.cta/,
  'Desktop feature card should keep only the CTA button as the link target',
);

assert.doesNotMatch(
  desktopFeatureCardSource,
  /<Link[\s\S]*className="relative block h-\[372px\]/,
  'Desktop feature card should not make the whole card a link',
);

assert.match(
  carouselSource,
  /return \(\s*<div[\s\S]*className="relative h-\[493px\][\s\S]*<Link[\s\S]*to=\{card\.href\}[\s\S]*bottom-8 left-8 right-8[\s\S]*card\.cta/,
  'Mobile feature card should keep only the CTA button as the link target',
);

assert.doesNotMatch(
  carouselSource,
  /return \(\s*<Link[\s\S]*className="relative block h-\[493px\]/,
  'Mobile feature card should not make the whole card a link',
);

assert.match(
  carouselSource,
  /absolute left-0 top-\[92px\][\s\S]*h-\[280px\][\s\S]*w-\[480px\][\s\S]*p-\[48px\][\s\S]*card\.title[\s\S]*card\.description[\s\S]*h-\[48px\][\s\S]*card\.cta/,
  'Desktop feature card should keep the copy and CTA on the left side of the panel',
);

assert.match(
  carouselSource,
  /right-0 top-0[\s\S]*h-\[324px\] w-\[448px\][\s\S]*card\.imageSrc[\s\S]*h-full w-full object-contain[\s\S]*card\.desktopImageClassName/,
  'Desktop feature card should contain the now-tight illustration assets in the right-side art window',
);

assert.match(
  carouselSource,
  /desktopImageClassName: 'object-center'/,
  'Desktop feature images should be centered without per-asset crop compensation',
);

assert.doesNotMatch(
  carouselSource,
  /desktopImageClassName: 'h-\[\d+px\]|desktopImageClassName: '[^']*(left-|top-\[)/,
  'Desktop feature images should not keep old crop offsets after the PNGs were trimmed',
);

assert.match(
  carouselSource,
  /imageFrameClassName: 'h-\[292px\] left-6 right-6 top-\[24px\]'[\s\S]*imageClassName: 'object-center'/,
  'Mobile feature images should use a consistent centered frame for tight PNG assets',
);

assert.match(
  carouselSource,
  /h-full w-full object-contain[\s\S]*card\.imageClassName/,
  'Mobile feature images should fit inside their frame without manual percentage cropping',
);

assert.doesNotMatch(
  carouselSource,
  /imageClassName: 'h-\[\d+(\.\d+)?%\]|imageClassName: '[^']*(left-|top-\[|w-\[\d+)/,
  'Mobile feature images should not keep old percentage crop classes after the PNGs were trimmed',
);

assert.doesNotMatch(
  desktopFeatureCardSource,
  /absolute max-w-none|card\.imageClassName/,
  'Desktop feature card should not use absolute oversized images or mobile image crop classes',
);

assert.match(
  carouselSource,
  /pointer-events-none absolute right-0 top-0[\s\S]*<img[\s\S]*desktopImageClassName/,
  'Desktop feature card should place the illustration on the right side',
);

assert.match(
  carouselSource,
  /absolute left-0 top-\[92px\][\s\S]*card\.title[\s\S]*card\.description[\s\S]*card\.cta/,
  'Desktop feature card should keep title, description, and CTA on the left',
);

assert.match(
  desktopFeatureCardSource,
  /<h3 className="w-full \[text-wrap:balance\] text-\[32px\]/,
  'Desktop feature card titles should use the full text column and balance line breaks',
);

assert.doesNotMatch(
  desktopFeatureCardSource,
  /w-\[344px\]|card\.imageClassName/,
  'Desktop feature card should not use the narrow Figma-only title width or mobile image crop classes',
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

assert.equal(
  countRedMarkerPixels(path.resolve(publicDir, 'mobile-feature-semantic.png')),
  0,
  'Semantic feature illustration should not include the accidental red marker pixel',
);
