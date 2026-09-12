import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
assert.doesNotMatch(
  profileSource,
  /WeakTopicsPanel|WeakTopicsMasterDetail|WeakTopicsLoadingState|WeakTopicsPerfectState|WeakTopicList|LockedWeakTopicDetail|WeakTopicQuestionMeta|selectAnalyzeResultAccess|AnalyzeChapterCard/,
  'The legacy profile weak-topics implementation should be removed; Analyze owns this result UI',
);
assert.match(profileSource, /requestedTab === 'weakTopics'[\s\S]*navigate\('\/analyze\?view=latest'/);

console.log('Profile weak topics layout contract passed');
