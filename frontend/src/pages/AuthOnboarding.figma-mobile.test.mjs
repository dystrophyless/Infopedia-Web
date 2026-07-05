import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const componentsDir = path.resolve(srcDir, 'components');

const authShellSource = readFileSync(path.resolve(componentsDir, 'AuthShell.tsx'), 'utf8');
const onboardingSource = readFileSync(path.resolve(pagesDir, 'Onboarding.tsx'), 'utf8');
const registerSource = readFileSync(path.resolve(pagesDir, 'Register.tsx'), 'utf8');
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
  /<header className="[^"]*lg:hidden[\s\S]*AuthMobileStatusBar[\s\S]*\/logo\.svg[\s\S]*AuthMobileLanguageToggle/,
  'AuthShell should render the Figma-style mobile logo and language control header',
);

assert.match(
  authShellSource,
  /useLangStore[\s\S]*setLang\(nextLang\)[\s\S]*lang\.toUpperCase\(\)/,
  'AuthShell mobile language control should use the persisted language store',
);

assert.match(
  authShellSource,
  /h-\[112px\][\s\S]*className="absolute top-16 left-1\/2[\s\S]*h-px w-full bg-\[#eae9ec\]/,
  'AuthShell mobile header should match the Figma 112px prototype header and 64px logo offset',
);

assert.match(
  authShellSource,
  /max-lg:pt-\[65px\]/,
  'AuthShell mobile content should start at the Figma 177px title offset',
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

assert.match(
  authShellSource,
  /max-lg:h-12[\s\S]*max-lg:mt-8[\s\S]*max-lg:rounded-\[8px\][\s\S]*max-lg:bg-\[#44237d\]/,
  'Auth primary buttons should use the 48px Figma size and 32px top gap',
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
  /AuthShell title=\{step === 'grade' \? t\('onboarding\.gradeQuestionTitle'\) : t\('onboarding\.usernameQuestionTitle'\)\}/,
  'Onboarding shell title should switch to the Figma grade and username titles',
);

assert.match(
  onboardingSource,
  /onClick=\{\(\) => \{\s*setGrade\(option\);[\s\S]*\}\}/,
  'Grade option taps should select a grade without advancing the flow',
);

assert.match(
  onboardingSource,
  /<form onSubmit=\{handleGradeSubmit\}[\s\S]*<AuthSubmit loading=\{loading\} disabled=\{!grade\}>[\s\S]*t\('common\.continue'\)/,
  'Grade step should advance with the separate Figma continue button',
);

for (const iconName of ['Backpack02Icon', 'GraduationCapIcon', 'AnonymousIcon']) {
  assert.match(
    onboardingSource,
    new RegExp(iconName),
    `Grade options should include ${iconName} from the Figma design`,
  );
}

assert.doesNotMatch(
  onboardingSource,
  /\bCapIcon\b|GraduationHatIcon|function GraduationHatIcon|<svg/,
  'Grade options must use HugeIcons exports, not a generic cap or custom inline SVG',
);

assert.match(
  onboardingSource,
  /className=\{`flex h-12 w-full items-center gap-4 rounded-\[8px\] bg-white px-6/,
  'Grade options should match the Figma 48px control, 24px left inset, and 16px icon/text gap',
);

assert.doesNotMatch(
  onboardingSource,
  /ring-2|Tick02Icon/,
  'Grade option selected state should not add non-Figma rings or trailing check icons',
);

assert.match(
  registerSource,
  /t\('auth\.verifyHelperShort'\)/,
  'Verify email should use the short Figma helper copy',
);

assert.match(
  registerSource,
  /max-lg:flex max-lg:gap-\[8px\][\s\S]*max-lg:h-\[60px\][\s\S]*max-lg:w-\[54\.297px\][\s\S]*max-lg:rounded-\[16px\]/,
  'Verification code cells should match the fixed Figma 6-cell mobile size and radius',
);

assert.match(
  registerSource,
  /<label className="mb-4 block[\s\S]*max-lg:mb-0/,
  'Verification code wrapper should remove mobile bottom margin so the submit button lands at the Figma 349px offset',
);

assert.doesNotMatch(
  registerSource,
  /setNotice\(t\('auth\.(?:codeSent|codeResent)'\)\)/,
  'Verify email should not insert a success notice between the code cells and submit button in the Figma mobile layout',
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
