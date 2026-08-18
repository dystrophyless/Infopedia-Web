import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const featureCarouselSource = readFileSync(
  path.resolve(pagesDir, '../components/MobileFeatureCarousel.tsx'),
  'utf8',
);
const termCarouselSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/FeaturedTermCard.tsx'),
  'utf8',
);

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) return '';
  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return endIndex === -1 ? source.slice(startIndex) : source.slice(startIndex, endIndex);
}

const desktopGuestSource = sourceBetween(landingSource, 'function DesktopGuestLanding', 'function MobileHome');
const mobileGuestHeroSource = sourceBetween(
  landingSource,
  'function MobileConversionHeroHome',
  'function MobileFigmaGuestSections',
);
const mobileGuestSectionsSource = sourceBetween(
  landingSource,
  'function MobileFigmaGuestSections',
  'function MobileSourceProof',
);
const mobileSourceProofSource = sourceBetween(
  landingSource,
  'function MobileSourceProof',
  'function MobileToolsFeature',
);
const mobileToolsFeatureSource = sourceBetween(
  landingSource,
  'function MobileToolsFeature',
  'function MobileHeroLanguageToggle',
);
const mobileLanguageToggleSource = sourceBetween(
  landingSource,
  'function MobileHeroLanguageToggle',
  '',
);
const guestLandingPaletteSource = [
  desktopGuestSource,
  mobileGuestHeroSource,
  mobileGuestSectionsSource,
  mobileSourceProofSource,
  mobileToolsFeatureSource,
  mobileLanguageToggleSource,
].join('\n');

assert.match(
  guestLandingPaletteSource,
  /bg-\[#efebf6\]/,
  'Guest landing should keep the refreshed lavender page background from Figma',
);

assert.match(
  guestLandingPaletteSource,
  /text-\[#161519\]/,
  'Guest landing primary text should use Figma #161519',
);

assert.match(
  guestLandingPaletteSource,
  /bg-\[#6a37c3\]/,
  'Guest landing primary CTAs should use Figma #6a37c3',
);

assert.match(
  guestLandingPaletteSource,
  /bg-\[#fbfbfb\][\s\S]*text-\[#524d5b\]/,
  'Guest landing secondary CTA should use the Figma off-white surface and dark muted label',
);

assert.match(
  guestLandingPaletteSource,
  /bg-\[#44237d\]/,
  'Guest mobile login button should keep the darker Figma login color',
);

assert.match(
  guestLandingPaletteSource,
  /text-\[#8c8698\]/,
  'Guest mobile language toggle should use the Figma muted header color',
);

assert.doesNotMatch(
  guestLandingPaletteSource,
  /bg-accent|text-accent|border-accent|text-\[rgba\(30,30,30,0\.5\)\]|text-\[rgba\(68,35,125,0\.5\)\]|bg-\[rgba\(30,30,30,0\.5\)\]/,
  'Guest landing should not use the old token accent or old rgba muted colors',
);

assert.match(
  termCarouselSource,
  /variant === 'guest'[\s\S]*bg-surface-subtle/,
  'Guest term examples should use Figma #fbfbfb cards',
);

assert.match(
  termCarouselSource,
  /text-action-selected[\s\S]*text-text-body/,
  'Guest term examples should use semantic title and body colors',
);

assert.match(
  featureCarouselSource,
  /bg-\[#6a37c3\][\s\S]*text-\[#6a37c3\]/,
  'Feature carousel should use the refreshed Figma accent colors',
);

assert.doesNotMatch(
  featureCarouselSource,
  /bg-accent|text-accent/,
  'Feature carousel should not depend on the old app accent token for guest hero colors',
);
