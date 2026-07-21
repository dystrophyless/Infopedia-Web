import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const profileSource = readFileSync(path.resolve(pagesDir, 'Profile.tsx'), 'utf8');
const ruLocale = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'));
const kkLocale = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'));
const mobileHomeSource = profileSource.slice(
  profileSource.indexOf('function MobileProfileHome('),
  profileSource.indexOf('function MobileProfileStat('),
);
const premiumSource = mobileHomeSource.slice(
  mobileHomeSource.indexOf('mobilePremiumAsset'),
  mobileHomeSource.indexOf('mobileActionsLabel'),
);
const statSource = profileSource.slice(
  profileSource.indexOf('function MobileProfileStat('),
  profileSource.indexOf('function MobileProfileAction('),
);
const actionSource = profileSource.slice(
  profileSource.indexOf('function MobileProfileAction('),
  profileSource.indexOf('function MobileProfileDetail('),
);
const mobileDetailSource = profileSource.slice(
  profileSource.indexOf('function MobileProfileDetail('),
  profileSource.indexOf('function ProfileOverview('),
);
const mobileSettingsSource = profileSource.slice(
  profileSource.indexOf('function MobileSettingsHome('),
  profileSource.indexOf('function MobileAccount('),
);
const mobileAccountSource = profileSource.slice(
  profileSource.indexOf('function MobileAccount('),
  profileSource.indexOf('function MobileEmail('),
);
const mobileEmailSource = profileSource.slice(
  profileSource.indexOf('function MobileEmail('),
  profileSource.indexOf('function MobileProfileDetail('),
);
const mobileSettingsRowsSource = mobileSettingsSource.slice(
  mobileSettingsSource.indexOf('aria-label={t(\'profile.mobileSettingsListLabel\')'),
);

