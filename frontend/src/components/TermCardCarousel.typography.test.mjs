import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const carouselSource = readFileSync(
  path.resolve(import.meta.dirname, 'TermCardCarousel.tsx'),
  'utf8',
);

const featuredCardStart = carouselSource.indexOf('function FeaturedTermCard(');
const carouselStart = carouselSource.indexOf('export function TermCardCarousel(');

assert.notEqual(featuredCardStart, -1, 'FeaturedTermCard should exist');
assert.notEqual(carouselStart, -1, 'TermCardCarousel should exist');

const featuredCardSource = carouselSource.slice(featuredCardStart, carouselStart);
const carouselFunctionSource = carouselSource.slice(carouselStart);

assert.match(
  carouselSource,
  /const FEATURED_TERMS_LIMIT = 10;/,
  'Featured carousel should use exactly ten backend terms as the original loop set',
);

assert.match(
  carouselFunctionSource,
  /getFeaturedTerms\(FEATURED_TERMS_LIMIT\)/,
  'Featured carousel should request the ten-term carousel set from the backend',
);

assert.doesNotMatch(
  carouselSource,
  /GUEST_FALLBACK_TERMS|informatika-fallback|public_id: 'informatika'|public_id: 'alfavit'|public_id: 'etiket'/,
  'Featured carousel should not render static slug fallback links instead of real backend public IDs',
);

assert.match(
  carouselFunctionSource,
  /const carouselTerms = useMemo\(\(\) => terms\.slice\(0, FEATURED_TERMS_LIMIT\), \[terms\]\);/,
  'Featured carousel should cap the original cycle to ten terms before cloning',
);

assert.match(
  featuredCardSource,
  /formatDefinitionSource\(definition, t\)/,
  'Featured term card should derive the visible source line from definition metadata',
);

assert.match(
  featuredCardSource,
  /text-\[rgba\(106,55,195,0\.5\)\]/,
  'Guest Figma-sized cards should render the muted purple source line from the design',
);

assert.match(
  featuredCardSource,
  /text-\[23px\][\s\S]*text-\[30px\]/,
  'Featured term card title should use compact detail-page typography',
);

assert.match(
  featuredCardSource,
  /flex min-w-0 items-start justify-between gap-4[\s\S]*HugeiconsIcon icon=\{ArrowUpRight01Icon\}/,
  'Featured term card arrow should use the up-right icon in the title row opposite the term name',
);

assert.doesNotMatch(
  featuredCardSource,
  /ArrowUpRight01Icon[\s\S]{0,240}border|border[\s\S]{0,240}ArrowUpRight01Icon/,
  'Featured term card arrow should not have a surrounding border',
);

assert.match(
  featuredCardSource,
  /h-\[66px\][\s\S]*text-\[15px\][\s\S]*text-\[18px\]/,
  'Featured term card definition preview should use normal-weight text with compact line height',
);

assert.match(
  featuredCardSource,
  /mobileCardShellClass/,
  'Mobile featured cards should have a dedicated redesigned shell instead of reusing desktop card chrome',
);

assert.match(
  featuredCardSource,
  /mobileCardShellClass[\s\S]*p-5/,
  'Mobile featured cards should use roomier internal padding than the old 14px card padding',
);

assert.doesNotMatch(
  featuredCardSource,
  /mobileCardShellClass[\s\S]*p-3\.5/,
  'Mobile featured cards should not keep the cramped 14px internal padding',
);

assert.match(
  featuredCardSource,
  /border-0[\s\S]*shadow-none/,
  'Mobile featured cards should be flat with no visible card border or decorative shadow',
);

assert.match(
  featuredCardSource,
  /h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-\[15px\] font-normal leading-\[1\.25\] text-text-body[\s\S]*h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-\[18px\] font-normal leading-\[1\.25\] text-text-body/,
  'Featured term card definition preview should use compact line spacing and available space before metadata instead of a fixed line clamp',
);

assert.doesNotMatch(
  featuredCardSource,
  /line-clamp-\d+/,
  'Featured term card definition preview should not be capped to a fixed number of lines',
);

assert.match(
  featuredCardSource,
  /setVisibleDefinition\(fitTextToAvailableSpace\(node, fullDefinitionText\)\)/,
  'Featured term card should derive the visible definition text from real available space',
);

assert.match(
  carouselSource,
  /type FittedDefinitionText = \{\s*text: string;\s*overflowing: boolean;\s*\};/,
  'Featured term card fitting should return whether the original definition overflowed',
);

assert.match(
  carouselSource,
  /function fitTextToAvailableSpace\(node: HTMLElement, text: string\): FittedDefinitionText/,
  'Featured term card should expose overflow state from the measured text fitting helper',
);

assert.match(
  carouselSource,
  /return \{\s*text: bestFitText,\s*overflowing: true,?\s*\};/,
  'Featured term card should mark the definition as overflowing only when it had to truncate',
);

assert.match(
  featuredCardSource,
  /isDefinitionOverflowing/,
  'Featured term card should track when the measured definition does not fit the card',
);

