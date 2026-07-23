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

const mobileProfileHomeSource = sliceBetween(
  profileSource,
  'function MobileProfileHome(',
  'function MobileProfileStat(',
);

assert.match(
  mobileProfileHomeSource,
  /title=\{t\('profile\.navWeakTopics'\)\}[\s\S]*helper=\{t\('profile\.mobileWeakTopicsHelper'\)\}[\s\S]*onClick=\{\(\) => navigate\('\/analyze\?view=latest'\)\}/,
  'Mobile Weak Topics action should navigate to the latest Analyze view',
);

assert.doesNotMatch(
  mobileProfileHomeSource,
  /onClick=\{\(\) => onSelectTab\('weakTopics'\)\}/,
  'Mobile Weak Topics action should not switch to the local Profile tab',
);

const weakTopicListSource = sliceBetween(
  profileSource,
  'function WeakTopicList(',
  'function WeakTopicDetail(',
);
const weakTopicDetailSource = sliceBetween(
  profileSource,
  'function WeakTopicDetail(',
  'function WeakTopicResultIndicator(',
);
const weakTopicBookRowSource = sliceBetween(
  profileSource,
  'function WeakTopicBookRow(',
  'function WeakTopicInfoTooltip(',
);

assert.doesNotMatch(
  profileSource,
  /function WeakTopicOverview\(/,
  'Weak topics page should not render the redundant overview card grid',
);

assert.doesNotMatch(
  profileSource,
  /function WeakTopicCard\(/,
  'Weak topics page should not render every topic as a fully expanded card',
);

assert.doesNotMatch(
  profileSource,
  /weakTopicsStudyHint/,
  'Chapter cards should not repeat generic study advice',
);

assert.doesNotMatch(
  profileSource,
  /function WeakTopicScoreBreakdown\(/,
  'Chapter cards should not include a second score breakdown block',
);

assert.doesNotMatch(
  profileSource,
  /t\(status\.labelKey\)/,
  'Result indicator should not repeat the textual status label',
);

assert.doesNotMatch(
  profileSource,
  /weakTopicsRankLabel|weakTopicsOverview|weakTopicsCardBody|weakTopicsBookCoveragePercent/,
  'Weak topics page should not keep old rank, overview, generic body, or pill coverage copy',
);

assert.match(
  profileSource,
  /function WeakTopicsMasterDetail\(/,
  'Weak topics page should use a master-detail layout',
);

assert.match(
  profileSource,
  /function WeakTopicList\(/,
  'Weak topics page should render the compact topic list',
);

assert.doesNotMatch(
  weakTopicListSource,
  /overflow-x-auto|max-h-\[620px\]|max-md:min-w-\[230px\]/,
  'Topic selection list should avoid horizontal sliders and old oversized constraints',
);

assert.match(
  weakTopicListSource,
  /weak-topic-list-scroll[\s\S]*overflow-y-auto/,
  'Topic selection list should scroll vertically inside the profile-sized panel',
);

assert.match(
  profileSource,
  /break-words text-\[14px\] font-medium leading-none text-text/,
  'Long topic names in the selection list should wrap instead of being truncated',
);

assert.match(
  profileSource,
  /min-w-\[46px\][\s\S]*tabular-nums/,
  'Topic percent in the selection list should use a compact fixed-width treatment',
);

assert.match(
  profileSource,
  /function WeakTopicDetail\(/,
  'Weak topics page should render one selected topic detail panel',
);

assert.match(
  profileSource,
  /role="listbox"[\s\S]*role="option"/,
  'Topic list should be accessible as keyboard-focusable selectable rows',
);

assert.match(
  profileSource,
  /aria-live="polite"/,
  'Selected topic detail should announce changes',
);

assert.match(
  profileSource,
  /selectedChapter/,
  'WeakTopicsPanel should keep selected topic state',
);

assert.match(
  profileSource,
  /function WeakTopicStatsRow\(/,
  'Selected chapter should render compact score/question stats',
);

assert.doesNotMatch(
  profileSource,
  /WeakTopicStatsRow[\s\S]*weakTopicsLostPointsInline/,
  'Selected topic stats should not repeat lost points',
);

assert.match(
  profileSource,
  /max_score - topic\.question_count[\s\S]*weakTopicsScoreInline[\s\S]*weakTopicsQuestionCount[\s\S]*weakTopicsWeightedScoreLabel[\s\S]*weakTopicsWeightedScoreTooltip/,
  'Selected topic stats should include score, question count, and dynamic weighted-score help',
);

assert.doesNotMatch(
  profileSource,
  /weakTopicsSummaryLine|weakTopicsScoreWeightNote|weakTopicsScoreLabel|weakTopicsQuestionsLabel|weakTopicsListItemMeta/,
  'Weak topic UI should not repeat old summary, score/question labels, or question count in list cards',
);

assert.doesNotMatch(
  weakTopicListSource,
  /question_count|weakTopicsQuestionCount/,
  'Topic list cards should keep only lost points below the chapter title',
);

assert.doesNotMatch(
  profileSource,
  /weakTopicsStartTrainingButton|weakTopicsBookOpenTopicsButton|weakTopicsBookOpenTopicsLabel|weakTopicsBookSearchQuery|\/search\?query=/,
  'Weak topics should not expose unavailable training or book-topic business actions',
);

assert.match(
  profileSource,
  /<h3 className="[^"]*text-text/,
  'Chapter titles should use neutral text color instead of competing with status colors',
);

assert.doesNotMatch(
  profileSource,
  /rank=\{|rank:/,
  'Topic and book rows should not render numeric rank badges',
);

assert.match(
  profileSource,
  /const INITIAL_VISIBLE_BOOKS_LIMIT = 3;/,
  'Book list should show only three books by default',
);

assert.match(
  profileSource,
  /books\.slice\([\s\S]*normalizedWindowStart,[\s\S]*normalizedWindowStart \+ INITIAL_VISIBLE_BOOKS_LIMIT/,
  'Book list should render a three-book window from real API data',
);

assert.match(
  profileSource,
  /weakTopicsShowMoreBooks/,
  'Book list should reveal additional books with an explicit navigation label',
);

assert.doesNotMatch(
  profileSource,
  /overflow-x-auto/,
  'Weak topics should not use native horizontal browser scrollbars',
);

assert.match(
  profileSource,
  /bookWindowStart[\s\S]*weakTopicsPreviousBooks[\s\S]*weakTopicsNextBooks/,
  'Book list should use custom previous/next controls instead of browser sliders',
);

assert.match(
  profileSource,
  /lg:h-\[320px\][\s\S]*lg:grid-cols-\[240px_minmax\(0,1fr\)\]/,
  'Weak topics section should match the profile panel body height',
);

assert.match(
  profileSource,
  /grid-cols-3 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1/,
  'Book list should render as a compact responsive horizontal grid',
);

assert.match(
  weakTopicDetailSource,
  /mt-4 border-t border-border\/30 pt-3/,
  'Selected topic detail should give the score pills more room before the divider',
);

assert.match(
  weakTopicBookRowSource,
  /min-h-\[96px\] w-full min-w-0[\s\S]*flex-col gap-1\.5[\s\S]*px-3 py-3/,
  'Book cards should be slightly taller with more top padding for the title and grade',
);

assert.match(
  weakTopicBookRowSource,
  /<span className="mt-3 min-w-0">[\s\S]*weakTopicsBookCoverageLabel/,
  'Book coverage should sit slightly lower inside each book card',
);

assert.doesNotMatch(
  weakTopicBookRowSource,
  /flex-col justify-between/,
  'Book cards should not push coverage to the bottom with justify-between',
);

assert.match(
  profileSource,
  /function WeakTopicInfoTooltip[\s\S]*HelpCircleIcon[\s\S]*role="tooltip"/,
  'Book explanation should use a styled custom tooltip',
);

assert.match(
  profileSource,
  /h-5 w-5 rounded-none bg-transparent p-0 hover:bg-transparent/,
  'Icon-only hint trigger should render without a rounded background pill',
);

assert.doesNotMatch(
  profileSource,
  /border-primary\/15|border-border\/65 bg-surface px-3 py-2/,
  'Weak topic info tooltip should not use the outlined hint treatment',
);

assert.doesNotMatch(
  profileSource,
  /title=\{t\('profile\.weakTopicsBooksInfoTooltip'|title=\{t\('profile\.weakTopicsBookCoverageTooltip'/,
  'Weak topic hints should not use native browser title tooltips',
);

assert.doesNotMatch(
  profileSource,
  /weakTopicsBooksDescription|weakTopicsBooksCoverageHint/,
  'Book explanation text should not render as persistent paragraphs',
);
