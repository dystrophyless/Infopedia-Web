import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const ruLocale = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const panelSource = profileSource.slice(
  profileSource.indexOf('function DesktopSettingsPanel('),
  profileSource.indexOf('function SettingsActionButton('),
);

assert.match(
  profileSource,
  /activeTab === 'settings'[\s\S]*<DesktopSettingsPanel[\s\S]*onLogout=\{handleLogout\}/,
  'The desktop settings route must bypass the legacy tab workspace and retain the real logout handler',
);
assert.match(panelSource, /data-figma-node="1135:3816"/);
assert.match(panelSource, /min-h-screen bg-\[#efeaf8\] px-6 py-16 max-md:hidden xl:px-\[240px\]/);
assert.match(panelSource, /mx-auto w-full max-w-\[639px\] xl:mx-0 xl:w-\[639px\]/);
assert.doesNotMatch(panelSource, /bg-\[#efeaf8\] px-\[240px\] py-16/);
assert.match(panelSource, /rounded-\[16px\] bg-white p-4/);
assert.doesNotMatch(panelSource, /min-h-\[(?:40|56)px\]/, 'Figma rows must derive 20px content + 16px card padding naturally');
assert.match(panelSource, /pl-2 text-\[20px\] font-medium leading-\[20px\] text-\[#161519\]/);
assert.match(panelSource, /flex flex-col gap-6[\s\S]*flex flex-col gap-6[\s\S]*mt-8/);

assert.doesNotMatch(panelSource, /desktopSettingsAccountSection/, 'Figma has no Account heading above the first card');
assert.equal(ruLocale.profile.desktopSettingsGeneralSection, 'Общий');
assert.match(panelSource, /flex flex-col gap-6[\s\S]*profile\.navSettings[\s\S]*onClick=\{\(\) => setView\('account'\)\}/, 'The Account card must follow the title by 24px');

for (const key of [
  'desktopSettingsGeneralSection',
  'desktopSettingsManagementSection',
  'desktopSettingsAboutSection',
]) {
  assert.match(panelSource, new RegExp(`profile\\.${key}`), `Desktop settings must render ${key}`);
}

assert.match(panelSource, /const languageOptions:[\s\S]*\{ value: 'kk', labelKey: 'common\.kazakh' \}[\s\S]*\{ value: 'ru', labelKey: 'common\.russian' \}/);
assert.match(panelSource, /useLangStore\(\(state\) => state\.lang\)[\s\S]*useLangStore\(\(state\) => state\.setLang\)/);
assert.match(panelSource, /aria-haspopup="menu"[\s\S]*aria-expanded=\{languageOpen\}[\s\S]*aria-controls=\{languageMenuId\}/);
assert.match(panelSource, /role="menu"[\s\S]*role="menuitemradio"[\s\S]*aria-checked=\{option\.value === lang\}/);
assert.match(panelSource, /ArrowDown[\s\S]*ArrowUp[\s\S]*Home[\s\S]*End[\s\S]*Escape[\s\S]*Tab/);
assert.match(panelSource, /document\.addEventListener\('pointerdown',[\s\S]*document\.removeEventListener\('pointerdown'/);
assert.match(panelSource, /setLang\(value\)[\s\S]*closeLanguageMenu\(true\)/);
assert.match(panelSource, /desktopSettingsServiceRules[\s\S]*desktopSettingsPrivacyPolicy/, 'About rows must match Figma order');
assert.match(panelSource, /Scroll01Icon[\s\S]*GoogleDocIcon/);
assert.doesNotMatch(panelSource, /LanguageCircleIcon|Invoice03Icon|LegalDocument01Icon/);
assert.match(profileSource, /import languagesAsset from '\.\.\/assets\/figma-profile\/languages\.svg'/);
assert.match(panelSource, /src=\{languagesAsset\}/);
assert.match(panelSource, /WebkitMaskImage: `url\(\$\{mobilePremiumAsset\}\)`/);
assert.match(panelSource, /h-px w-full bg-\[#f8f5fc\]/);
assert.equal((panelSource.match(/onClick=\{\(\) => setView\('about'\)\}/g) ?? []).length, 2);
assert.match(profileSource, /LogOut as LogOutIcon/);
assert.match(panelSource, /<HugeiconsIcon icon=\{LogOutIcon\} size=\{20\}/);
assert.doesNotMatch(panelSource, /Logout01Icon|LogoutIcon/);
assert.match(panelSource, /onClick=\{onLogout\}[\s\S]*justify-center gap-2[\s\S]*hover:bg-white[\s\S]*focus-visible:bg-white/);
assert.doesNotMatch(panelSource, /hover:bg-\[#efeaf8\]|focus-visible:bg-\[#efeaf8\]/);
assert.match(panelSource, /text-\[16px\] font-medium leading-\[16px\] text-\[#6e6779\]/);
assert.match(panelSource, /LogOutIcon[^>]*size=\{20\}[^>]*text-\[#f69a93\]/);

console.log('Profile desktop settings contract passed');
