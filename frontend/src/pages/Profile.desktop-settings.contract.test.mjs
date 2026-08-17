import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const ruLocale = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const panelStart = profileSource.indexOf('function DesktopSettingsPanel(');
const panelEnd = profileSource.indexOf('function SettingsActionButton(');
const panelSource = profileSource.slice(panelStart, panelEnd);
const outsidePanelSource = `${profileSource.slice(0, panelStart)}${profileSource.slice(panelEnd)}`;
const logoutClick = panelSource.indexOf('onClick={onLogout}');
const logoutButtonStart = panelSource.lastIndexOf('<button', logoutClick);
const logoutButtonEnd = panelSource.indexOf('</button>', logoutClick) + '</button>'.length;
const logoutButtonSource = panelSource.slice(logoutButtonStart, logoutButtonEnd);

function countAssetSources(source, assetName) {
  return (source.match(new RegExp(`src=\\{${assetName}\\}`, 'g')) ?? []).length;
}

function assertSinglePanelAssetUsage(assetName) {
  assert.equal(countAssetSources(profileSource, assetName), 1, `${assetName} must have exactly one runtime src usage globally`);
  assert.equal(countAssetSources(panelSource, assetName), 1, `${assetName} must be rendered inside DesktopSettingsPanel`);
  assert.equal(countAssetSources(outsidePanelSource, assetName), 0, `${assetName} must not be rendered outside DesktopSettingsPanel`);
}

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

for (const [headingId, key] of [
  ['desktop-settings-general-heading', 'desktopSettingsGeneralSection'],
  ['desktop-settings-management-heading', 'desktopSettingsManagementSection'],
  ['desktop-settings-about-heading', 'desktopSettingsAboutSection'],
]) {
  assert.match(
    panelSource,
    new RegExp(`<h2 id="${headingId}" className="pl-2 text-\\[16px\\] font-medium leading-\\[16px\\] text-\\[#6e6779\\]">\\s*\\{t\\('profile\\.${key}'\\)\\}`),
    `Desktop settings must render ${key} with the same 8px left inset as the main title`,
  );
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
assert.match(profileSource, /import languagesAsset from '\.\.\/assets\/figma-profile\/languages\.svg';/);
assert.doesNotMatch(profileSource, /\bLanguages(?:Icon| as LanguagesIcon)\b/);
assertSinglePanelAssetUsage('languagesAsset');
assert.match(panelSource, /<img\s+src=\{languagesAsset\}\s+alt=""\s+aria-hidden="true"\s+width=\{20\}\s+height=\{20\}\s+className="size-5 shrink-0"\s*\/>/);
assert.match(panelSource, /WebkitMaskImage: `url\(\$\{mobilePremiumAsset\}\)`/);
assert.match(panelSource, /h-px w-full bg-\[#f8f5fc\]/);
assert.equal((panelSource.match(/onClick=\{\(\) => setView\('about'\)\}/g) ?? []).length, 2);
assert.match(profileSource, /import desktopLogOutAsset from '\.\.\/assets\/figma-profile\/log-out\.svg';/);
assert.doesNotMatch(profileSource, /\bLogOut(?:Icon| as LogOutIcon)\b/);
assertSinglePanelAssetUsage('desktopLogOutAsset');
assert.match(panelSource, /<img\s+src=\{desktopLogOutAsset\}\s+alt=""\s+aria-hidden="true"\s+width=\{20\}\s+height=\{20\}\s+className="size-5 shrink-0 transition-opacity group-hover:opacity-0"\s*\/>/);
assert.doesNotMatch(panelSource, /LogOutIcon|Logout01Icon|LogoutIcon/);
assert.match(panelSource, /onClick=\{onLogout\}[\s\S]*justify-center gap-2[\s\S]*hover:bg-white[\s\S]*focus-visible:bg-white/);
assert.doesNotMatch(panelSource, /hover:bg-\[#efeaf8\]|focus-visible:bg-\[#efeaf8\]/);
assert.match(panelSource, /text-\[16px\] font-medium leading-\[16px\] text-\[#6e6779\]/);
assert.match(logoutButtonSource, /className="[^"]*\bgroup\b[^"]*hover:bg-white[^"]*"/, 'Logout hover background must be white');
assert.match(logoutButtonSource, /src=\{desktopLogOutAsset\}[\s\S]*className="[^"]*group-hover:opacity-0[^"]*"/, 'Normal Figma icon must hide only on hover');
assert.match(logoutButtonSource, /className="[^"]*bg-\[#f25f54\][^"]*opacity-0[^"]*group-hover:opacity-100[^"]*"/, 'Hover icon overlay must paint exactly #F25F54');
assert.match(logoutButtonSource, /WebkitMaskImage: `url\(\$\{desktopLogOutAsset\}\)`[\s\S]*maskImage: `url\(\$\{desktopLogOutAsset\}\)`/, 'Hover icon overlay must use the approved Figma silhouette');
assert.match(logoutButtonSource, /className="[^"]*text-\[#6e6779\][^"]*group-hover:text-\[#161519\][^"]*"/, 'Logout label must preserve its normal paint and use exactly #161519 on hover');
assert.doesNotMatch(panelSource, /languagesAsset[^>]*style=|desktopLogOutAsset[^>]*style=/);

console.log('Profile desktop settings contract passed');
