import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const cardSource = readFileSync(path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeChapterCard.tsx'), 'utf8');
const cardModelSource = readFileSync(path.resolve(import.meta.dirname, '../features/analyze/model/analyzeChapterCard.ts'), 'utf8');
const mobile = source.slice(source.indexOf('export function AnalyzeMobileResults'), source.indexOf('function formatAnalyzeFileSize'));

assert.equal((source.match(/AnalyzeMobileChapterCard/g) ?? []).length, 0);
assert.match(cardModelSource, /const topics = locked \? \[\] : chapter\.topic_codes \?\? \[\]/);
assert.match(cardModelSource, /chapter\.topic_count \?\? chapter\.books\.reduce/);
assert.match(cardModelSource, /new Set\(chapter\.material_grades \?\? \[\]\)/);
assert.match(cardSource, /mode: 'summary' \| 'detail'/);
assert.match(cardSource, /to=\"\/profile\"/);
assert.match(mobile, /desktopHeader:/);
assert.doesNotMatch(mobile, /<table|MobileBookCoverageList/);

console.log('Analyze mobile results contract passed');
