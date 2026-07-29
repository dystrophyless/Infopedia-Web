import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const mobile = source.slice(source.indexOf('export function AnalyzeMobileResults'), source.indexOf('function formatAnalyzeFileSize'));

assert.equal((source.match(/function AnalyzeMobileChapterCard\(/g) ?? []).length, 1);
assert.match(mobile, /topic_codes \?\? \[\]/);
assert.match(mobile, /chapter\.topic_count \?\? chapter\.books\.reduce/);
assert.match(mobile, /new Set\(chapter\.material_grades \?\? \[\]\)/);
assert.match(mobile, /desktopHeader:/);
assert.doesNotMatch(mobile, /<table|MobileBookCoverageList/);

console.log('Analyze mobile results contract passed');
