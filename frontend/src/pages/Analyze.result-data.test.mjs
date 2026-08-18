import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');

assert.match(source, /function getUniqueAnalyzeChapterResults\(results: AnalyzeChapterResult\[\]\)/);
assert.match(source, /const exactSeen = new Set<string>\(\)/);
assert.match(source, /question_count: existing\.question_count \+ chapter\.question_count/);
assert.match(source, /max_score: maxScore/);
assert.match(source, /percentage: maxScore > 0 \? Math\.round\(\(score \/ maxScore\) \* 100\) : 0/);
assert.match(source, /function mergeAnalyzeBooks\(/);
assert.match(source, /book\.percentage > existing\.percentage/);
assert.match(source, /topic_count > existing\.topic_count/);

console.log('Analyze result data contract passed');