assert.match(
  featuredCardSource,
  /const definitionFadeClass = isGuestLikeVariant[\s\S]*from-\[#fbfbfb\][\s\S]*getMobileCardFadeTone[\s\S]*from-surface/,
  'Definition overflow fade should match the active card background color',
);

assert.match(
  featuredCardSource,
  /isDefinitionOverflowing \? \([\s\S]*pointer-events-none absolute inset-x-0 bottom-0 h-\[1\.75em\] bg-gradient-to-t \$\{definitionFadeClass\} to-transparent/,
  'Overflowing definitions should render a bottom-to-top fade over the final visible line',
);

assert.match(
  featuredCardSource,
  /relative[\s\S]*\{definitionFade\}/,
  'Definition fade should be positioned inside the definition preview area without changing card size',
);

assert.match(
  carouselSource,
  /words\.slice\(0, wordCount\)\.join\(' '\) \+ ELLIPSIS/,
  'Featured term card should append ellipsis after the last whole word that fits',
);

assert.match(
  carouselSource,
  /variant\?: 'desktop' \| 'mobile' \| 'home' \| 'guest' \| 'guestDesktop'/,
  'TermCardCarousel should expose a larger desktop guest variant',
);

assert.match(
  featuredCardSource,
  /guestCardShellClass[\s\S]*h-\[168px\] w-\[216px\][\s\S]*p-6/,
  'Mobile guest term cards should be tall enough to show a useful definition preview',
);

assert.doesNotMatch(
  featuredCardSource,
  /guestCardShellClass[\s\S]*h-\[128px\]/,
  'Mobile guest term cards should not keep the cramped 128px height',
);

assert.match(
  carouselFunctionSource,
  /variant === 'guest'[\s\S]*\? 'h-\[168px\] w-\[216px\] rounded-\[16px\] border-0 bg-\[#fbfbfb\]'/,
  'Guest loading cards should reserve the same taller footprint as loaded term cards',
);

assert.match(
  featuredCardSource,
  /guestDesktopCardShellClass[\s\S]*h-\[220px\] w-\[320px\][\s\S]*p-8/,
  'Desktop guest term cards should be larger than the mobile guest cards',
);

assert.match(
  featuredCardSource,
  /isGuestLikeVariant[\s\S]*text-\[20px\][\s\S]*text-\[16px\]/,
  'Desktop guest term card typography should scale up from the mobile guest card',
);

assert.match(
  carouselFunctionSource,
  /const shouldAutoScroll = variant === 'desktop' \|\| variant === 'guest' \|\| variant === 'guestDesktop';/,
  'Desktop, guest, and desktop guest carousels should auto-scroll with duplicated loop items',
);

assert.match(
  carouselFunctionSource,
  /const displayTerms = shouldAutoScroll \? loopedTerms : carouselTerms;/,
  'Finite mobile and home carousels should keep native scrolling while auto-scroll variants duplicate items',
);

assert.match(
  carouselFunctionSource,
  /onMouseEnter=\{\(\) => \{[\s\S]*pausedRef\.current = true;[\s\S]*onMouseLeave=\{\(\) => \{[\s\S]*pausedRef\.current = false;/,
  'Auto-scrolling carousels should pause while the user hovers a card area and resume after leaving',
);

assert.match(
  carouselFunctionSource,
  /if \(!shouldAutoScroll \|\| !node \|\| carouselTerms\.length < 2\) return;/,
  'Mobile and home carousels should not run the fixed-speed auto-scroll animation',
);

assert.match(
  carouselFunctionSource,
  /AUTO_SCROLL_PX_PER_SECOND/,
  'Auto-scrolling carousels should use a named fixed speed instead of an implicit frame step',
);

assert.match(
  carouselFunctionSource,
  /data-carousel-item/,
  'Auto-scrolling carousels should mark original and cloned items so the loop distance is measured exactly',
);

assert.match(
  carouselFunctionSource,
  /clone-0[\s\S]*offsetLeft[\s\S]*orig-0[\s\S]*offsetLeft/,
  'Auto-scrolling carousels should loop by the measured clone offset instead of assuming scrollWidth / 2',
);

assert.match(
  carouselFunctionSource,
  /variant === 'guest'\s*\?\s*'overflow-hidden pb-0'/,
  'Guest carousel should be programmatically animated, not exposed as a manual horizontal scroller',
);

assert.match(
  carouselFunctionSource,
  /touch-pan-x/,
  'Mobile carousel scroller should explicitly allow horizontal touch panning',
);

assert.match(
  carouselFunctionSource,
  /variant === 'mobile' \? 'gap-3 pl-0 pr-\[24vw\]'/,
  'Mobile carousel track should start at the parent gutter and bleed only to the right',
);

assert.match(
  carouselFunctionSource,
  /variant === 'guest' \? 'gap-4 pl-8 pr-8'/,
  'Guest carousel track should own its left gutter so the first frame starts with a complete card',
);

assert.doesNotMatch(
  featuredCardSource,
  /absolute right-5 top-5|bottom-0 right-0|WebkitLineClamp|definitionLineClamp/,
  'Featured term card should not use a detached overlay arrow or CSS line-clamp clipping',
);

assert.doesNotMatch(
  featuredCardSource,
  /text-\[36px\]|text-\[22px\]|font-light|leading-relaxed/,
  'Featured term card should not keep oversized, light, or overly loose body text',
);
