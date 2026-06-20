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
  'function ProfileOverview(',
);

assert.doesNotMatch(
  profileShellSource,
  /bg-\[#6b6475\]|hover:bg-\[#5d5666\]|bg-accent|bg-danger/,
  'Logout button should not use the old heavy gray fill, accent fill, or danger fill',
);

assert.match(
  profileShellSource,
  /onClick=\{handleLogout\}[\s\S]*border border-border\/55 bg-surface px-5 text-\[17px\] text-text-body[\s\S]*hover:bg-bg hover:text-primary/,
  'Logout button should use a neutral outlined treatment that fits the profile header',
);
