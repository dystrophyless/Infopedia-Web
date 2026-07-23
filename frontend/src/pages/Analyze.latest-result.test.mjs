import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);

assert.match(
  analyzeSource,
  /useNavigate, useSearchParams/,
  'Analyze should use React Router navigation together with query params for latest deep links',
);
assert.match(
  analyzeSource,
  /const \[searchParams, setSearchParams\] = useSearchParams\(\)/,
  'Analyze should inspect the route query before loading a latest result',
);
assert.match(
  analyzeSource,
  /const isLatestView = searchParams\.get\('view'\) === 'latest'/,
  'Only view=latest should activate the latest-result flow',
);
assert.match(
  analyzeSource,
  /if \(!isLatestView\) \{[\s\S]*?return;[\s\S]*?getLatestAnalyzeResult\(i18n\.language\)/,
  'The ordinary Analyze route must skip the latest API while view=latest fetches it',
);
assert.match(
  analyzeSource,
  /const normalizedResults = Array\.isArray\(results\) && results\.length > 0 \? results : \[\];[\s\S]*?setLatestResults\(normalizedResults\)/,
  'Latest responses should be normalized before entering the shared result state',
);
assert.match(
  analyzeSource,
  /if \(normalizedResults\.length === 0\) \{[\s\S]*?params\.delete\('view'\)[\s\S]*?replace: true/,
  'An empty latest response should clear the deep-link intent and return to ordinary upload',
);
assert.match(
  analyzeSource,
  /setLatestResults\(null\);[\s\S]*?setLatestError\(getApiErrorMessage\(err, t\('common\.error'\)\)\)/,
  'Latest-fetch errors should remain distinct from an empty latest result',
);
assert.match(
  analyzeSource,
  /setLatestRetryKey\(\(value\) => value \+ 1\)/,
  'Retrying the latest-result error should trigger the latest fetch effect again',
);
assert.match(
  analyzeSource,
  /<AnalyzeResults[\s\S]*results=\{sortedResults\}/,
  'Latest results should use the existing AnalyzeResults renderer',
);
assert.match(
  analyzeSource,
  /const currentTask = isLatestView \? undefined : sseResult \?\? pollTask \?\? messages\.at\(-1\) \?\? createdTask/,
  'Latest mode must ignore stale upload task, SSE, and poll state',
);
assert.match(
  analyzeSource,
  /const sseUrl = !isLatestView && taskId \? buildAnalyzeSseUrl\(taskId\) : null/,
  'Latest mode must not reconnect to a stale upload SSE stream',
);
assert.match(
  analyzeSource,
  /if \(isLatestView \|\| !taskId \|\| !sseError \|\| sseResult\) return/,
  'Latest mode must not start stale upload polling',
);
assert.match(
  analyzeSource,
  /const isLatestLoading = isLatestView && latestResults === undefined && latestError === null/,
  'Latest fetch pending must have an explicit loading state',
);
assert.match(
  analyzeSource,
  /\{!isLatestLoading && \(\s*<PageHeader[\s\S]*?\n\s*\/>\s*\)\}/,
  'Latest fetch pending must suppress the shared desktop PageHeader while the skeleton owns the loading layout',
);
assert.equal(
  (analyzeSource.match(/<PageHeader\b/g) ?? []).length,
  1,
  'Analyze must keep a single shared PageHeader path so latest loading cannot duplicate desktop and mobile headers',
);
assert.match(
  analyzeSource,
  /const isProcessing = !isLatestView && \(submitting \|\| Boolean\(taskId && !isTerminal && !pollError\)\)/,
  'isProcessing must remain reserved for an ordinary real Analyze task',
);
assert.match(
  analyzeSource,
  /const showUploadForm = !isLatestView && !isTerminal && !isProcessing/,
  'Latest fetch pending must not render the ordinary upload form',
);
assert.match(
  analyzeSource,
  /export function AnalyzeLatestResultSkeleton\(\{ onBack \}: \{ onBack: \(\) => void \}\)/,
  'Latest fetch pending must use a local result skeleton with a back callback',
);
assert.match(
  analyzeSource,
  /<Skeleton[\s\S]*shape="circle"/,
  'Latest result skeleton should use decorative, non-announcing Skeleton placeholders',
);
assert.match(
  analyzeSource,
  /<section className="hidden md:block mt-8" aria-hidden="true">[\s\S]*<section className="w-full overflow-x-hidden bg-\[\#efebf6\][\s\S]*<div className="mx-auto w-full max-w-\[430px\] px-6 pb-8" aria-hidden="true">/,
  'Latest result skeleton placeholder regions should remain hidden from assistive technology',
);
assert.match(
  analyzeSource,
  /<div role="status" aria-live="polite" aria-busy="true">[\s\S]*t\('common\.loading'\)/,
  'Latest result skeleton should expose one polite busy status announcement',
);
assert.match(
  analyzeSource,
  /\{isLatestLoading && <AnalyzeLatestResultSkeleton onBack=\{handleMobileResultBack\} \/>\}/,
  'Latest pending view must render the result skeleton instead of AnalyzeProgress',
);
assert.match(
  analyzeSource,
  /function reset\(\) \{[\s\S]*?if \(isLatestView\) \{[\s\S]*?navigate\(\{ pathname: '\/analyze', search: '' \}, \{ replace: true \}\)/,
  'Desktop reset/new-upload must still return to ordinary Analyze',
);
assert.match(
  analyzeSource,
  /function handleMobileResultBack\(\) \{[\s\S]*?if \(isLatestView\) \{[\s\S]*?navigate\('\/profile', \{ replace: true \}\)[\s\S]*?return;[\s\S]*?\}[\s\S]*?reset\(\);/,
  'Mobile latest-result back should navigate to Profile while ordinary results reset in place',
);
assert.match(
  analyzeSource,
  /<AnalyzeMobileResults[\s\S]*onBack=\{handleMobileResultBack\}[\s\S]*onTitleClick=\{isLatestView \? handleMobileResultBack : undefined\}/,
  'Mobile results should make the title interactive only for latest results and share the back handler',
);
assert.match(
  analyzeSource,
  /<MobileAppBar[\s\S]*title=\{\([\s\S]*<button[\s\S]*onClick=\{onBack\}[\s\S]*mobileResultTitle[\s\S]*\}\)[\s\S]*leading=/,
  'Latest skeleton title should be a native button that uses the same back handler',
);
assert.match(
  analyzeSource,
  /!hasLatestError && \(currentTask\?\.status === 'success' \|\| hasLatestResult\)/,
  'Latest successes should render through the same guarded success renderer as ordinary results',
);
assert.match(
  analyzeSource,
  /<AnalyzeFailure message=\{latestError \?\? t\('common\.error'\)\} onReset=\{retryLatest\} \/>/,
  'Latest-fetch errors should use the existing retry failure state',
);
