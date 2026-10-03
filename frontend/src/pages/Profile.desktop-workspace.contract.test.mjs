import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const profileShellSource = profileSource.slice(
  profileSource.indexOf('export function Profile()'),
  profileSource.indexOf('function MobileProfileDashboard'),
);

assert.doesNotMatch(profileShellSource, /role="tablist"|role="tab"|aria-selected=\{isActive\}/);
assert.doesNotMatch(profileSource, /profileNavItems\.map|const profileNavItems/);
assert.doesNotMatch(profileSource, /<FavoritesContent embedded|<WeakTopicsPanel/);
assert.match(profileShellSource, /activeTab === 'profile'[\s\S]*<ProfileOverview profile=\{profile\}/);
assert.match(profileShellSource, /activeTab === 'settings'[\s\S]*<DesktopSettingsPanel/);
assert.match(profileSource, /requestedTab === 'weakTopics'[\s\S]*navigate\('\/analyze\?view=latest'/);

console.log('Profile desktop workspace contract passed');
