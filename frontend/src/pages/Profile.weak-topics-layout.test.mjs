import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(path.resolve(import.meta.dirname, 'Profile.tsx'), 'utf8');
const weakTopicsSource = profileSource.slice(
  profileSource.indexOf('function WeakTopicsPanel('),
  profileSource.indexOf('type SettingsView'),
);

assert.match(profileSource, /selectAnalyzeResultAccess/);
assert.match(profileSource, /AnalyzeChapterCard/);
assert.doesNotMatch(profileSource, /AnalyzeBookCoverage|WeakTopicBookList|WeakTopicBookRow|weakTopicsBooks|weakTopicsBookCoverage/);
assert.doesNotMatch(profileSource, /buildWeakTopicInsights|WeakTopicInsight|WeakTopicStatsRow|WeakTopicResultIndicator/);

assert.match(weakTopicsSource, /if \(loading\) \{[\s\S]*WeakTopicsLoadingState/);
assert.match(weakTopicsSource, /if \(error\) \{[\s\S]*common\.retry/);
assert.match(weakTopicsSource, /results\.length === 0[\s\S]*PlaceholderPanel type="weakTopics"/);
assert.match(profileSource, /WeakTopicsPerfectState/);
assert.match(weakTopicsSource, /access\.orderedChapters\.length === 0[\s\S]*WeakTopicsPerfectState/);
assert.match(weakTopicsSource, /selectAnalyzeResultAccess\(results \?\? \[\]\)/);

const masterDetailSource = profileSource.slice(
  profileSource.indexOf('function WeakTopicsMasterDetail('),
  profileSource.indexOf('type SettingsView'),
);
assert.match(masterDetailSource, /AnalyzeChapterCard[\s\S]*mode="summary"/);
assert.match(masterDetailSource, /AnalyzeChapterCard[\s\S]*mode="detail"/);
assert.match(masterDetailSource, /practice-by-topic\?chapterId=/);
assert.match(masterDetailSource, /selectedTopic\.chapter_id === freeChapterId/);
assert.match(masterDetailSource, /LockedWeakTopicDetail/);
assert.match(masterDetailSource, /lostPoints|mobileChapterLost/);
assert.match(masterDetailSource, /question_count|max_score|mobileChapterScoreSummary/);
assert.doesNotMatch(masterDetailSource, /topic_codes/);

assert.match(profileSource, /selectedChapter/);
assert.match(profileSource, /weakTopics\.some\(\(topic\) => topic\.chapter_id === selectedChapter\)/);
assert.match(profileSource, /aria-live="polite"/);

console.log('Profile weak topics layout contract passed');
