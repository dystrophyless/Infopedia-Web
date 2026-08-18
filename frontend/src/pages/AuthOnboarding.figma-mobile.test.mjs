import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');

const authShellSource = readFileSync(path.resolve(componentsDir, 'AuthShell.tsx'), 'utf8');
const onboardingSource = readFileSync(path.resolve(pagesDir, 'Onboarding.tsx'), 'utf8');
const registerSource = readFileSync(path.resolve(pagesDir, 'Register.tsx'), 'utf8');
const onboardingStoriesSource = readFileSync(path.resolve(pagesDir, 'Onboarding.stories.tsx'), 'utf8');
const registerStoriesSource = readFileSync(path.resolve(pagesDir, 'Register.stories.tsx'), 'utf8');
const visualRunnerSource = readFileSync(path.resolve(pagesDir, 'Onboarding.grade.visual.mjs'), 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

assert.match(
  authShellSource,
  /max-lg:bg-\[#efebf6\]/,
  'AuthShell mobile background should match the Figma onboarding surface',
);

assert.match(
  authShellSource,
  /<header className="[^\"]*lg:hidden[\s\S]*\/logo\.svg[\s\S]*AuthMobileLanguageToggle[\s\S]*h-px w-full bg-\[#eae9ec\]/,
  'AuthShell should render the Figma-style mobile logo, language control, and divider header',
);

assert.doesNotMatch(
  authShellSource,
  new RegExp(`${['AuthMobile', 'StatusBar'].join('')}|${['20', '31'].join(':')}`),
  'AuthShell should not render a simulated mobile status bar',
);

assert.match(
  authShellSource,
  /useLangStore[\s\S]*setLang\(nextLang\)[\s\S]*lang\.toUpperCase\(\)/,
  'AuthShell mobile language control should use the persisted language store',
);

assert.match(
  authShellSource,
  /mobileHeaderMode === 'status-aware' \? 'h-\[112px\]' : 'h-16'[\s\S]*status-aware' \? 'top-16' : 'top-4'[\s\S]*right-8[\s\S]*status-aware' \? 'top-16' : 'top-4'[\s\S]*h-px w-full bg-\[#eae9ec\]/,
  'AuthShell mobile header should use the 64px height and 16px logo/language offsets',
);

assert.match(
  authShellSource,
  /mobileHeaderMode\?: 'compact' \| 'status-aware'/,
  'AuthShell should expose a backward-compatible status-aware mobile header mode',
);

assert.match(
  authShellSource,
  /status-aware[\s\S]*h-\[112px\]/,
  'Status-aware mobile header should reserve the Figma 112px surface',
);

assert.match(
  authShellSource,
  /max-lg:pt-\[65px\]/,
  'AuthShell mobile content should start at the Figma 129px title offset (64px header + 65px padding)',
);

assert.match(
  authShellSource,
  /max-lg:w-full max-lg:max-w-\[366px\]/,
  'AuthShell mobile content rail should match the 366px Figma column and top offset',
);

assert.match(
  authShellSource,
  /max-lg:text-\[24px\][\s\S]*max-lg:text-\[#161519\]/,
  'AuthShell mobile title type should match the Figma onboarding heading',
);

assert.match(authShellSource, /mobileProgress\?: \{ step: 1 \| 2 \| 3; completedSegments: 0 \| 1 \| 2 \| 3 \}/,
  'AuthShell should expose the mobile onboarding progress contract');
assert.match(authShellSource, /data-testid="mobile-onboarding-progress"[\s\S]*h-\[8px\][\s\S]*w-\[366px\][\s\S]*gap-\[4px\]/,
  'Mobile progress should match the 366x8 segmented Figma rail');
assert.match(authShellSource, /Шаг \{mobileProgress\.step\} из 3/,
  'Mobile progress should render the localized step label');

assert.match(
  authShellSource,
  /max-lg:h-12[\s\S]*max-lg:mt-6[\s\S]*max-lg:rounded-\[8px\][\s\S]*max-lg:bg-\[#44237d\]/,
  'Auth primary buttons should use the 48px Figma size and 24px top gap',
);

assert.match(
  authShellSource,
  /max-lg:h-12[\s\S]*max-lg:rounded-\[8px\][\s\S]*max-lg:bg-white/,
  'Auth fields should use the 48px white Figma controls',
);

assert.match(
  authShellSource,
  /max-lg:placeholder:text-\[#c5b1e7\]/,
  'Auth inputs should use the Figma mobile placeholder color',
);

assert.match(
  onboardingSource,
  /<AuthShell[\s\S]*title=\{step === 'grade' \? t\('onboarding\.gradeQuestionTitle'\) : t\('onboarding\.usernameQuestionTitle'\)\}[\s\S]*mobileHeaderMode="status-aware"/,
  'Both onboarding steps should opt into the shared Figma status-aware header',
);
assert.match(onboardingSource, /mobileProgress=\{\{[\s\S]*step: step === 'grade' \? 1 : 2[\s\S]*completedSegments:/,
  'Onboarding should derive mobile progress from grade and username completion');
assert.match(onboardingSource, /const gradeOptions: SelectableGrade\[\] = \['11', '10', 'undefined'\]/,
  'Mobile grade options should follow the Figma 11/10/Other order');

assert.match(
  onboardingSource,
  /onClick=\{\(\) => \{\s*setGrade\(option\);[\s\S]*\}\}/,
  'Grade option taps should select a grade without advancing the flow',
);

assert.match(
  onboardingSource,
  /<form onSubmit=\{handleGradeSubmit\}[\s\S]*<AuthSubmit[\s\S]*loading=\{loading\}[\s\S]*disabled=\{!grade\}[\s\S]*t\('common\.continue'\)/,
  'Grade step should advance with the separate Figma continue button',
);

assert.match(
  onboardingSource,
  /handleGradeSubmit[\s\S]*<p className="mb-6[^\"]*max-md:mb-7/,
  'Grade supporting copy should reserve the extra 8px needed for Figma options y257 and CTA y449',
);

assert.doesNotMatch(
  onboardingSource,
  /Backpack02Icon|GraduationCapIcon|AnonymousIcon|icon=\{icon\}/,
  'Grade options must not render leading grade-specific glyphs at any breakpoint',
);

assert.doesNotMatch(
  onboardingSource,
  /\bCapIcon\b|GraduationHatIcon|function GraduationHatIcon|<svg/,
  'Grade options must use HugeIcons exports, not a generic cap or custom inline SVG',
);

assert.match(
  onboardingSource,
  /className=\{`relative flex h-12 w-full items-center justify-start rounded-\[8px\] bg-white px-6/,
  'Grade options should match the Figma 48px control and 24px left inset',
);

assert.match(
  onboardingSource,
  /Tick02Icon/,
  'Grade option selected state should use the HugeIcons Tick02Icon badge',
);

assert.match(
  onboardingSource,
  /data-onboarding-indicator="mobile"[\s\S]*min-\[1440px\]:hidden[\s\S]*!border-\[#6a37c3\]/,
  'Mobile grade indicators should expose explicit anatomy and keep the selected purple border above the base lavender border',
);
assert.match(
  onboardingSource,
  /data-onboarding-indicator="desktop"[\s\S]*min-\[1440px\]:block|data-onboarding-indicator="desktop"[\s\S]*min-\[1440px\]:flex/,
  'Desktop grade indicators should expose explicit anatomy for breakpoint-specific visual checks',
);

assert.match(
  onboardingSource,
  /selected[\s\S]*border-transparent[\s\S]*rounded-\[4px\][\s\S]*border-\[1\.5px\][\s\S]*border-\[#c5b1e7\]/,
  'Grade rows should stay borderless while their square indicators use a 1.5px lavender border',
);

assert.match(
  onboardingSource,
  /status-aware/,
  'Grade step should opt into the status-aware mobile header',
);

assert.match(
  onboardingSource,
  /<AuthSubmit[\s\S]*disabled=\{!grade\}[\s\S]*mobileVisual="figma-auth"[\s\S]*t\('common\.continue'\)/,
  'Grade CTA should use the shared 48px onboarding primary action in every state',
);

assert.match(
  onboardingSource,
  /<AuthUsernameInput[\s\S]*mobileFieldLayout="figma-auth"[\s\S]*desktopShowSuccessIcon=\{usernameHelperTone === 'success'\}/,
  'Username should keep the UserIcon and opt into exact visible-message spacing',
);

assert.match(
  authShellSource,
  /messageClassName=\{!error && desktopShowSuccessIcon \? 'max-lg:hidden min-\[1440px\]:hidden' : undefined\}/,
  'Valid username helper copy must be hidden while preserving checking and error messages',
);

assert.match(
  onboardingSource,
  /max-md:mb-6[\s\S]*usernameQuestionHelper/,
  'Username helper should leave the exact 24px mobile gap before the y269 field',
);

assert.match(
  onboardingSource,
  /<AuthSubmit[\s\S]*disabled=\{!usernameCanSubmit\}[\s\S]*mobileVisual="figma-auth"/,
  'Username CTA should use the shared 48px primary action in enabled, disabled, and loading states',
);

assert.match(
  authShellSource,
  /type MobileFieldLayout = 'default' \| 'figma-auth'[\s\S]*mobileFieldLayout\?: MobileFieldLayout[\s\S]*max-lg:mb-0 max-lg:gap-2/,
  'Auth fields should expose a backward-compatible opt-in 8px message layout with no trailing mobile margin',
);

assert.match(
  authShellSource,
  /hideMobileLeadingIconWhenFilled = false[\s\S]*hideMobileLeadingIconWhenFilled && value[\s\S]*max-lg:hidden/,
  'Auth field leading icons should use a backward-compatible opt-in mobile visibility contract',
);

assert.match(
  registerSource,
  /<AuthShell[\s\S]*mobileHeaderMode="status-aware"/,
  'Register and verify states should use the shared status-aware header',
);
assert.match(registerSource, /mobileProgress=\{step === 'account' \? \{ step: 3, completedSegments: accountCanSubmit \? 3 : 2 \} : undefined\}/,
  'Register account should expose completion-aware mobile progress while verify stays progress-free');

assert.equal(
  (registerSource.match(/max-lg:mb-7/g) ?? []).length,
  2,
  'Register and verify helpers should leave 28px before their y257 controls',
);

assert.match(
  registerSource,
  /<AuthEmailInput[\s\S]*hideMobileLeadingIconWhenFilled[\s\S]*<AuthPasswordInput[\s\S]*hideMobileLeadingIconWhenFilled/,
  'Register should hide only filled mobile leading icons while preserving the password view control',
);

assert.match(
  registerSource,
  /accountCanSubmit[\s\S]*<AuthSubmit[\s\S]*disabled=\{!accountCanSubmit\}[\s\S]*mobileVisual="figma-auth"/,
  'Register CTA should stay disabled until the account fields are valid',
);

assert.match(
  registerSource,
  /isValidRegistrationEmail\(email\)[\s\S]*!getPasswordValidationError\(password, t\)/,
  'Register CTA should require a syntactically valid email and the existing valid-password rule',
);

assert.match(
  registerSource,
  /const normalizedEmail = email\.trim\(\)\.toLowerCase\(\)[\s\S]*!isValidRegistrationEmail\(normalizedEmail\)[\s\S]*setAccountFieldErrors\(nextErrors\)[\s\S]*return;[\s\S]*await startRegistration/,
  'Account submission should reject malformed email before the registration API boundary',
);

assert.match(
  authShellSource,
  /mobileVisual\?: 'default' \| 'figma-auth'[\s\S]*max-lg:h-12[\s\S]*bg-\[#ded2f1\][\s\S]*max-lg:h-12[\s\S]*bg-\[#6a37c3\]/,
  'Opt-in auth CTA styling should preserve default consumers and stay 48px in every state',
);

assert.match(
  registerSource,
  /<AuthEmailInput[\s\S]*mobileFieldLayout="figma-auth"[\s\S]*<AuthPasswordInput[\s\S]*mobileFieldLayout="figma-auth"[\s\S]*<AuthSubmit[\s\S]*mobileVisual="figma-auth"/,
  'Register fields and CTA should share the exact opt-in message and action spacing contract',
);

assert.match(
  registerSource,
  /t\('auth\.verifyHelperShort'\)/,
  'Verify email should use the short Figma helper copy',
);

assert.match(
  registerSource,
  /grid-cols-\[repeat\(6,minmax\(0,1fr\)\)\][\s\S]*gap-\[8px\][\s\S]*h-\[60px\][\s\S]*w-full[\s\S]*rounded-\[16px\]/,
  'Verification code should use six native inputs in the exact responsive Figma grid',
);

assert.match(
  registerSource,
  /max-lg:text-\[24px\][\s\S]*max-lg:text-black/,
  'Filled OTP digits should use the exact black Figma text on mobile',
);

assert.match(
  registerSource,
  /<VerificationCodeInput[\s\S]*describedBy=\{error \? VERIFICATION_MESSAGE_ID : undefined\}/,
  'Verification code inputs should be described by the visible verification message only',
);

assert.doesNotMatch(
  registerSource,
  /setNotice\(t\('auth\.(?:codeSent|codeResent)'\)\)/,
  'Verify email should not insert a success notice between the code cells and submit button in the Figma mobile layout',
);

assert.doesNotMatch(
  registerSource,
  /lastAutoSubmittedCode|void submitVerification\(code\)/,
  'A filled OTP should remain stable until the explicit verify CTA is submitted',
);

assert.match(
  registerSource,
  /<AuthSubmit[\s\S]*disabled=\{!\/\^\\d\{6\}\$\/\.test\(code\)\}[\s\S]*mobileVisual="figma-auth"[\s\S]*t\('auth\.verifyButton'\)/,
  'Verify CTA should be disabled until all six native OTP inputs are filled',
);

assert.match(
  registerSource,
  /handleCodeSubmit[\s\S]*await submitVerification\(normalizedCode\)/,
  'Explicit verify submission should preserve the existing verifyEmail payload path',
);

assert.match(
  registerSource,
  /resendSeconds > 0[\s\S]*lg:hidden[\s\S]*t\('auth\.resendCode'\)[\s\S]*max-lg:hidden[\s\S]*t\('auth\.resendIn'/,
  'Mobile verify should keep the exact Figma resend copy while preserving the desktop cooldown countdown',
);

assert.match(
  registerSource,
  /aria-describedby=\{describedBy\}/,
  'All six native OTP inputs should share the stable visible-message description',
);

assert.match(
  registerSource,
  /handleCodeChange[\s\S]*setCode\(normalizedCode\)[\s\S]*setError\(null\)/,
  'Editing the OTP should clear stale verification feedback',
);

assert.match(
  registerSource,
  /max-lg:!text-\[#a585db\][\s\S]*max-lg:disabled:!text-\[#a585db\]/,
  'Visible mobile resend text should remain #A585DB during cooldown and loading',
);

assert.match(
  registerSource,
  /<FormMessage[\s\S]*id=\{VERIFICATION_MESSAGE_ID\}[\s\S]*<AuthSubmit/,
  'The visible OTP message should remain directly between the group and primary CTA',
);

for (const storyName of [
  'GradeError430',
  'UsernameValidationError430',
  'UsernameRequestError430',
]) {
  assert.match(onboardingStoriesSource, new RegExp(`export const ${storyName}`));
}
assert.match(
  onboardingStoriesSource,
  /const previousApiGet = apiClient\.get[\s\S]*apiClient\.get = previousApiGet/,
  'Onboarding stories should restore the exact API method after every mocked state',
);

for (const storyName of ['RegisterErrors430', 'RegisterRequestError430', 'VerifyError430']) {
  assert.match(registerStoriesSource, new RegExp(`export const ${storyName}`));
}
assert.match(
  registerStoriesSource,
  /const previousApiPost = apiClient\.post[\s\S]*apiClient\.post = previousApiPost/,
  'Register stories should restore the exact API method after every mocked state',
);

assert.equal(
  (visualRunnerSource.match(/\{ state: '[^']+', storyId:/g) ?? []).length,
  14,
  'Visual verification should retain the original eight states and add six visible-message states',
);
for (const spacingAssertion of [
  'options to message gap',
  'username input to message gap',
  'last register field/message to CTA gap',
  'OTP group to message gap',
]) {
  assert.match(visualRunnerSource, new RegExp(spacingAssertion.replace('/', '\\/')));
}
assert.match(
  visualRunnerSource,
  /primary CTA should remain 48px[\s\S]*rgb\(165, 133, 219\)/,
  'Visual verification should measure uniform CTA height and the final resend computed color',
);

for (const key of [
  'gradeQuestionTitle',
  'gradeQuestionHelper',
  'usernameQuestionTitle',
  'usernameQuestionHelper',
]) {
  assert.ok(ruLocale.onboarding[key], `RU locale should define onboarding.${key}`);
  assert.ok(kkLocale.onboarding[key], `KK locale should define onboarding.${key}`);
}

assert.ok(ruLocale.auth.verifyHelperShort, 'RU locale should define auth.verifyHelperShort');
assert.ok(kkLocale.auth.verifyHelperShort, 'KK locale should define auth.verifyHelperShort');