assert.match(profileSource, /max-md:hidden/);
assert.match(profileSource, /md:hidden[\s\S]*<MobileProfileDashboard/);
assert.match(profileSource, /function MobileProfileDashboard\([\s\S]*function MobileProfileHome\(/);
assert.match(mobileHomeSource, /data-figma-node="168:2074"/);
assert.match(mobileHomeSource, /bg-\[#efebf6\][\s\S]*px-\[24px\][\s\S]*pt-\[80px\]/);
assert.match(mobileHomeSource, /mt-10[\s\S]*rounded-\[8px\] bg-white p-6/);
assert.match(mobileHomeSource, /size-\[40px\][\s\S]*rounded-\[8px\] bg-white/);
assert.match(mobileHomeSource, /size-\[64px\][\s\S]*shrink-0/);
assert.match(statSource, /rounded-\[4px\] bg-\[#efeaf8\] px-4 py-2/);
assert.match(mobileHomeSource, /bg-\[#ded2f1\][\s\S]*px-6 py-4/);
assert.match(mobileHomeSource, /mobilePremiumAsset[\s\S]*size-\[32px\]/);
assert.match(mobileHomeSource, /bg-white px-6 py-4/);
assert.match(actionSource, /size-\[40px\][\s\S]*bg-\[#efeaf8\][\s\S]*size=\{24\}/);
assert.match(actionSource, /size=\{24\}[\s\S]*text-\[#252329\]/);
assert.doesNotMatch(mobileHomeSource, /profileNavItems|nav\.map\(/);
assert.doesNotMatch(mobileHomeSource, /MobileBottomNav/);

assert.match(profileSource, /import mobileProfileAsset from ['"]\.\.\/assets\/figma-profile\/profile-1\.svg['"]/);
assert.match(profileSource, /import mobilePremiumAsset from ['"]\.\.\/assets\/figma-profile\/ai-co-editing\.svg['"]/);
assert.doesNotMatch(profileSource, /figma\.com\/api\/mcp\/asset/);
assert.ok(existsSync(path.resolve(srcDir, 'assets/figma-profile/profile-1.svg')));
assert.ok(existsSync(path.resolve(srcDir, 'assets/figma-profile/ai-co-editing.svg')));

assert.match(profileSource, /export const MOBILE_PROFILE_DESIGN_SAMPLE_STATS[\s\S]*terms: 24[\s\S]*points: 38/);
assert.match(profileSource, /Display-only Figma samples[\s\S]*User\/API expose no profile stats/);
assert.match(mobileHomeSource, /MOBILE_PROFILE_DESIGN_SAMPLE_STATS\.terms/);
assert.match(mobileHomeSource, /MOBILE_PROFILE_DESIGN_SAMPLE_STATS\.points/);

assert.match(mobileHomeSource, /lang === 'kk' \? 'KZ' : 'RU'/);
assert.match(profileSource, /import \{ BottomSheet \} from ['"]\.\.\/ui\/molecules\/BottomSheet['"]/);
assert.match(mobileHomeSource, /const \[isLanguageSheetOpen, setIsLanguageSheetOpen\] = useState\(false\)/);
assert.match(mobileHomeSource, /const pendingLanguageRef = useRef<Language \| null>\(null\)/);
assert.match(mobileHomeSource, /const languageSheetTitleId = useId\(\)/);
assert.match(mobileHomeSource, /onClick=\{openLanguageSheet\}[\s\S]*aria-haspopup="dialog"[\s\S]*aria-expanded=\{isLanguageSheetOpen\}/);
assert.match(
  mobileHomeSource,
  /const languageOptions:[\s\S]*\{ value: 'kk', labelKey: 'common\.kazakh' \}[\s\S]*\{ value: 'ru', labelKey: 'common\.russian' \}/,
);
assert.match(
  mobileHomeSource,
  /function handleLanguageSelect\(value: Language\) \{\s*pendingLanguageRef\.current = value;\s*setIsLanguageSheetOpen\(false\);\s*\}/,
);
assert.match(
  mobileHomeSource,
  /function handleLanguageSheetAfterClose\(\) \{[\s\S]*const pendingLanguage = pendingLanguageRef\.current;[\s\S]*pendingLanguageRef\.current = null;[\s\S]*if \(pendingLanguage !== null\) setLang\(pendingLanguage\);[\s\S]*\}/,
);
assert.match(
  mobileHomeSource,
  /function handleLanguageDismiss\(\) \{\s*pendingLanguageRef\.current = null;\s*setIsLanguageSheetOpen\(false\);\s*\}/,
);
assert.doesNotMatch(
  mobileHomeSource,
  /function handleLanguageSelect\(value: Language\) \{\s*setLang\(/,
);
assert.match(
  mobileHomeSource,
  /<BottomSheet[\s\S]*open=\{isLanguageSheetOpen\}[\s\S]*onDismiss=\{handleLanguageDismiss\}[\s\S]*onAfterClose=\{handleLanguageSheetAfterClose\}[\s\S]*titleId=\{languageSheetTitleId\}/,
);
assert.match(mobileHomeSource, /h-\[320px\][\s\S]*rounded-t-\[32px\][\s\S]*bg-white[\s\S]*px-6[\s\S]*py-2[\s\S]*shadow-none/);
assert.match(mobileHomeSource, /!bg-\[rgba\(22,21,25,0\.25\)\]/);
assert.match(mobileHomeSource, /data-bottom-sheet-handle\]\]:mb-4/);
assert.match(
  mobileHomeSource,
  /<h2 id=\{languageSheetTitleId\} className="text-center text-\[20px\] font-normal leading-\[20px\] text-\[#6a37c3\]">[\s\S]*t\('common\.language'\)/,
);
assert.match(mobileHomeSource, /<fieldset className="mt-8 flex flex-col gap-4 border-0 p-0" aria-labelledby=\{languageSheetTitleId\}>/);
assert.match(
  mobileHomeSource,
  /<input[\s\S]*type="radio"[\s\S]*name="mobile-profile-language"[\s\S]*checked=\{selected\}[\s\S]*onChange=\{\(\) => handleLanguageSelect\(option\.value\)\}/,
);
assert.match(mobileHomeSource, /onClick=\{\(\) => \{\s*if \(selected\) handleLanguageSelect\(option\.value\);\s*\}\}/);
assert.match(mobileHomeSource, /className="peer sr-only"/);
assert.match(mobileHomeSource, /peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-\[#6a37c3\]/);
assert.doesNotMatch(mobileHomeSource, /role="radio"|aria-checked/);
assert.match(mobileHomeSource, /bg-\[#6a37c3\] text-white[\s\S]*Tick02Icon/);
assert.match(mobileHomeSource, /border-2 border-\[#8c8698\]/);
assert.match(mobileHomeSource, /bg-\[#f6f5f7\]/);
assert.match(mobileHomeSource, /onSelectTab\('settings'\)/);
assert.match(mobileHomeSource, /onSelectTab\('favorites'\)/);
assert.match(mobileHomeSource, /onSelectTab\('weakTopics'\)/);
assert.match(profileSource, /onBack=\{\(\) => onSelectTab\('profile'\)\}/);
assert.match(
  profileSource,
  /const \[settingsView, setSettingsView\] = useState<'home' \| 'account' \| 'email'>\('home'\)/,
);
assert.match(
  profileSource,
  /if \(activeTab !== 'settings'\) setSettingsView\('home'\)/,
);
assert.match(
  profileSource,
  /if \(settingsView === 'email'\) \{\s*return <MobileEmail email=\{profile\.email\} onBack=\{\(\) => setSettingsView\('account'\)\} \/>;\s*\}/,
);
assert.match(
  profileSource,
  /if \(settingsView === 'account'\) \{\s*return <MobileAccount onBack=\{\(\) => setSettingsView\('home'\)\} onOpenEmail=\{\(\) => setSettingsView\('email'\)\} onLogout=\{onLogout\} \/>;\s*\}/,
);
assert.match(
  profileSource,
  /return <MobileSettingsHome onBack=\{\(\) => onSelectTab\('profile'\)\} onOpenAccount=\{\(\) => setSettingsView\('account'\)\} \/>/,
);

assert.match(mobileSettingsSource, /data-figma-node="286:2862"/);
assert.match(mobileSettingsSource, /min-h-screen bg-\[#efebf6\][\s\S]*pt-\[80px\]/);
assert.match(mobileSettingsSource, /flex h-\[24px\] items-center gap-4 px-4/);
assert.match(mobileSettingsSource, /ArrowLeft01Icon[\s\S]*size=\{24\}/);
assert.match(mobileSettingsSource, /onClick=\{onBack\}[\s\S]*mobileSettingsBackAriaLabel/);
assert.match(mobileSettingsSource, /mx-6 mt-8 flex flex-col gap-4 rounded-\[8px\] bg-white px-6 py-4/);
assert.match(mobileSettingsSource, /size-\[40px\][\s\S]*rounded-\[4px\] bg-\[#efeaf8\]/);
assert.match(mobileSettingsSource, /UserIcon[\s\S]*Invoice03Icon[\s\S]*InformationCircleIcon/);
for (const icon of ['UserIcon', 'Invoice03Icon', 'InformationCircleIcon']) {
  assert.match(
    mobileSettingsSource,
    new RegExp(`rounded-\\[4px\\] bg-\\[#efeaf8\\] text-\\[#6a37c3\\]">\\s*<HugeiconsIcon icon=\\{${icon}\\}`),
  );
}
assert.equal(
  (mobileSettingsSource.match(/rounded-\[4px\] bg-\[#efeaf8\] text-\[#6a37c3\]">\s*<HugeiconsIcon icon=\{(?:UserIcon|Invoice03Icon|InformationCircleIcon)\}/g) ?? []).length,
  3,
);
assert.equal((mobileSettingsSource.match(/ArrowRight01Icon/g) ?? []).length, 3);
assert.equal(
  (mobileSettingsSource.match(/<HugeiconsIcon icon=\{ArrowRight01Icon\} size=\{24\} strokeWidth=\{1\.5\} className="shrink-0 text-\[#252329\]" \/>/g) ?? []).length,
  3,
);
assert.equal(
  (mobileSettingsSource.match(/<HugeiconsIcon icon=\{ArrowRight01Icon\} size=\{24\} strokeWidth=\{1\.5\} className="shrink-0 text-\[#6a37c3\]" \/>/g) ?? []).length,
  0,
);
assert.equal((mobileSettingsSource.match(/bg-\[#f6f5f7\]/g) ?? []).length, 2);
assert.match(mobileSettingsSource, /text-\[16px\] font-medium leading-\[16px\] text-\[#252329\]/);
assert.match(mobileSettingsSource, /text-\[12px\] font-normal leading-\[12px\] text-\[#8c8698\]/);
assert.match(mobileSettingsRowsSource, /<button[\s\S]*onClick=\{onOpenAccount\}[\s\S]*mobileSettingsAccountTitle/);

assert.match(mobileAccountSource, /data-figma-node="286:3079"/);
assert.match(mobileAccountSource, /min-h-screen bg-\[#efebf6\][\s\S]*pt-\[80px\]/);
assert.match(mobileAccountSource, /flex h-\[24px\] items-center gap-4 px-4/);
assert.match(mobileAccountSource, /onClick=\{onBack\}[\s\S]*mobileAccountBackAriaLabel/);
assert.match(mobileAccountSource, /mx-6 mt-8 flex flex-col gap-4 rounded-\[8px\] bg-white px-6 py-4/);
assert.match(mobileAccountSource, /mx-6 mt-4 rounded-\[8px\] bg-white px-6 py-4/);
assert.match(mobileAccountSource, /UserEdit01Icon[\s\S]*ResetPasswordIcon/);
assert.match(mobileAccountSource, /Mail01Icon/);
assert.equal((mobileAccountSource.match(/ArrowRight01Icon/g) ?? []).length, 1);
assert.equal((mobileAccountSource.match(/rounded-\[1px\] bg-\[#f6f5f7\]/g) ?? []).length, 2);
assert.match(mobileAccountSource, /onClick=\{onLogout\}[\s\S]*aria-label=\{t\('profile\.logout'\)\}[\s\S]*bg-\[#fce5e3\] text-\[#bc251a\][\s\S]*Logout01Icon[\s\S]*t\('profile\.logout'\)/);
assert.doesNotMatch(mobileAccountSource, /MobileBottomNav/);
const mobileAccountRowsSource = mobileAccountSource.slice(
  mobileAccountSource.indexOf('aria-label={t(\'profile.mobileAccountListLabel\')}'),
  mobileAccountSource.indexOf('<section className="mx-6 mt-4'),
);
assert.equal((mobileAccountRowsSource.match(/<button/g) ?? []).length, 1);
assert.match(mobileAccountRowsSource, /<button[\s\S]*onClick=\{onOpenEmail\}[\s\S]*Mail01Icon[\s\S]*mobileAccountEmailTitle/);
assert.doesNotMatch(mobileAccountRowsSource.slice(mobileAccountRowsSource.indexOf('UserEdit01Icon')), /<button|onClick=|href=|to=|role="button"|<Link/);

assert.match(mobileEmailSource, /data-figma-node="286:3183"/);
assert.match(mobileEmailSource, /min-h-screen bg-\[#efebf6\][\s\S]*pt-\[80px\]/);
assert.match(mobileEmailSource, /flex h-\[24px\] items-center gap-4 px-4/);
assert.match(mobileEmailSource, /ArrowLeft01Icon[\s\S]*size=\{24\}/);
assert.match(mobileEmailSource, /onClick=\{onBack\}[\s\S]*mobileEmailBackAriaLabel/);
assert.match(mobileEmailSource, /mx-6 mt-8 flex flex-col gap-4 rounded-\[8px\] bg-white p-6/);
assert.match(mobileEmailSource, /text-\[18px\] font-medium leading-\[18px\] text-\[#161519\]/);
assert.match(mobileEmailSource, /text-\[14px\] font-normal leading-\[14px\] text-\[#8c8698\]/);
assert.match(mobileEmailSource, /flex h-16 flex-col justify-center gap-2 rounded-\[4px\] bg-\[#efeaf8\] px-4 py-2/);
assert.match(mobileEmailSource, /text-\[12px\] font-medium leading-\[12px\] text-\[#a585db\]/);
assert.match(mobileEmailSource, /text-\[12px\] font-normal leading-\[12px\] text-\[#6a37c3\]">\{email\}/);
assert.doesNotMatch(mobileEmailSource, /MobileBottomNav|@gmail\.com|onOpen|<button[\s\S]*edit/i);

for (const [localeName, locale] of [['RU', ruLocale], ['KK', kkLocale]]) {
  const profile = locale.profile;
  for (const key of [
    'mobileTitle',
    'mobileStatusActive',
    'mobileStatusBanned',
    'mobileTermsStat',
    'mobileTermsStatHelper',
    'mobilePointsStat',
    'mobilePointsStatHelper',
    'mobilePremiumTitle',
    'mobilePremiumSubtitle',
    'mobileActionsLabel',
    'mobileFavoritesHelper',
    'mobileWeakTopicsHelper',
    'mobileLanguageAriaLabel',
    'mobileSettingsAriaLabel',
    'mobileBackToProfile',
    'mobileSettingsTitle',
    'mobileSettingsListLabel',
    'mobileSettingsBackAriaLabel',
    'mobileSettingsAccountTitle',
    'mobileSettingsAccountHelper',
    'mobileAccountTitle',
    'mobileAccountBackAriaLabel',
    'mobileAccountListLabel',
    'mobileAccountEmailTitle',
    'mobileAccountEmailHelper',
    'mobileAccountUsernameTitle',
    'mobileAccountUsernameHelper',
    'mobileAccountPasswordTitle',
    'mobileAccountPasswordHelper',
    'mobileEmailTitle',
    'mobileEmailBackAriaLabel',
    'mobileEmailCardTitle',
    'mobileEmailBody',
    'mobileEmailValueLabel',
    'mobileSettingsSubscriptionTitle',
    'mobileSettingsSubscriptionHelper',
    'mobileSettingsAboutTitle',
    'mobileSettingsAboutHelper',
  ]) {
    assert.ok(profile[key], `${localeName} profile.${key} must be defined`);
  }
}

assert.doesNotMatch(premiumSource, /<button|onClick|href=|to=/);
assert.match(mobileHomeSource, /aria-label=\{t\('profile\.mobileLanguageAriaLabel'\)\}/);
assert.match(mobileHomeSource, /aria-label=\{t\('profile\.mobileSettingsAriaLabel'\)\}/);
assert.match(mobileHomeSource, /focus-visible:outline-2/);
assert.match(profileSource, /aria-label=\{t\('profile\.mobileBackToProfile'\)\}/);
assert.match(mobileDetailSource, /<section[^>]*aria-labelledby="mobile-profile-detail-title"/);
assert.match(mobileDetailSource, /<h1 id="mobile-profile-detail-title"[^>]*>\s*\{getTabTitle\(activeTab, t\)\}\s*<\/h1>/);

console.log('Profile mobile Figma contract passed');
