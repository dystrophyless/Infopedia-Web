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
  /setVisibleDefinitionText\(fitTextToAvailableSpace\(node, fullDefinitionText\)\)/,
  'Featured term card should derive the visible definition text from real available space',
);

assert.match(
  carouselSource,
  /words\.slice\(0, wordCount\)\.join\(' '\) \+ ELLIPSIS/,
  'Featured term card should append ellipsis after the last whole word that fits',
);

assert.match(
  carouselFunctionSource,
  /const shouldAutoScroll = variant === 'desktop' \|\| variant === 'guest';/,
  'Desktop and guest carousels should auto-scroll with duplicated loop items',
);

assert.match(
  carouselFunctionSource,
  /const displayTerms = shouldAutoScroll \? loopedTerms : terms;/,
  'Finite mobile and home carousels should keep native scrolling while auto-scroll variants duplicate items',
);

assert.match(
  carouselFunctionSource,
  /if \(!shouldAutoScroll \|\| !node \|\| terms\.length < 2\) return;/,
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
  /absolute right-5 top-5|bottom-0 right-0|isDefinitionOverflowing|WebkitLineClamp|definitionLineClamp/,
  'Featured term card should not use a detached overlay arrow or CSS line-clamp clipping',
);

assert.doesNotMatch(
  featuredCardSource,
  /text-\[36px\]|text-\[22px\]|font-light|leading-relaxed/,
  'Featured term card should not keep oversized, light, or overly loose body text',
);
