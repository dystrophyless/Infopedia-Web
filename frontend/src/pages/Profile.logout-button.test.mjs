import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(
  path.resolve(import.meta.dirname, 'Profile.tsx'),
  'utf8',
);

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  assert.notEqual(startIndex, -1, `Missing ${start}`);
  assert.notEqual(endIndex, -1, `Missing ${end}`);
  return source.slice(startIndex, endIndex);
}

const profileShellSource = sliceBetween(
  profileSource,
  'export function Profile()',
  'function MobileProfileDashboard',
);

const desktopLogoutSource = profileSource.slice(
  profileSource.indexOf('function DesktopSettingsPanel('),
  profileSource.indexOf('function SettingsActionButton('),
);
const mobileLogoutSource = profileSource.match(/<button[\s\S]*?onClick=\{onLogout\}[\s\S]*?<\/button>/)?.[0] ?? '';
assert.notEqual(desktopLogoutSource, '', 'Desktop logout button must remain present');
assert.notEqual(mobileLogoutSource, '', 'Mobile logout button must remain present');
for (const [name, source] of [['desktop', desktopLogoutSource], ['mobile', mobileLogoutSource]]) {
  assert.doesNotMatch(
    source,
    /bg-\[#6b6475\]|hover:bg-\[#5d5666\]|bg-accent|bg-danger/,
    `${name} logout button should not use heavy gray, accent, or danger fill`,
  );
}

assert.match(
  profileShellSource,
  /onLogout=\{handleLogout\}/,
  'The profile shell should pass its real logout handler to desktop settings',
);
assert.match(
  desktopLogoutSource,
  /onClick=\{onLogout\}[\s\S]*justify-center gap-2[\s\S]*hover:bg-white[\s\S]*focus-visible:bg-white/,
  'Desktop settings should keep a neutral logout action',
);
