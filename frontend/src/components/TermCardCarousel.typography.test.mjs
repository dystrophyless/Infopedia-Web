import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const featureDir = path.resolve(import.meta.dirname, '../features/terms/components');
const card = readFileSync(path.resolve(featureDir, 'FeaturedTermCard.tsx'), 'utf8');
const view = readFileSync(path.resolve(featureDir, 'TermCardCarouselView.tsx'), 'utf8');
const controller = readFileSync(path.resolve(featureDir, 'TermCardCarousel.tsx'), 'utf8');
const facade = readFileSync(path.resolve(import.meta.dirname, 'TermCardCarousel.tsx'), 'utf8');

assert.match(facade, /features\/terms\/components\/TermCardCarousel/, 'Legacy import must remain a compatibility facade');
assert.match(view, /FEATURED_TERMS_LIMIT = 10/, 'The original carousel cycle must stay capped at ten terms');
assert.match(controller, /getFeaturedTerms\(FEATURED_TERMS_LIMIT\)/, 'Controller must request ten live backend terms');
assert.doesNotMatch(`${card}\n${view}\n${controller}`, /GUEST_FALLBACK_TERMS|informatika-fallback/, 'Static fallback terms must not replace backend IDs');

assert.match(card, /formatDefinitionSource\(definition, t\)/, 'Visible source must derive from definition metadata');
assert.match(card, /text-action-selected\/50/, 'Guest source copy must retain the exact semantic muted-purple color');
assert.match(card, /'desktop' \| 'mobile' \| 'home' \| 'guest' \| 'guestDesktop'/, 'All five accepted variants must remain public');
assert.match(card, /h-\[238px\][\s\S]*w-\[76vw\][\s\S]*p-5[\s\S]*shadow-none/, 'Mobile card geometry and flat treatment must remain exact');
assert.match(card, /h-\[168px\] w-\[216px\][\s\S]*p-6/, 'Guest mobile card must keep its accepted footprint');
assert.match(card, /h-\[220px\] w-\[320px\][\s\S]*p-8/, 'Guest desktop card must keep its accepted footprint');
assert.match(card, /text-\[23px\][\s\S]*text-\[30px\]/, 'Mobile and desktop titles must keep compact sizes');
assert.match(card, /ArrowUpRight01Icon/, 'Title row must keep the up-right action icon');
assert.doesNotMatch(card, /line-clamp-\d+|WebkitLineClamp|definitionLineClamp/, 'Definition preview must use measured fitting, not line clamp');
assert.match(card, /fitTextToAvailableSpace\(node, fullDefinitionText\)/, 'Visible definition must be measured against real available space');
assert.match(card, /words\.slice\(0, wordCount\)\.join\(' '\) \+ ELLIPSIS/, 'Measured truncation must end on a whole word');
assert.match(card, /return \{ text: bestFitText, overflowing: true \}/, 'Measured fitting must expose overflow state');
assert.match(card, /visibleDefinition\.overflowing \?/, 'Fade must render only for actual overflow');
assert.match(card, /pointer-events-none absolute inset-x-0 bottom-0 h-\[1\.75em\] bg-gradient-to-t/, 'Fade must overlay the final visible line without changing geometry');
assert.match(card, /from-surface-subtle[\s\S]*tone\.fadeClassName[\s\S]*from-surface/, 'Fade must match guest, colored mobile, and surface backgrounds');
assert.match(card, /aria-hidden=\{clone \|\| undefined\}[\s\S]*tabIndex=\{clone \? -1 : undefined\}/, 'Clones must be hidden from accessibility and keyboard navigation');

assert.match(view, /shouldAutoScroll = variant === 'desktop' \|\| variant === 'guest' \|\| variant === 'guestDesktop'/, 'Only desktop and guest variants may auto-scroll');
assert.match(view, /carouselTerms\.length > 1 \? \[\.\.\.carouselTerms, \.\.\.carouselTerms\]/, 'Auto-scroll variants must duplicate multiple items for the loop');
assert.match(view, /clone-0[\s\S]*offsetLeft[\s\S]*orig-0[\s\S]*offsetLeft/, 'Loop distance must use measured clone and original offsets');
assert.match(view, /AUTO_SCROLL_PX_PER_SECOND = 46/, 'Loop speed must remain the named fixed speed');
assert.match(view, /onMouseEnter[\s\S]*pausedRef\.current = true[\s\S]*onMouseLeave[\s\S]*pausedRef\.current = false/, 'Hover must pause and resume auto-scroll');
assert.match(view, /onFocusCapture[\s\S]*pausedRef\.current = true[\s\S]*onBlurCapture[\s\S]*pausedRef\.current = false/, 'Keyboard focus must pause and resume auto-scroll');
assert.match(view, /touch-pan-x snap-x/, 'Finite mobile carousel must retain native horizontal panning');
assert.match(view, /mobile: 'gap-3 pl-0 pr-\[24vw\]'/, 'Mobile track must bleed only to the right');
assert.match(view, /guest: 'gap-4 pl-8 pr-8'/, 'Guest track must own complete-card gutters');
assert.match(view, /if \(loading\)[\s\S]*if \(carouselTerms\.length === 0\) return null/, 'View must preserve loading and empty states');
