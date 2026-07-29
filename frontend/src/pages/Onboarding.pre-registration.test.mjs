import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');

const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const onboardingSource = readFileSync(path.resolve(pagesDir, 'Onboarding.tsx'), 'utf8');
const registerSource = readFileSync(path.resolve(pagesDir, 'Register.tsx'), 'utf8');
const googleCallbackSource = readFileSync(path.resolve(pagesDir, 'GoogleCallback.tsx'), 'utf8');
const mobileFeatureCarouselSource = readFileSync(
  path.resolve(componentsDir, 'MobileFeatureCarousel.tsx'),
  'utf8',
);
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

function sourceBetween(start, end) {
  const startIndex = landingSource.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = landingSource.indexOf(end, startIndex + start.length);
  return endIndex === -1 ? landingSource.slice(startIndex) : landingSource.slice(startIndex, endIndex);
}

const desktopGuestBundleSource = sourceBetween('function DesktopGuestLanding', 'function MobileHome');
const mobileGuestHeroSource =
  landingSource.match(/function MobileConversionHeroHome\(\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction MobileFigmaGuestSections/)?.[1] ?? '';

assert.match(
  landingSource,
  /const ONBOARDING_TARGET = '\/onboarding';/,
  'Landing should define a shared onboarding target for guest conversion CTAs',
);

for (const [name, source] of [
  ['desktop guest landing', desktopGuestBundleSource],
  ['mobile guest hero', mobileGuestHeroSource],
]) {
  assert.match(
    source,
    /landingCtaTarget\('\/search', isAuthenticated\)/,
    `${name} primary CTAs should use the auth-aware search destination`,
  );
  assert.doesNotMatch(
    source,
    /to="\/register"/,
    `${name} should no longer skip onboarding by linking directly to registration`,
  );
}

assert.match(
  mobileFeatureCarouselSource,
  /const ONBOARDING_TARGET = '\/onboarding';/,
  'Feature carousel should share the guest onboarding target',
);

assert.match(
  mobileFeatureCarouselSource,
  /return isAuthenticated \? path : ONBOARDING_TARGET;/,
  'Guest feature cards should start onboarding instead of sending visitors to login',
);

assert.match(
  onboardingSource,
  /type OnboardingStep = 'grade' \| 'username';/,
  'Onboarding should ask for class before username',
);

assert.doesNotMatch(
  onboardingSource,
  /Navigate to="\/login\?next=\/onboarding"/,
  'Onboarding should be reachable before authentication',
);

assert.match(
  onboardingSource,
  /savePendingOnboardingDraft\(\{\s*grade:\s*nextGrade,\s*username:\s*normalizedUsername,\s*\}\);/,
  'Guest onboarding should save grade and username before registration',
);

assert.match(
  onboardingSource,
  /navigate\('\/register', \{ replace: false \}\);/,
  'Guest onboarding should continue into the registration page after username',
);

assert.match(
  onboardingSource,
  /applyPendingOnboardingDraft/,
  'Authenticated onboarding should apply the saved pre-registration answers',
);

assert.match(
  registerSource,
  /navigate\('\/onboarding', \{ replace: true \}\);/,
  'Email verification should return to onboarding so saved answers can be applied',
);

assert.match(
  googleCallbackSource,
  /navigate\('\/onboarding', \{ replace: true \}\);/,
  'Google OAuth should return incomplete users to onboarding so saved answers can be applied',
);

for (const key of [
  'gradeFirstHelper',
  'usernameSecondHelper',
  'savingDraft',
  'applyingDraft',
  'registerNextHelper',
]) {
  assert.ok(ruLocale.onboarding[key], `RU locale should define onboarding.${key}`);
  assert.ok(kkLocale.onboarding[key], `KK locale should define onboarding.${key}`);
}
