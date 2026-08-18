import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const loadingSource = profileSource.slice(
  profileSource.indexOf('function WeakTopicsLoadingState('),
  profileSource.indexOf('function WeakTopicsMasterDetail('),
);

assert.match(profileSource, /if \(loading\) \{\s*return <WeakTopicsLoadingState \/>;\s*\}/s);
assert.match(profileSource, /function WeakTopicsLoadingState\(\)/);
assert.match(loadingSource, /role="status"/);
assert.match(loadingSource, /aria-busy="true"/);
assert.match(loadingSource, /aria-hidden="true"[\s\S]*animate-pulse/);
assert.match(loadingSource, /WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS/);
assert.match(loadingSource, /Array\.from\(\{ length: 5 \}\)/);
assert.doesNotMatch(loadingSource, /WeakTopicBook|books|coverage|publisher/);
assert.match(profileSource, /function WeakTopicsPerfectState\(\)/);
assert.match(profileSource, /profile\.weakTopicsPerfect/);

console.log('Profile loading state contract passed');
