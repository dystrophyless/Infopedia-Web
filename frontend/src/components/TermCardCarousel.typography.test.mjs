import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(import.meta.dirname, '..');
const featureDir = path.resolve(srcDir, 'features/terms/components');
const readFeature = (name) => readFileSync(path.join(featureDir, name), 'utf8');
const card = readFeature('FeaturedTermCard.tsx');
const measuredPreview = readFeature('MeasuredTextPreview.tsx');
const view = readFeature('TermCardCarouselView.tsx');
const controller = readFeature('TermCardCarousel.tsx');
const featureIndex = readFeature('index.ts');
const facade = readFileSync(path.join(srcDir, 'components/TermCardCarousel.tsx'), 'utf8');
const carouselStories = readFeature('TermCardCarousel.stories.tsx');
const cardStories = readFeature('TermCards.stories.tsx');
const landing = readFileSync(path.join(srcDir, 'pages/Landing.tsx'), 'utf8');

assert.match(facade, /^export \{ TermCardCarousel \} from '\.\.\/features\/terms\/components\/TermCardCarousel';/m);
assert.doesNotMatch(facade, /FeaturedTermCard|TermCardCarouselView|fitTextToAvailableSpace/,
  'The compatibility facade must expose only the production TermCardCarousel');
assert.doesNotMatch(featureIndex, /export \* from '\.\/FeaturedTermCard'|export \* from '\.\/TermCardCarouselView'/,
  'The terms barrel must not publish retired carousel implementation details');

const productionCalls = [...landing.matchAll(/<TermCardCarousel\s+variant="(guest|guestLanding)"\s*\/>/g)].map((match) => match[1]);
assert.deepEqual(productionCalls, ['guestLanding', 'guest'], 'Landing must keep exactly the two production carousel call-sites');
assert.equal((landing.match(/<TermCardCarousel\b/g) ?? []).length, 2, 'No gallery or default carousel call-sites may remain');

