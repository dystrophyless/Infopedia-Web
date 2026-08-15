import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(
  path.resolve(import.meta.dirname, 'Profile.tsx'),
  'utf8',
);

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  assert.notEqual(startIndex, -1, `Missing ${start}`);
  assert.notEqual(endIndex, -1, `Missing ${end}`);
  return source.slice(startIndex, endIndex);
}

const subscriptionPromoSource = sliceBetween(
  profileSource,
  'function SubscriptionPromo()',
  'function WeakTopicsPanel()',
);

assert.doesNotMatch(
  subscriptionPromoSource,
  /subscriptionBodyText|profile\.subscriptionBody|<p className="mt-3 text-\[14px\]/,
  'Subscription card should not render a separate descriptive paragraph before the feature list',
);

assert.match(subscriptionPromoSource, /onClick=\{\(\) => navigate\('\/subscription'\)\}/, 'Subscription promo CTA should open the protected subscription page');

assert.match(
  subscriptionPromoSource,
  /const benefits = \[[\s\S]*subscriptionBenefitWeakTopics[\s\S]*subscriptionBenefitRecommendations[\s\S]*progressBenefitText/,
  'Subscription card should keep the three premium features as the main content',
);

assert.match(
  subscriptionPromoSource,
  /mt-2 block text-\[13px\] font-medium leading-none text-primary[\s\S]*\{priceText\}/,
  'Subscription price should render as plain text instead of a pill',
);

assert.doesNotMatch(
  subscriptionPromoSource,
  /mt-2 inline-flex rounded-full border border-border\/55 bg-bg/,
  'Subscription price should not use the old rounded pill treatment',
);

assert.match(
  subscriptionPromoSource,
  /my-auto grid gap-1\.5[\s\S]*inline-flex min-h-8 w-full items-center gap-2 border-b border-border\/25 px-3 py-1\.5 text-\[12px\]/,
  'Subscription features should sit between the price and CTA as subtle divider rows',
);

assert.doesNotMatch(
  subscriptionPromoSource,
  /last:border-b-0/,
  'The last subscription feature should keep its bottom divider too',
);

assert.doesNotMatch(
  subscriptionPromoSource,
  /rounded-\[8px\] border border-border\/35 bg-surface/,
  'Subscription feature rows should not use a full card outline',
);
