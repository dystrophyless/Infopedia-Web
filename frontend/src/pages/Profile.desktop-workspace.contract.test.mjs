import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const desktopSource = profileSource.slice(
  profileSource.indexOf('max-w-[1040px]'),
  profileSource.indexOf('function MobileProfileDashboard'),
);

assert.doesNotMatch(desktopSource, /grid-cols-\[300px_minmax\(0,1fr\)\]/);
assert.doesNotMatch(desktopSource, /<aside[\s\S]*FigmaProfileIcon/);
assert.doesNotMatch(desktopSource, /<nav[\s\S]*profileNavItems/);
assert.match(desktopSource, /role="tablist"/);
assert.match(desktopSource, /role="tab"/);
assert.match(desktopSource, /aria-selected=\{isActive\}/);
assert.match(desktopSource, /profileNavItems\.map/);
assert.match(desktopSource, /activeTab === 'favorites'[\s\S]*<FavoritesContent embedded[\s\S]*detailBackTo="\/profile"/);
assert.match(profileSource, /activeTab === 'settings'[\s\S]*DesktopSettingsPanel/);

console.log('Profile desktop workspace contract passed');
