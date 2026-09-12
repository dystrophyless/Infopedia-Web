import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
assert.match(profileSource, /loading && !profile && <SkeletonCard \/>/);
assert.doesNotMatch(profileSource, /WeakTopicsLoadingState|WeakTopicsPerfectState|WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS/);

console.log('Profile loading state contract passed');
