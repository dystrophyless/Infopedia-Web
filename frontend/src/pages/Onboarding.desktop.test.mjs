import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const componentsDir = path.resolve(pagesDir, '..', 'components');
const authShellSource = readFileSync(path.resolve(componentsDir, 'AuthShell.tsx'), 'utf8');
const onboardingSource = readFileSync(path.resolve(pagesDir, 'Onboarding.tsx'), 'utf8');
const registerSource = readFileSync(path.resolve(pagesDir, 'Register.tsx'), 'utf8');
const loginSource = readFileSync(path.resolve(pagesDir, 'Login.tsx'), 'utf8');
const onboardingStoriesSource = readFileSync(
  path.resolve(pagesDir, 'Onboarding.stories.tsx'),
  'utf8',
);
const registerStoriesSource = readFileSync(
  path.resolve(pagesDir, 'Register.stories.tsx'),
  'utf8',
);
const visualHarnessPath = path.resolve(pagesDir, 'Onboarding.desktop.visual.mjs');
const googleIconPath = path.resolve(
  pagesDir,
  '..',
  '..',
  'public',
  'figma',
  'onboarding',
  'google-black-icon.svg',
);
const googleManifestPath = path.resolve(path.dirname(googleIconPath), 'manifest.json');

assert.match(
  authShellSource,
  /desktopFlowStep\?: 1 \| 2 \| 3/,
  'AuthShell should expose an opt-in three-step desktop onboarding variant',
);
assert.match(
  authShellSource,
  /desktopOnboarding \? 'min-\[1440px\]:flex-row min-\[1440px\]:bg-\[#efebf6\]' : ''/,
  'Fixed desktop onboarding should activate only at the 1440px Figma reference width',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-sidebar"[\s\S]*min-\[1440px\]:min-h-screen[\s\S]*min-\[1440px\]:w-\[480px\][\s\S]*min-\[1440px\]:border-\[#ded2f1\][\s\S]*min-\[1440px\]:px-16[\s\S]*min-\[1440px\]:py-8/,
  'Desktop onboarding sidebar should retain its 480px rail and 64x32 padding only at the 1440px desktop presentation',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-logo"[\s\S]*min-\[1440px\]:h-\[44px\][\s\S]*min-\[1440px\]:w-\[171px\]/,
  'Desktop onboarding logo should preserve the 171x44 Figma geometry',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-stepper"[\s\S]*gap-16[\s\S]*w-\[2px\][\s\S]*size-12/,
  'Desktop onboarding stepper should use 64px row gaps, a 2px connector, and 48px circles',
);
assert.match(
  authShellSource,
  /'desktop-onboarding-main'[\s\S]*min-\[1440px\]:min-h-screen[\s\S]*min-\[1440px\]:w-\[960px\][\s\S]*min-\[1440px\]:bg-\[#efebf6\]/,
  'Desktop onboarding main region should retain its 960px surface only at the 1440px desktop presentation',
);
assert.match(
  authShellSource,
  /'desktop-onboarding-card'[\s\S]*min-\[1440px\]:w-\[480px\][\s\S]*min-\[1440px\]:rounded-\[16px\][\s\S]*min-\[1440px\]:p-12/,
  'Desktop onboarding card should match the 480px width, 16px radius, and 48px padding at the Figma reference width',
);
assert.match(
  authShellSource,
  /desktopOnboarding \? 'hidden lg:flex min-\[1440px\]:hidden' : 'flex max-lg:hidden'/,
  'Sub-1440 onboarding should retain the existing single-column desktop header instead of hiding all navigation',
);

assert.match(onboardingSource, /desktopFlowStep=\{step === 'grade' \? 1 : 2\}/);
assert.match(registerSource, /desktopFlowStep=\{3\}/);
assert.match(
  loginSource,
  /<GoogleAuthButton onClick=\{handleGoogleAuth\}>/,
  'Login should keep using the shared GoogleAuthButton and its exact Figma asset',
);
assert.match(
  onboardingSource,
  /data-onboarding-indicator="desktop"[\s\S]*hidden size-5 shrink-0 rounded-full border[\s\S]*min-\[1440px\]:block/,
  'Desktop grade rows should expose radio circles only at the 1440px Figma reference width',
);
assert.doesNotMatch(
  onboardingSource,
  /Backpack02Icon|GraduationCapIcon|AnonymousIcon|icon=\{icon\}/,
  'Desktop grade rows must not render leading grade-specific glyphs',
);
assert.match(
  onboardingSource,
  /data-onboarding-indicator="mobile"[\s\S]*min-\[1440px\]:hidden[\s\S]*data-onboarding-indicator="desktop"[\s\S]*min-\[1440px\]:block/,
  'Grade indicators should expose distinct mobile and desktop anatomy for responsive visual assertions',
);
assert.match(
  onboardingSource,
  /min-\[1440px\]:text-\[16px\][\s\S]*min-\[1440px\]:text-\[#8c8698\]/,
  'Onboarding helper typography should remain in the fallback presentation below 1440px',
);
assert.match(
  onboardingSource,
  /max-md:hidden min-\[1440px\]:hidden/,
  'The username Back control should stay visible throughout the intermediate-width fallback',
);
assert.match(
  onboardingSource,
  /min-\[1440px\]:justify-between[\s\S]*min-\[1440px\]:bg-\[#f8f5fc\]/,
  'Desktop grade row layout and surface should activate only at the 1440px Figma reference width',
);
assert.match(
  onboardingSource,
  /desktopShowSuccessIcon=\{usernameHelperTone === 'success'\}/,
  'The valid desktop username state should expose the Figma trailing success check',
);
assert.match(
  registerSource,
  /desktopFlowStep=\{3\}[\s\S]*desktopVisual="onboarding"/,
  'Registration should use the same desktop shell and control presentation without changing API flow',
);
assert.doesNotMatch(
  authShellSource,
  /function GoogleIcon\(\)[\s\S]*<svg/,
  'The shared auth controls should not hand-author the Google SVG',
);
assert.doesNotMatch(
  authShellSource,
  /\bGoogleIcon\b/,
  'Google auth should not substitute the Figma asset with the HugeIcons Google glyph',
);
assert.match(
  authShellSource,
  /<img\s+src="\/figma\/onboarding\/google-black-icon\.svg"\s+aria-hidden="true"\s+width=\{16\}\s+height=\{16\}/,
  'The shared GoogleAuthButton should render the exact 16px Figma asset as decorative content',
);
assert.ok(existsSync(googleIconPath), 'The exact Figma Google icon export should be stored locally');
assert.ok(existsSync(googleManifestPath), 'The exact Figma Google icon export should have provenance metadata');
const googleAsset = readFileSync(googleIconPath);
const googleManifest = JSON.parse(readFileSync(googleManifestPath, 'utf8'));
assert.equal(googleAsset.byteLength, 1110, 'The downloaded Figma Google icon should preserve its 1110-byte export');
assert.equal(
  googleManifest.source,
  'Figma file aa8qReawBBhHIXDAbS18OP, register node 865:3751, icon node 865:3831',
  'The asset manifest should identify the exact Figma provenance',
);
assert.deepEqual(googleManifest.assets, [
  {
    file: 'google-black-icon.svg',
    name: 'google-black-icon 1',
    nodeId: '865:3831',
    bytes: 1110,
    width: 16,
    height: 16,
    sha256: 'a39aa1cc28763a031b3f65822ec400d736b7e19b5db8b6970c8e71c9d436e932',
  },
]);
assert.equal(
  createHash('sha256').update(googleAsset).digest('hex'),
  googleManifest.assets[0].sha256,
  'The stored Google icon should match its recorded Figma export hash',
);

for (const storyName of [
  'DesktopGradeEmpty1440',
  'DesktopGradeSelected1440',
  'DesktopUsernameEmpty1440',
  'DesktopUsernameValid1440',
]) {
  assert.match(onboardingStoriesSource, new RegExp(`export const ${storyName}`));
}
for (const storyName of ['DesktopRegisterEmpty1440', 'DesktopRegisterFilled1440']) {
  assert.match(registerStoriesSource, new RegExp(`export const ${storyName}`));
}
assert.ok(existsSync(visualHarnessPath), 'A focused 1440x1080 desktop visual harness should exist');
const visualHarnessSource = existsSync(visualHarnessPath)
  ? readFileSync(visualHarnessPath, 'utf8')
  : '';
assert.equal(
  (visualHarnessSource.match(/nodeId:/g) ?? []).length,
  6,
  'The desktop visual harness should retain exactly the six supplied Figma reference states',
);
assert.match(visualHarnessSource, /width: 1440, height: 1080/);
assert.match(visualHarnessSource, /width: 1440, height: 720/);
assert.match(
  visualHarnessSource,
  /state: 'verify-empty'[\s\S]*storyId: 'pages-register--verify-empty-430'/,
  'The 720px profile should include the registration verification card',
);
assert.match(visualHarnessSource, /desktop-onboarding-sidebar/);
assert.match(visualHarnessSource, /desktop-onboarding-card/);
for (const width of [1024, 1280, 1366, 1439]) {
  assert.match(
    visualHarnessSource,
    new RegExp(`width: ${width}`),
    `The desktop visual harness should probe the ${width}px sub-reference fallback`,
  );
}
for (const state of ['grade-fallback', 'username-fallback', 'register-fallback']) {
  assert.match(
    visualHarnessSource,
    new RegExp(`state: '${state}'`),
    `The desktop visual harness should probe the ${state} intermediate-width state`,
  );
}

console.log('Desktop onboarding six-state source contract passed');
