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
assert.equal((source.match(/searchTerms\(/g) ?? []).length, 2, 'controller should have one guarded replace call and one guarded append call');
assert.match(source, /shouldReplaceSearchRequest\([\s\S]*requestDescriptor\.key,[\s\S]*retryRequest \|\| immediateRequest/, 'replace requests should dedupe by the canonical request key unless submit or retry forces a refresh');
assert.match(source, /skip: 0, limit: SEARCH_RESULT_LIMIT/, 'replace requests should always start at skip zero with the desktop page limit');
assert.match(source, /skip: action\.skip, limit: SEARCH_RESULT_LIMIT/, 'append requests should continue at the loaded result count');
assert.match(source, /replaceSearchPage\(page\)|appendSearchPage\(/, 'server pages should be replaced and appended without client-side reordering');
assert.match(source, /setQuery\(''\)|setQuery\(query\)/, 'query changes should remain store-backed');
assert.match(source, /selectedTermId/, 'selection should be tracked by the controller');
assert.match(source, /setSelectedTermId\(null\)/, 'query and filter changes should clear selection');
assert.match(source, /displayResults\.some\(.*selectedTermId|selectedTermId.*displayResults/, 'selection should be constrained to the current dataset');
assert.match(source, /setSelectedTermId\(null\)[\s\S]*displayResults/, 'selection state should clear when the selected term disappears');
assert.doesNotMatch(source, /filterTermsBySearchFilters/, 'server search results should not be filtered or reordered on the client');

console.log('Term search controller state-machine contract passed');
