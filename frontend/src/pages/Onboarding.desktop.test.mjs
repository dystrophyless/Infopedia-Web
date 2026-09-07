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
  /desktopOnboarding \? 'lg:flex-row lg:bg-\[#efebf6\]' : ''/,
  'Desktop onboarding should use one adaptive row from the 1024px desktop breakpoint',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-sidebar"[\s\S]*lg:min-h-screen[\s\S]*lg:w-\[clamp\(280px,33\.333vw,480px\)\][\s\S]*lg:border-\[#ded2f1\][\s\S]*lg:px-\[clamp\(32px,4\.444vw,64px\)\][\s\S]*lg:py-8/,
  'Desktop onboarding sidebar should fluidly scale up to its 480px reference rail',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-logo"[\s\S]*lg:h-\[44px\][\s\S]*lg:w-\[171px\]/,
  'Desktop onboarding logo should preserve the 171x44 Figma geometry',
);
assert.match(
  authShellSource,
  /data-testid="desktop-onboarding-stepper"[\s\S]*gap-16[\s\S]*w-\[2px\][\s\S]*size-12/,
  'Desktop onboarding stepper should use 64px row gaps, a 2px connector, and 48px circles',
);
assert.match(
  authShellSource,
  /'desktop-onboarding-main'[\s\S]*lg:min-h-screen[\s\S]*lg:min-w-0[\s\S]*lg:flex-1[\s\S]*lg:bg-\[#efebf6\]/,
  'Desktop onboarding main region should shrink safely beside the adaptive sidebar',
);
assert.match(
  authShellSource,
  /'desktop-onboarding-card'[\s\S]*lg:w-\[min\(480px,100%\)\][\s\S]*lg:rounded-\[16px\][\s\S]*lg:p-\[clamp\(32px,3\.333vw,48px\)\]/,
  'Desktop onboarding card should retain its 480px maximum while staying fluid at intermediate widths',
);
assert.match(
  authShellSource,
  /desktopOnboarding \? 'hidden' : 'flex max-lg:hidden'/,
  'Onboarding should not retain a separate intermediate-width header fallback',
);

assert.match(onboardingSource, /desktopFlowStep=\{step === 'grade' \? 1 : 2\}/);
assert.match(registerSource, /desktopFlowStep=\{3\}/);
assert.match(
  loginSource,
  /<GoogleAuthButton onClick=\{handleGoogleAuth\}(?: desktopVisual="onboarding")?>/,
  'Login should keep using the shared GoogleAuthButton and its exact Figma asset',
);
assert.match(loginSource, /desktopLayout="centered-card"/, 'Login should opt into the standalone centered desktop card');
assert.doesNotMatch(loginSource, /desktopFlowStep=\{3\}/, 'Login should not activate the onboarding sidebar');
assert.match(loginSource, /desktopContentWidth="narrow"/, 'Login should use the narrow registration content width');
assert.match(loginSource, /desktopVisual="onboarding"/, 'Login controls should use the onboarding desktop visual');
assert.match(loginSource, /<AuthSubmit[\s\S]*mobileVisual="figma-auth"[\s\S]*desktopVisual="onboarding"/, 'Login submit should use responsive onboarding visuals');
assert.match(loginSource, /<AuthDivider label=\{t\('auth\.or'\)\} desktopVisual="onboarding" \/>/, 'Login divider should use onboarding desktop visual');
assert.match(loginSource, /<GoogleAuthButton onClick=\{handleGoogleAuth\} desktopVisual="onboarding">/, 'Login Google action should use onboarding desktop visual');
assert.match(loginSource, /to="\/onboarding"/, 'Login footer should navigate to onboarding');
assert.doesNotMatch(loginSource, /to="\/register"/, 'Login should not retain the legacy registration footer route');
assert.match(
  onboardingSource,
  /<div className="hidden lg:block">[\s\S]*data-onboarding-indicator="desktop"/,
  'Desktop grade rows should expose circular radios only in the desktop branch',
);
assert.doesNotMatch(
  onboardingSource,
  /Backpack02Icon|GraduationCapIcon|AnonymousIcon|icon=\{icon\}/,
  'Desktop grade rows must not render leading grade-specific glyphs',
);
assert.match(
  onboardingSource,
  /<div className="block lg:hidden">[\s\S]*data-onboarding-indicator="mobile"[\s\S]*<div className="hidden lg:block">[\s\S]*data-onboarding-indicator="desktop"/,
  'Grade indicators should expose breakpoint-exclusive mobile and desktop anatomy',
);
assert.match(
  onboardingSource,
  /lg:text-\[16px\][\s\S]*lg:text-\[#8c8698\]/,
  'Onboarding helper typography should remain readable across desktop widths',
);
assert.match(
  onboardingSource,
  /max-md:hidden lg:hidden/,
  'The username Back control should remain breakpoint-exclusive without a fallback branch',
);
assert.match(
  onboardingSource,
  /lg:justify-between[\s\S]*lg:bg-\[#f8f5fc\]/,
  'Desktop grade row layout and surface should activate at the desktop breakpoint',
);
assert.doesNotMatch(authShellSource, /min-\[1440px\]|fallback/, 'AuthShell must not retain an intermediate-width fallback');
assert.doesNotMatch(onboardingSource, /min-\[1440px\]|aria-pressed/, 'Onboarding must not retain legacy breakpoint or button-toggle branches');
assert.match(onboardingSource, /function GradeOptionRadio\(/, 'Grade choices should be named for their native radio presentation');
assert.doesNotMatch(onboardingSource, /GradeOptionButton/, 'Onboarding should not retain the obsolete button-named grade helper');
assert.match(onboardingSource, /type="radio"[\s\S]*name="onboarding-grade"[\s\S]*value=\{grade\}/, 'Grade choices must use controlled native radio inputs');
assert.match(onboardingSource, /const mobileId = `onboarding-grade-mobile-\$\{grade\}`;[\s\S]*const desktopId = `onboarding-grade-desktop-\$\{grade\}`;[\s\S]*id=\{mobileId\}[\s\S]*id=\{desktopId\}/, 'Mobile and desktop radios must have unique ids');
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
assert.equal(googleAsset.byteLength, 1120, 'The downloaded Figma Google icon should preserve its 1120-byte export');
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
    bytes: 1120,
    width: 16,
    height: 16,
    sha256: '6ca7577dac5451e102ef2df282ecb999e55e9c4a6f3568d64b2e466b8487ed59',
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
assert.doesNotMatch(visualHarnessSource, /fallback|aria-pressed|responsiveProfiles|responsiveReferences/);

console.log('Desktop onboarding six-state source contract passed');
