import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);

assert.match(
  analyzeSource,
  /const uniqueSuccessResults = useMemo\(/,
  'Analyze results should normalize duplicate chapters before rendering',
);

assert.match(
  analyzeSource,
  /sortChaptersByPercentage\(uniqueSuccessResults, sortDirection\)/,
  'Sorting should reorder the normalized chapter list, not raw task results',
);

assert.match(
  analyzeSource,
  /getAnalyzeSummary\(uniqueSuccessResults\)/,
  'Analyze summary should be based on the same normalized chapter list as the UI',
);

assert.match(
  analyzeSource,
  /function getUniqueAnalyzeChapterResults\(/,
  'Analyze page should collapse repeated chapter results into unique rows',
);

assert.match(
  analyzeSource,
  /function getAnalyzeChapterSignature\(/,
  'Analyze page should ignore exact duplicate chapter payloads instead of inflating totals',
);

assert.match(
  analyzeSource,
  /key=\{getAnalyzeChapterKey\(chapter\)\}/,
  'Chapter cards should use a stable normalized key',
);

assert.doesNotMatch(
  analyzeSource,
  /key=\{chapter\.chapter\}/,
  'Chapter cards should not key directly by chapter label because duplicate labels break sorting',
);
