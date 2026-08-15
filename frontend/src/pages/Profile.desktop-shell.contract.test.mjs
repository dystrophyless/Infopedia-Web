import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const favoritesSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/favorites/pages/FavoritesPage.tsx'),
  'utf8',
);

const desktopShell = profileSource.slice(
  profileSource.indexOf('max-w-[1040px]'),
  profileSource.indexOf('function MobileProfileDashboard'),
);

assert.match(
  profileSource,
  /const \[searchParams, setSearchParams\] = useSearchParams\(\)/,
  'Profile should derive its tab from the URL so browser Back restores selection',
);
assert.match(profileSource, /const activeTab = parseProfileTab\(searchParams\)/);
assert.match(
  profileSource,
  /setSearchParams\(setProfileTab\(searchParams, nextTab\)\)/,
  'Profile tab writes should preserve unrelated query parameters through the shared codec',
);
assert.doesNotMatch(
  profileSource,
  /const \[activeTab, setActiveTab\] = useState<ProfileTabId>/,
  'Profile must not keep a second tab source of truth outside the URL',
);

assert.match(
  desktopShell,
  /role="tablist"[\s\S]*profileNavItems\.map[\s\S]*role="tab"/,
  'Desktop Profile must expose page-local accessible tabs',
);
assert.match(desktopShell, /activeTab === 'favorites'[\s\S]*<FavoritesContent embedded[\s\S]*detailBackTo="\/profile" \/>/);
assert.doesNotMatch(desktopShell, /activeTab === 'favorites'[\s\S]*navigate\('\/favorites'\)/);
assert.doesNotMatch(desktopShell, /grid-cols-\[300px_minmax\(0,1fr\)\]/);
assert.doesNotMatch(desktopShell, /<aside[\s\S]*FigmaProfileIcon/);
assert.match(profileSource, /type SettingsView = 'home' \| 'account' \| 'email' \| 'username' \| 'password' \| 'subscription' \| 'about' \| 'delete'/);
assert.match(profileSource, /<DesktopSettingsPanel[\s\S]*profile=\{profile\}[\s\S]*onProfileUpdated=/);
const settingsPanel = profileSource.slice(profileSource.indexOf('function DesktopSettingsPanel('), profileSource.indexOf('function SettingsActionButton('));
assert.match(settingsPanel, /useState<SettingsView>\('home'\)/);
assert.match(settingsPanel, /view === 'home'[\s\S]*desktopSettingsGeneralSection[\s\S]*desktopSettingsManagementSection[\s\S]*desktopSettingsAboutSection[\s\S]*desktopSettingsServiceRules[\s\S]*desktopSettingsPrivacyPolicy/);
assert.doesNotMatch(settingsPanel, /desktopSettingsAccountSection/);
assert.match(settingsPanel, /view === 'account'[\s\S]*SettingsActionButton[\s\S]*Email[\s\S]*Username[\s\S]*Password[\s\S]*Delete/);
assert.match(settingsPanel, /view === 'home'[\s\S]*common\.language/);
assert.match(settingsPanel, /view === 'email'[\s\S]*onBack=\{\(\) => setView\('account'\)\}/);
assert.match(settingsPanel, /view === 'username'[\s\S]*onSaved=\{\(nextProfile\) => onProfileUpdated\?\.\(nextProfile\)\}/);
assert.match(settingsPanel, /view === 'delete'[\s\S]*DeleteAccountPanel/);
assert.match(favoritesSource, /export function FavoritesContent\(\{[\s\S]*embedded = false[\s\S]*detailBackTo = '\/favorites'/);
assert.match(favoritesSource, /export function FavoritesPage\(\)/);
assert.match(favoritesSource, /<FavoritesContent \/>/);

console.log('Profile desktop shell contract passed');
