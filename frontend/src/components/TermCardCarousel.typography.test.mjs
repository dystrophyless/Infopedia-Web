import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const carouselSource = readFileSync(
  path.resolve(import.meta.dirname, 'TermCardCarousel.tsx'),
  'utf8',
);

const featuredCardStart = carouselSource.indexOf('function FeaturedTermCard(');
const carouselStart = carouselSource.indexOf('export function TermCardCarousel()');

assert.notEqual(featuredCardStart, -1, 'FeaturedTermCard should exist');
assert.notEqual(carouselStart, -1, 'TermCardCarousel should exist');

const featuredCardSource = carouselSource.slice(featuredCardStart, carouselStart);

assert.match(
  featuredCardSource,
  /flex min-w-0 items-start justify-between gap-4[\s\S]*truncate text-\[30px\] font-medium leading-tight text-text max-md:text-\[24px\]/,
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
  /mt-4[\s\S]*text-\[18px\] font-normal leading-\[1\.35\] text-text-body max-md:text-\[15px\]/,
  'Featured term card definition preview should use normal-weight text with compact line height',
);

assert.match(
  featuredCardSource,
  /mt-4 min-h-0 min-w-0 flex-1[\s\S]*h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-\[18px\] font-normal leading-\[1\.35\] text-text-body max-md:text-\[15px\]/,
  'Featured term card definition preview should use the available space before metadata instead of a fixed line clamp',
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
