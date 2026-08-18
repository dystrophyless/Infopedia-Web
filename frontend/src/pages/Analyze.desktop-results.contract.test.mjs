import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');

assert.match(source, /<AnalyzeMobileResults[\s\S]*access=\{resultAccess\}/);
assert.match(source, /max-w-\[430px\] px-6 pb-8 md:max-w-none md:px-0 md:pb-14/);
assert.match(source, /className="mt-4 grid gap-3 md:grid-cols-2"/);
const resultSource = source.slice(source.indexOf('export function AnalyzeMobileResults'), source.indexOf('function AnalyzeMobileChapterCard'));
assert.match(resultSource, /headingLevel: 1[\s\S]*<h2 className="text-\[20px\] font-medium leading-none text-\[#572d9f\]">/);
assert.doesNotMatch(resultSource, /<h1\b/);
assert.doesNotMatch(source, /export function AnalyzeResults|function SummaryStat|function ChapterCard\(|function MobileBookCoverageList|SegmentedControl/);
assert.match(source, /desktopHeader:\s*\{[\s\S]*description: t\('analyze\.description'\)/);
assert.doesNotMatch(source, /shadow-feature/);

console.log('Analyze desktop results contract passed');
