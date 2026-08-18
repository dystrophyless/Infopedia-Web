import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const carouselSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/TermCardCarousel.tsx'),
  'utf8',
);
const carouselViewSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/TermCardCarouselView.tsx'),
  'utf8',
);
const featuredTermCardSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/FeaturedTermCard.tsx'),
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
  landingSource.match(/function MobileConversionHeroHome\(\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction MobileFigmaGuestSections/)?.[1] ?? '';
const guestSectionsSource =
  landingSource.match(/function MobileFigmaGuestSections[\s\S]*?\r?\n\}\r?\n\r?\nfunction MobileSourceProof/)?.[0] ?? '';
const mobileSourceProofSource =
  landingSource.match(/function MobileSourceProof[\s\S]*?\r?\n\}\r?\n\r?\nfunction MobileToolsFeature/)?.[0] ?? '';
const mobileToolsFeatureSource =
  landingSource.match(/function MobileToolsFeature[\s\S]*?\r?\n\}\r?\n\r?\nfunction MobileHeroLanguageToggle/)?.[0] ?? '';
const carouselViewFunctionSource = carouselViewSource.slice(
  carouselViewSource.indexOf('export function TermCardCarouselView('),
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
  /to=\{landingCtaTarget\('\/search', isAuthenticated\)\}[\s\S]*href="#mobile-tools"/,
  'Mobile hero should keep auth-aware search CTA and tools anchor',
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
  /id="mobile-proof"[^>]*pt-12 pb-\[72px\]/,
  'Guest mobile proof section should preserve the 48px top and 72px bottom Figma spacing',
);
assert.match(
  guestSectionsSource,
  /text-\[#6e6779\][\s\S]*landing\.termExamples/,
  'Guest mobile term examples label should use the exact muted-purple color',
);

assert.match(
  guestSectionsSource,
  /<MobileSourceProof isAuthenticated=\{isAuthenticated\} \/>[\s\S]*<MobileToolsFeature isAuthenticated=\{isAuthenticated\} \/>/,
  'Guest mobile sections should keep the visible order: term examples, source proof, then tools card',
);

assert.doesNotMatch(
  landingSource,
  /function MobileProofSections|function MobileProofContent|mobileHow|mobileFinalCta|id="mobile-how"|<MobileToolsSlider/,
  'Guest mobile landing should delete the invented stats/how/final stack and old tools slider',
);

assert.match(
  mobileSourceProofSource,
  /id="mobile-source-proof"[\s\S]*px-5[\s\S]*py-4[\s\S]*min-\[430px\]:px-8[\s\S]*mx-auto flex w-full max-w-\[366px\] flex-col gap-4/,
  'Mobile source proof should use the Figma 366px frame width, 32px desktop-mobile inset, and 16px CTA gap',
);

assert.match(
  mobileSourceProofSource,
  /grid min-h-\[128px\] grid-cols-\[minmax\(0,240px\)_8px_minmax\(100px,118px\)\]/,
  'Mobile source proof card should use the Figma 240px left card, 8px lavender gap, 118px right card, and 128px height',
);

assert.match(
  mobileSourceProofSource,
  /rounded-l-\[16px\] rounded-r-none[\s\S]*pl-6[\s\S]*pr-\[22px\][\s\S]*pt-8[\s\S]*pb-5[\s\S]*text-\[14px\][\s\S]*text-\[20px\][\s\S]*max-w-\[194px\][\s\S]*leading-none/,
  'Mobile source proof copy card should match the Figma left-card padding, type scale, and text measure',
);

assert.match(
  mobileSourceProofSource,
  /<div aria-hidden="true" \/>/,
  'Mobile source proof should keep the lavender gap as a real grid column',
);

assert.match(
  mobileSourceProofSource,
  /rounded-l-none rounded-r-\[16px\][\s\S]*bg-surface[\s\S]*w-1 self-stretch bg-\[#6a37c3\][\s\S]*flex flex-col gap-\[10px\][\s\S]*py-\[34px\][\s\S]*pl-\[18px\][\s\S]*pr-4[\s\S]*size=\{12\}[\s\S]*className="shrink-0 text-\[#6a37c3\]"[\s\S]*text-\[12px\]/,
  'Mobile source proof metadata card should render a real button-purple rail and button-purple icons',
);

assert.match(
  mobileSourceProofSource,
  /h-12[\s\S]*rounded-\[16px\][\s\S]*text-\[14px\][\s\S]*landing\.mobileHeroPrimaryCta/,
  'Mobile source proof CTA should match the Figma 48px full-width button',
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
  'mobileSourceEdition',
  'mobileSourceTopic',
  'mobileSourcePage',
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
  featuredTermCardSource,
  /export type FeaturedTermCardVariant = 'desktop' \| 'mobile' \| 'home' \| 'guest' \| 'guestDesktop'/,
  'TermCardCarousel should expose a guest variant',
);

assert.match(
  featuredTermCardSource,
  /h-\[168px\] w-\[216px\] rounded-\[16px\] border-0 bg-white/,
  'Guest term cards should use the white 216px mobile footprint',
);
assert.match(
  featuredTermCardSource,
  /variant === 'guest' \|\| isGuestLandingVariant \? 'from-white' : isMobileVariant/,
  'Guest mobile term card fades should match the white card surface',
);
assert.match(
  featuredTermCardSource,
  /isGuestDesktopVariant \? 'from-surface-subtle'/,
  'Guest desktop term card fades should retain the subtle desktop surface',
);

assert.match(
  carouselSource,
  /getFeaturedTerms\(FEATURED_TERMS_LIMIT\)/,
  'Guest term carousel should request real featured examples from the backend',
);

assert.match(
  carouselSource,
  /const \[error, setError\] = useState\(false\)/,
  'Featured carousel should distinguish a request error from an empty response',
);
assert.match(
  carouselSource,
  /onRetry=\{loadTerms\}/,
  'Featured carousel should expose a retry action after a failed request',
);
assert.match(
  carouselViewSource,
  /error\?: boolean[\s\S]*onRetry\?: \(\) => void/,
  'Carousel view should model error and retry state explicitly',
);
assert.match(
  carouselViewSource,
  /role="alert"[\s\S]*Повторить|role="alert"[\s\S]*onRetry/,
  'Carousel error state should be announced and provide an accessible retry control',
);

assert.doesNotMatch(
  carouselViewFunctionSource,
  /GUEST_FALLBACK_TERMS|informatika-fallback|public_id: 'informatika'|public_id: 'alfavit'|public_id: 'etiket'/,
  'Guest term carousel should not fall back to static slug links when the backend is unavailable',
);

assert.match(
  carouselViewFunctionSource,
  /const shouldAutoScroll = variant === 'desktop' \|\| variant === 'guest' \|\| variant === 'guestDesktop' \|\| variant === 'guestLanding';/,
  'Desktop, guest, and landing carousels should use fixed-speed auto-scroll behavior',
);

assert.match(
  carouselViewFunctionSource,
  /variant === 'guest' \|\| variant === 'guestDesktop' \|\| variant === 'guestLanding' \? 'overflow-hidden pb-0'/,
  'Guest terms carousel should be moved by animation inside a clipped viewport',
);

assert.doesNotMatch(
  carouselViewFunctionSource,
  /variant === 'guestLanding'\s*\?\s*'[^']*(?:overflow-x-auto|snap-)/,
  'Landing carousel should not retain finite manual snap scrolling',
);
