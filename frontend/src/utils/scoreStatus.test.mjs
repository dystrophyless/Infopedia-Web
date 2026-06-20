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

const { getScoreStatus } = await importTs('src/utils/scoreStatus.ts');
const { buildWeakTopicInsights, getWeakTopicSummary } = await importTs('src/utils/weakTopics.ts');

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
assert.notEqual(getScoreStatus(60).progressColor, getScoreStatus(71).progressColor);
assert.equal(getScoreStatus(50).backgroundColor, '#fef3c7');
assert.equal(getScoreStatus(50).progressColor, '#eab308');
assert.equal(getScoreStatus(50).borderColor, '#facc15');
assert.equal(getScoreStatus(80).textColor, '#166534');
assert.equal(getScoreStatus(80).progressColor, '#22c55e');
assert.equal(getScoreStatus(90).textColor, '#047857');
assert.equal(getScoreStatus(90).progressColor, '#059669');

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
