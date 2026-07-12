import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const carouselSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/TermCardCarouselView.tsx'),
  'utf8',
);
const featuredTermCardSource = readFileSync(
  path.resolve(pagesDir, '../features/terms/components/FeaturedTermCard.tsx'),
  'utf8',
);

const appHomeSource =
  landingSource.match(/function MobileAppHome\(\) \{([\s\S]*?)\n\}\n\nfunction MobileSourceProof/)?.[1] ?? '';

assert.ok(appHomeSource, 'Landing should define the authenticated mobile workspace home');

for (const key of [
  'landing.mobileWorkspaceTitle',
  'landing.mobileWorkspaceSubtitle',
  'landing.mobileTermsTitle',
  'landing.mobileTermsViewAll',
  'landing.mobileQuickActionsTitle',
  'landing.mobileConceptSearchPlaceholder',
  'landing.mobileDictionaryTitle',
  'landing.mobileDictionaryDescription',
  'landing.mobileMockExamTitle',
  'landing.mobileMockExamDescription',
]) {
  assert.match(
    appHomeSource,
    new RegExp(key.replace('.', '\\.')),
    `Authenticated mobile workspace home should render ${key}`,
  );
}

assert.match(
  appHomeSource,
  /<TermCardCarousel variant="home"/,
  'Authenticated mobile workspace home should use the compact home terms carousel',
);

assert.match(
  appHomeSource,
  /setSearchModalOpen\(true\)/,
  'Authenticated mobile workspace search field should open the search-choice sheet',
);

assert.doesNotMatch(
  appHomeSource,
  /<MobileProofContent/,
  'Authenticated mobile workspace home should not reuse the old stats-first proof layout',
);

assert.match(
  featuredTermCardSource,
  /export type FeaturedTermCardVariant = 'desktop' \| 'mobile' \| 'home' \| 'guest' \| 'guestDesktop'/,
  'TermCardCarousel should expose a compact home variant without changing guest mobile proof cards',
);

assert.match(
  featuredTermCardSource,
  /const isHomeVariant = variant === 'home';/,
  'Featured term cards should branch for a compact home card shape',
);

assert.match(
  featuredTermCardSource,
  /h-\[134px\] w-\[204px\] rounded-\[8px\] border border-\[#e8e1ee\] bg-surface p-4 shadow-none/,
  'Home terms cards should match the compact white screenshot-style card footprint',
);

assert.match(
  carouselSource,
  /home: 'gap-2\.5 pl-0 pr-4'/,
  'Home terms carousel should use tight spacing and right-side horizontal overflow',
);
