import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const carouselSource = readFileSync(
  path.resolve(pagesDir, '../components/TermCardCarousel.tsx'),
  'utf8',
);
const mobileFeatureCarouselSource = readFileSync(
  path.resolve(pagesDir, '../components/MobileFeatureCarousel.tsx'),
  'utf8',
);
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

const mobileGuestHeroSource =
  landingSource.match(/function MobileConversionHeroHome\(\) \{([\s\S]*?)\n\}\n\nfunction MobileAppHome/)?.[1] ?? '';
const guestSectionsSource =
  landingSource.match(/function MobileFigmaGuestSections[\s\S]*?\n\}\n\nfunction MobileAppHome/)?.[0] ?? '';
const mobileSourceProofSource =
  landingSource.match(/function MobileSourceProof[\s\S]*?\n\}\n\nfunction MobileToolsFeature/)?.[0] ?? '';
const mobileToolsFeatureSource =
  landingSource.match(/function MobileToolsFeature[\s\S]*?\n\}\n\nfunction MobileHeroLanguageToggle/)?.[0] ?? '';
const carouselFunctionSource = carouselSource.slice(
  carouselSource.indexOf('export function TermCardCarousel('),
);

assert.ok(mobileGuestHeroSource, 'Landing should define a guest-only mobile hero');
assert.ok(guestSectionsSource, 'Landing should define guest mobile proof sections');
assert.ok(mobileSourceProofSource, 'Landing should define the source proof card');
assert.ok(mobileToolsFeatureSource, 'Landing should define the single visible mobile tools card');

