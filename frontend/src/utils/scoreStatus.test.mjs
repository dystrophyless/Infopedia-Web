import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const frontendRoot = path.resolve(import.meta.dirname, '..', '..');

async function importTs(relativePath) {
  const filename = path.resolve(frontendRoot, relativePath);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  return import(url);
}

const scoreStatusSource = readFileSync(path.resolve(frontendRoot, 'src/utils/scoreStatus.ts'), 'utf8');
const { getScoreStatus } = await importTs('src/utils/scoreStatus.ts');
const { buildWeakTopicInsights, getWeakTopicSummary } = await importTs('src/utils/weakTopics.ts');

assert.doesNotMatch(
  scoreStatusSource,
  /#[\da-f]{3,8}\b/i,
  'score statuses should reference semantic theme classes instead of raw colors',
);

assert.equal(getScoreStatus(0).id, 'low');
assert.equal(getScoreStatus(39).id, 'low');
assert.equal(getScoreStatus(40).id, 'review');
assert.equal(getScoreStatus(60).id, 'review');
assert.equal(getScoreStatus(69).id, 'review');
assert.equal(getScoreStatus(70).id, 'review');
assert.equal(getScoreStatus(71).id, 'good');
assert.equal(getScoreStatus(84).id, 'good');
assert.equal(getScoreStatus(85).id, 'excellent');
assert.equal(getScoreStatus(100).id, 'excellent');
assert.equal(getScoreStatus(-10).id, 'low');
assert.equal(getScoreStatus(140).id, 'excellent');
assert.notEqual(getScoreStatus(60).progressClass, getScoreStatus(71).progressClass);
assert.equal(getScoreStatus(50).surfaceClass, 'bg-status-review-surface');
assert.equal(getScoreStatus(50).progressClass, 'bg-status-review-progress');
assert.equal(getScoreStatus(50).borderClass, 'border-status-review-border');
assert.equal(getScoreStatus(80).textClass, 'text-status-good-foreground');
assert.equal(getScoreStatus(80).progressClass, 'bg-status-good-progress');
assert.equal(getScoreStatus(90).textClass, 'text-status-excellent-foreground');
assert.equal(getScoreStatus(90).progressClass, 'bg-status-excellent-progress');
assert.equal(getScoreStatus(90).accentClass, 'text-status-excellent-accent');

const topics = [
  createTopic('DATABASES', 88, 5, 6, 6),
  createTopic('NETWORKS', 12, 1, 5, 5),
  createTopic('PYTHON', 40, 2, 5, 5),
  createTopic('LOGIC', 35, 3, 8, 8),
  createTopic('WEB', 70, 4, 5, 5),
  createTopic('PERFECT', 100, 6, 6, 6),
];

const weakTopics = buildWeakTopicInsights(topics);
assert.deepEqual(
  weakTopics.map((topic) => topic.chapter),
  ['NETWORKS', 'LOGIC', 'PYTHON', 'WEB', 'DATABASES'],
);
assert.equal(weakTopics.length, 5);
assert.equal(
  weakTopics.some((topic) => topic.chapter === 'PERFECT'),
  false,
);
assert.equal(weakTopics[0].lostPoints, 4);

const summary = getWeakTopicSummary(weakTopics);
assert.equal(summary.lowestPercent, 12);
assert.equal(summary.revisionCount, 5);
assert.equal(summary.lostPoints, 14);

function createTopic(chapter, percentage, score, max_score, question_count) {
  return {
    chapter,
    percentage,
    score,
    max_score,
    question_count,
    books: [],
  };
}