assert.match(controller, /getFeaturedTerms\(FEATURED_TERMS_LIMIT\)/, 'The controller must request the live backend catalog');
assert.match(controller, /variant:\s*FeaturedTermCardVariant/, 'The production variant is required at the controller boundary');
assert.doesNotMatch(controller, /variant\?:|variant\s*=\s*['"]/,
  'The controller must not silently select a legacy/default variant');
assert.doesNotMatch(`${card}\n${view}\n${controller}`, /GUEST_FALLBACK_TERMS|informatika-fallback/,
  'Static fallback terms must not replace backend IDs');

assert.match(card, /export type FeaturedTermCardVariant = 'guest' \| 'guestLanding';/,
  'Featured cards must expose only the two production variants');
assert.match(card, /variant:\s*FeaturedTermCardVariant/, 'Featured card variants are required');
assert.doesNotMatch(card, /variant\?:|variant\s*=\s*['"]/,
  'Featured cards must not default to a retired visual variant');
assert.doesNotMatch(card, /'desktop'|'mobile'|'home'|'guestDesktop'|guestDesktop|isMobileVariant|isHomeVariant|isGuestDesktopVariant/,
  'Retired desktop/mobile/home branches must be physically absent');
assert.doesNotMatch(card, /fitTextToAvailableSpace|createDefinitionMeasureNode|doesTextFit|useLayoutEffect|useMemo|useRef|useState|DefinitionMetadata|ArrowUpRight01Icon|MOBILE_CARD_TONES|getMobileCardToneClasses/,
  'Legacy measurement, metadata, icon, and tone helpers must be removed');
assert.match(card, /MeasuredTextPreview/, 'Production cards must keep the shared measured preview');
assert.match(card, /maxHeight=\{56\}/, 'Production preview must reserve four 14px lines');
assert.match(card, /h-\[168px\] w-\[216px\][\s\S]*bg-white[\s\S]*p-6/, 'Guest mobile geometry must remain 216x168');
assert.match(card, /h-\[168px\] w-\[262px\][\s\S]*bg-white[\s\S]*p-6/, 'Guest landing geometry must remain 262x168');
assert.match(card, /formatDefinitionSource\(definition, t\)/, 'Visible source copy must remain metadata-backed');
assert.match(card, /<Link[\s\S]*to=\{`\/terms\/\$\{term\.public_id\}`\}/, 'Cards must remain full term links');
assert.match(card, /clone[\s\S]*aria-hidden="true"/, 'Carousel clones must remain hidden from assistive technology');

assert.match(view, /Record<FeaturedTermCardVariant, string>/, 'The track geometry must be total over the two variants');
assert.match(view, /guest:/, 'Guest mobile geometry must remain explicit');
assert.match(view, /guestLanding:/, 'Guest landing geometry must remain explicit');
assert.match(view, /function LoadingCarousel[\s\S]*trackClasses\[variant\]/, 'Carousel loading must reuse the loaded track padding and gap');
assert.match(view, /Array\.from\(\{ length: 4 \}/, 'Carousel loading must render four anatomical skeleton cards');
assert.match(view, /role="status"[\s\S]*aria-busy="true"[\s\S]*className="sr-only"/, 'Carousel loading must expose one localized status while hiding skeleton paint');
assert.match(view, /data-carousel-skeleton-title[\s\S]*data-carousel-skeleton-definition[\s\S]*data-carousel-skeleton-source/, 'Carousel loading must reserve title, definition, and source anatomy');
assert.match(view, /loadingShellClasses[\s\S]*bg-white/, 'Carousel loading shells must remain white surfaces with contrasting inner placeholders');
assert.doesNotMatch(view, /desktop|mobile|home|guestDesktop|snap-|touch-pan-x|scroll-smooth|variant === 'desktop'/,
  'Carousel view must not retain legacy desktop/mobile/manual-scroll branches');
assert.doesNotMatch(view, /shouldAutoScroll/, 'Carousel view must not retain a dead shouldAutoScroll abstraction');
assert.match(view, /FEATURED_TERMS_LIMIT = 10/, 'The backend carousel remains capped at ten terms');
assert.match(view, /carouselTerms\.length > 1 \? \[\.\.\.carouselTerms, \.\.\.carouselTerms\]/,
  'Auto-scroll must clone multiple terms for a continuous loop');
assert.match(view, /clone-0[\s\S]*offsetLeft[\s\S]*orig-0[\s\S]*offsetLeft/, 'Loop distance must use measured original/clone offsets');
assert.match(view, /cancelAnimationFrame\(frameId\);\s*\}, \[carouselTerms, variant\]\);/, 'Auto-scroll geometry must recalculate when the card variant changes without remounting');
assert.match(view, /pointerPausedRef/, 'Pointer pause state must remain independent');
assert.match(view, /focusPausedRef/, 'Focus pause state must remain independent');
assert.match(view, /onMouseEnter[\s\S]*pointerPausedRef\.current = true[\s\S]*onMouseLeave[\s\S]*pointerPausedRef\.current = false/,
  'Hover must pause and resume auto-scroll');
assert.match(view, /onFocusCapture[\s\S]*focusPausedRef\.current = true/, 'Keyboard focus must pause auto-scroll');
assert.match(view, /onBlurCapture[\s\S]*focusPausedRef\.current = false/, 'Leaving the carousel must resume auto-scroll');
assert.match(view, /button === 1|buttons === 4|middle/, 'Middle-button interaction must clear pointer pause');
assert.match(view, /if \(loading\)[\s\S]*if \(error\)[\s\S]*if \(carouselTerms\.length === 0\) return <EmptyCarousel/,
  'Loading, error/retry, and truthful empty states must remain available');
assert.match(view, /role="alert"[\s\S]*onRetry/, 'Errors must remain announced and retryable');

const storyExports = [...carouselStories.matchAll(/export const (\w+): Story/g)].map((match) => match[1]);
assert.deepEqual(storyExports, [
  'LoadingDesktop',
  'LoadingMobile',
  'RequestError',
  'Empty',
  'GuestMobileFourLinePreview',
  'GuestLandingFourLinePreview',
], 'Carousel stories must expose only production states and variants');
assert.doesNotMatch(cardStories, /FeaturedTermCard|FeaturedTermCardVariant|FiveFeaturedVariants/,
  'TermCards must not retain the retired featured-card gallery');

assert.match(measuredPreview, /data-measured-text-fade/, 'The shared measured preview must remain intact');

console.log('TermCardCarousel production-variant contract passed');