assert.match(
  mobileGuestHeroSource,
  /bg-\[#efebf6\]/,
  'Guest mobile hero should use the lavender background',
);

assert.match(
  mobileGuestHeroSource,
  /px-6[\s\S]*flex w-full max-w-\[366px\] flex-col items-center gap-8 text-center/,
  'Guest mobile hero should use section padding plus one centered 366px content rail',
);

assert.match(
  mobileGuestHeroSource,
  /max-w-\[366px\] items-center justify-between gap-3/,
  'Guest mobile header should use the same 366px content rail so actions do not clip at the viewport edge',
);

assert.match(
  mobileGuestHeroSource,
  /flex flex-col items-center gap-1[\s\S]*landing\.mobileHeroScoreValue[\s\S]*landing\.mobileHeroScoreLabel/,
  'Guest mobile score should be a small internal stack with gap spacing',
);

assert.match(
  mobileGuestHeroSource,
  /flex max-w-\[330px\] flex-col items-center gap-4[\s\S]*landing\.mobileHeroTitle[\s\S]*landing\.mobileHeroSubtitle/,
  'Guest mobile headline and subtitle should be grouped by a gap-based stack',
);

assert.match(
  mobileGuestHeroSource,
  /grid w-full gap-2[\s\S]*landing\.mobileHeroPrimaryCta[\s\S]*landing\.mobileHeroSecondaryCta/,
  'Guest mobile CTAs should be grouped in a full-width gap-based grid',
);

assert.match(
  mobileGuestHeroSource,
  /to="\/register"[\s\S]*href="#mobile-tools"/,
  'Guest mobile secondary CTA should scroll to the tools section',
);

assert.doesNotMatch(
  mobileGuestHeroSource,
  /sticky|MobileHeroProductPreview|mobileHeroEyebrow|href="#mobile-how"|mt-\[34px\]|mt-\[31px\]/,
  'Guest mobile hero should not keep sticky behavior, preview cards, old anchors, or manual Figma margin offsets',
);

assert.match(
  guestSectionsSource,
  /id="mobile-proof"[\s\S]*flex flex-col gap-7[\s\S]*landing\.termExamples[\s\S]*<TermCardCarousel variant="guest" \/>/,
  'Guest mobile proof section should use a gap stack around the real term examples carousel',
);

assert.match(
  guestSectionsSource,
  /<MobileSourceProof \/>[\s\S]*<MobileToolsFeature isAuthenticated=\{false\} \/>/,
  'Guest mobile sections should keep the visible order: term examples, source proof, then tools card',
);

assert.doesNotMatch(
  landingSource,
  /function MobileProofSections|function MobileProofContent|mobileHow|mobileFinalCta|id="mobile-how"|<MobileToolsSlider/,
  'Guest mobile landing should delete the invented stats/how/final stack and old tools slider',
);

assert.match(
  mobileSourceProofSource,
  /id="mobile-source-proof"[\s\S]*px-6[\s\S]*mx-auto flex w-full max-w-\[366px\] flex-col gap-6/,
  'Mobile source proof should be a padded section with a max-width vertical stack',
);

assert.match(
  mobileSourceProofSource,
  /grid min-h-\[128px\] grid-cols-\[minmax\(0,1fr\)_112px\] gap-2/,
  'Mobile source proof card should use a responsive grid instead of fixed Figma coordinates',
);

assert.match(
  mobileSourceProofSource,
  /flex flex-col justify-center gap-2[\s\S]*landing\.mobileSourceGuess[\s\S]*landing\.mobileSourceCite[\s\S]*landing\.mobileSourceBody/,
  'Mobile source proof copy should be arranged as readable flow content with gap spacing',
);

assert.match(
  mobileSourceProofSource,
  /flex flex-col justify-center gap-3[\s\S]*border-l-4 border-accent[\s\S]*sourceLabels\.map/,
  'Mobile source proof metadata rail should use a stacked rail with a real border divider',
);

assert.match(
  mobileSourceProofSource,
  /flex items-center gap-2[\s\S]*item\.icon[\s\S]*item\.label/,
  'Mobile source proof metadata rows should align icon and label with gap spacing',
);

assert.doesNotMatch(
  mobileSourceProofSource,
  /absolute|sourceProofRef|sourceProofScale|ResizeObserver|origin-top-left|transform: `scale|left-\[|top-\[/,
  'Mobile source proof should not use absolute-positioned Figma coordinates or resize observers',
);

assert.match(
  mobileSourceProofSource,
  /landing\.mobileSourceGuess[\s\S]*landing\.mobileSourceCite[\s\S]*landing\.mobileSourceBody/,
  'Mobile source proof should render the source-backed copy',
);

assert.match(
  mobileToolsFeatureSource,
  /id="mobile-tools"[\s\S]*px-6[\s\S]*mx-auto flex w-full max-w-\[366px\] flex-col gap-10[\s\S]*landing\.mobileToolsTitle[\s\S]*landing\.mobileToolsSubtitle/,
  'Mobile tools section should render title and subtitle inside a gap-based stack',
);

assert.match(
  mobileToolsFeatureSource,
  /<MobileFeatureCarousel isAuthenticated=\{isAuthenticated\} \/>/,
  'Mobile tools section should render the auth-aware feature carousel',
);

assert.match(
  mobileFeatureCarouselSource,
  /mobile-feature-weak-topics\.png/,
  'Mobile feature carousel should include the Figma weak-topics feature card',
);

assert.match(
  mobileFeatureCarouselSource,
  /mobile-feature-tests\.png/,
  'Mobile feature carousel should include the Figma tests feature card',
);

assert.match(
  mobileFeatureCarouselSource,
  /mobile-feature-term\.png/,
  'Mobile feature carousel should include the Figma term-search feature card',
);

assert.match(
  mobileFeatureCarouselSource,
  /mobile-feature-semantic\.png/,
  'Mobile feature carousel should include the Figma semantic-search feature card',
);

assert.doesNotMatch(
  mobileToolsFeatureSource,
  /mobileToolTests|mobileToolTerm|mobileToolSemantic|overflow-x-auto|mt-\[54px\]|mt-\[26px\]|mt-7/,
  'Mobile tools section should not render extra off-frame cards or rely on manual vertical margins',
);

for (const key of [
  'mobileHeroScoreValue',
  'mobileHeroScoreLabel',
  'mobileHeroTitle',
  'mobileHeroSubtitle',
  'mobileHeroPrimaryCta',
  'mobileHeroSecondaryCta',
  'mobileSourceGuess',
  'mobileSourceCite',
  'mobileSourceBody',
  'mobileToolsTitle',
  'mobileToolsSubtitle',
  'mobileToolWeakTopicsTitle',
  'mobileToolWeakTopicsDesc',
  'mobileToolWeakTopicsCta',
]) {
  assert.match(
    `${landingSource}\n${mobileFeatureCarouselSource}`,
    new RegExp(`landing\\.${key}`),
    `Guest landing should render landing.${key}`,
  );
  assert.ok(ruLocale.landing[key], `RU locale should define landing.${key}`);
  assert.ok(kkLocale.landing[key], `KK locale should define landing.${key}`);
}

assert.match(
  carouselSource,
  /variant\?: 'desktop' \| 'mobile' \| 'home' \| 'guest'/,
  'TermCardCarousel should expose a guest variant',
);

assert.match(
  carouselSource,
  /h-\[128px\] w-\[216px\] rounded-\[16px\] border-0 bg-\[#efebf6\]/,
  'Guest term cards should use the reviewed 216px footprint',
);

assert.match(
  carouselSource,
  /GUEST_FALLBACK_TERMS/,
  'Guest term carousel should have source-backed fallback examples when the featured API is unavailable',
);

assert.match(
  carouselFunctionSource,
  /const shouldAutoScroll = variant === 'desktop' \|\| variant === 'guest';/,
  'Desktop and guest carousels should use fixed-speed auto-scroll behavior',
);

assert.match(
  carouselFunctionSource,
  /variant === 'guest'\s*\?\s*'overflow-hidden pb-0'/,
  'Guest mobile terms carousel should be moved by the animation rather than manual horizontal scrolling',
);
