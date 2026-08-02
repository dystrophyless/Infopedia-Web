import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(import.meta.dirname, 'useTermSearchController.ts'), 'utf8');

assert.match(source, /type SearchResourceStatus = 'idle' \| 'loading' \| 'error' \| 'empty' \| 'ready'/, 'controller should expose explicit resource states');
assert.match(source, /AbortController/, 'search requests should use an abort controller');
assert.match(source, /GenerationRef/, 'search requests should guard against stale generations');
assert.match(source, /retryFeatured|retrySearch/, 'featured and search resources should expose retry actions');
assert.match(source, /submitRequestNonce|consumedSubmitNonce|immediateRequest/, 'a submitted query should force exactly one immediate request before debounce settles');
assert.match(source, /handledRetry|retryRequest/, 'retry should bypass query dedupe and issue a fresh request');
assert.equal((source.match(/searchTerms\(/g) ?? []).length, 1, 'controller should have one guarded searchTerms call site');
assert.match(source, /!immediateRequest && !retryRequest && normalizedQuery === lastSearchQueryRef\.current/, 'debounce should dedupe only after immediate and retry requests are consumed');
assert.match(source, /setQuery\(''\)|setQuery\(query\)/, 'query changes should remain store-backed');
assert.match(source, /selectedTermId/, 'selection should be tracked by the controller');
assert.match(source, /setSelectedTermId\(null\)/, 'query and filter changes should clear selection');
assert.match(source, /displayResults\.some\(.*selectedTermId|selectedTermId.*displayResults/, 'selection should be constrained to the current dataset');
assert.match(source, /setSelectedTermId\(null\)[\s\S]*displayResults/, 'selection state should clear when the selected term disappears');
assert.match(source, /filter-no-match|filterNoMatch|filter.*empty/, 'client-side filter no-match should remain distinguishable');

console.log('Term search controller state-machine contract passed');
