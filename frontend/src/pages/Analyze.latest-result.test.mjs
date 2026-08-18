import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);
const skeletonSource = analyzeSource.slice(
  analyzeSource.indexOf('export function AnalyzeLatestResultSkeleton'),
  analyzeSource.indexOf('function AnalyzeLatestResultDesktopChapterSkeleton'),
);
const failureSource = analyzeSource.slice(
  analyzeSource.indexOf('export function AnalyzeFailure'),
  analyzeSource.indexOf('export function AnalyzeMobileResults'),
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
  /setLatestResults\(null\);[\s\S]*?setLatestError\(true\)/,
  'Latest-fetch errors should remain distinct from an empty latest result without retaining transport copy',
);
assert.match(
  analyzeSource,
  /setLatestRetryKey\(\(value\) => value \+ 1\)/,
  'Retrying the latest-result error should trigger the latest fetch effect again',
);
assert.match(
  analyzeSource,
  /<AnalyzeMobileResults[\s\S]*access=\{resultAccess\}/,
  'Latest results should use the canonical responsive result renderer',
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
  /const isLatestLoading = isLatestView && latestResults === undefined && !latestError/,
  'Latest fetch pending must have an explicit loading state',
);
assert.match(
  analyzeSource,
  /\{!isLatestLoading && !isMobileResult && \([\s\S]*?<PageHeader[\s\S]*?\n\s*\/>\s*\)\}/,
  'Latest fetch pending and result states must suppress the outer desktop header',
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
  /<section className="hidden md:block mt-8" aria-hidden="true">[\s\S]*<MobilePageFrame[\s\S]*className="md:hidden"[\s\S]*<div className="mx-auto w-full max-w-\[430px\] px-6 pb-8" aria-hidden="true">/,
  'Latest result skeleton should keep desktop placeholders separate from the canonical mobile frame',
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
  /<MobilePageFrame[\s\S]*appBar=\{\{[\s\S]*title:[\s\S]*<button[\s\S]*onClick=\{onBack\}[\s\S]*mobileResultTitle[\s\S]*leading:/,
  'Latest skeleton should configure a canonical frame with a native title button and shared back handler',
);
assert.match(skeletonSource, /titleAlign: 'start'/, 'Latest skeleton title should use leading alignment');
assert.match(skeletonSource, /compactLayout: 'leading-only'/, 'Latest skeleton app bar should use leading-only compact layout');
assert.match(skeletonSource, /<button[\s\S]*className="[^"]*text-left[^"]*"[\s\S]*mobileResultTitle/, 'Latest skeleton interactive title should align its text to the leading edge');
assert.doesNotMatch(skeletonSource, /aria-label=\{t\('analyze\.mobileResultBack'\)\}\s+className="[^"]*(?:size-10|size-6)[^"]*"/, 'Latest skeleton back action should inherit the frame-owned 44px target');
assert.match(skeletonSource, /HugeiconsIcon icon=\{ArrowLeft01Icon\} size=\{24\}/, 'Latest skeleton back action should retain the exact 24px glyph');
assert.match(skeletonSource, /<Skeleton shape="text" className="h-5 w-40" \/>/, 'Latest skeleton first mobile placeholder should have no local margin');
assert.match(failureSource, /<Surface tone="plain" className="hidden p-8 md:mt-6 md:block">/, 'Latest error content should retain a centered desktop surface separate from the canonical mobile frame');
assert.match(failureSource, /titleAlign: 'start'/, 'Latest error title should use leading alignment');
assert.match(failureSource, /compactLayout: 'leading-only'/, 'Latest error app bar should use leading-only compact layout');
assert.equal(80 + 24 + 32, 136, 'Latest loading should retain the canonical y=136 content anchor');
assert.match(
  failureSource,
  /<BetweenBlocks[\s\S]*data-analyze-failure-slot[\s\S]*outcomeClassName="flex justify-center"/,
  'Latest failure should share the adaptive mobile outcome slot instead of a fixed Figma y coordinate',
);
assert.match(
  analyzeSource,
  /!hasLatestError && \(currentTask\?\.status === 'success' \|\| hasLatestResult\)/,
  'Latest successes should render through the same guarded success renderer as ordinary results',
);
assert.match(
  analyzeSource,
  /<AnalyzeFailure[\s\S]*?kind="generic"[\s\S]*?action="retry"[\s\S]*?onAction=\{retryLatest\}[\s\S]*?onBack=\{handleMobileResultBack\}/,
  'Latest-fetch errors should use the localized generic retry failure state',
);
assert.match(
  analyzeSource,
  /const ANALYZE_PROCESSING_PAGE_CLASS = `[^`]*max-md:max-w-none[^`]*max-md:py-0[^`]*`/,
  'Ordinary processing should use the full mobile canvas around the canonical frame',
);
assert.match(
  analyzeSource,
  /<AnalyzeProcessingViews[\s\S]*onBack=\{handleMobileResultBack\}/,
  'Ordinary processing should expose the canonical mobile back action',
);
assert.match(
  analyzeSource,
  /<AnalyzeDesktopProgress[\s\S]*progressSnapshot=\{progressSnapshot\}[\s\S]*file=\{file\}[\s\S]*onBack=\{onBack\}/,
  'The adaptive processing wrapper should preserve the shared snapshot, selected file, and mobile back callback',
);
assert.doesNotMatch(
  analyzeSource,
  /(?:function|export function) AnalyzeProgress|<AnalyzeProgress\s|data-analyze-legacy-progress/,
  'The latest-result flow must not reintroduce the legacy AnalyzeProgress branch or marker',
);
