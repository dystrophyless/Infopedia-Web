import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';
import escapeClassNameModule from 'tailwindcss/lib/util/escapeClassName.js';

const frontendRoot = path.resolve(import.meta.dirname, '../..');
const escapeClassName = escapeClassNameModule.default ?? escapeClassNameModule;
const analyzeSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const failureSource = analyzeSource.slice(
  analyzeSource.indexOf('export function AnalyzeFailure'),
  analyzeSource.indexOf('export function AnalyzeMobileResults'),
);
assert.match(analyzeSource, /import \{[\s\S]*BetweenBlocks[\s\S]*EmptyState[\s\S]*\} from '\.\.\/ui';/, 'Analyze must consume the reusable sandwich and outcome primitives');
assert.match(failureSource, /<EmptyState[\s\S]*variant="outcome"[\s\S]*role="alert"/, 'Analyze failure must use the semantic shared outcome alert');
assert.match(failureSource, /<BetweenBlocks[\s\S]*data-analyze-failure-slot/, 'Analyze mobile failure must use BetweenBlocks');
assert.match(failureSource, /<MobilePageFrame[\s\S]*contentEndInset=\{false\}/, 'Analyze failure sandwich must end at the actual lower structural boundary');
const locales = ['ru', 'kk'].map((locale) => ({
  locale,
  translations: JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, `../locales/${locale}/translation.json`), 'utf8'),
  ),
}));

assert.match(
  analyzeSource,
  /getAnalyzeFailureKind[\s\S]*getAnalyzeFileFailureKind[\s\S]*from '\.\.\/features\/analyze\/model\/failurePresentation'/,
  'Analyze should classify task failures through the pure semantic mapper',
);
assert.match(
  analyzeSource,
  /getAnalyzeFailureKind\(currentTask\.error, currentTask\.stage\)/,
  'Task failures should use only the structured error and stage',
);
assert.doesNotMatch(
  analyzeSource,
  /getTaskErrorMessage|currentTask\.error\?\.message/,
  'Analyze must not render or derive presentation from backend error messages',
);
assert.match(
  analyzeSource,
  /const validationFailureKind = getAnalyzeFileFailureKind\(file, MAX_ANALYZE_UPLOAD_BYTES\);[\s\S]*setSubmitFailureKind\(validationFailureKind\)/,
  'Client file validation should retain its invalid-document semantic kind',
);
assert.match(
  analyzeSource,
  /catch \(err\) \{[\s\S]*const detail = getApiErrorClassificationDetail\(err\);[\s\S]*setSubmitFailureKind\(getAnalyzeFailureKind\(detail, detail\?\.stage\)\)/,
  'Synchronous Analyze HTTP failures should classify stable structured detail',
);
assert.match(
  analyzeSource,
  /const hasGenericFailure = Boolean\([\s\S]*sseError && !polling && !sseResult/,
  'Poll and SSE transport failures should collapse to the generic presentation',
);
assert.doesNotMatch(analyzeSource, /setSubmitError\(true\)/, 'Submit failures must not be collapsed to a boolean');
assert.match(
  analyzeSource,
  /<AnalyzeFailure[\s\S]*?kind=\{failureKind\}[\s\S]*?action="uploadAnother"[\s\S]*?onAction=\{reset\}/,
  'Upload-task failures should reset into another upload',
);
assert.match(
  analyzeSource,
  /<AnalyzeFailure[\s\S]*?kind="generic"[\s\S]*?action="retry"[\s\S]*?onAction=\{retryLatest\}/,
  'Latest-result transport failures should retry the latest request',
);
assert.match(
  failureSource,
  /kind: AnalyzeFailureKind;[\s\S]*action: AnalyzeFailureAction;[\s\S]*onAction: \(\) => void;[\s\S]*onBack: \(\) => void;/,
  'AnalyzeFailure should expose semantic content, action, and navigation props only',
);
assert.match(failureSource, /role="alert"/, 'Failure content should be announced assertively');
assert.match(failureSource, /<EmptyState[\s\S]*title=\{t\(`/, 'Failure title must be delegated to the shared semantic heading');
assert.match(failureSource, /title: t\('analyze\.title'\)/, 'Mobile failure app bar should say Analyze');
assert.match(failureSource, /compactLayout: 'leading-only'/, 'Mobile failure app bar should keep leading-only geometry');
assert.match(failureSource, /<MobilePageFrame[\s\S]*className="md:hidden"/, 'Mobile failure should use the canonical page frame');
assert.match(
  failureSource,
  /<BetweenBlocks[\s\S]*data-analyze-failure-slot[\s\S]*data-mobile-outcome-slot[\s\S]*className="px-6"[\s\S]*outcomeClassName="flex justify-center"/,
  'Mobile failure must use a full-height intrinsic outcome slot that centers when it fits and collapses without overlap when it does not',
);
assert.match(failureSource, /<MobilePageFrame[\s\S]*contentClassName="flex flex-col max-md:pt-0"/, 'Mobile failure slot must span from the actual compact app-bar rail');
const mobileFailureSource = failureSource.slice(failureSource.indexOf('data-analyze-failure-slot'));
assert.doesNotMatch(mobileFailureSource, /fixed|top-\[366px\]|50vh|translate|--shell-mobile-bottom-nav-height|100dvh\s*-\s*88px/, 'Mobile failure must reject fixed coordinates, transforms, and duplicate navigation subtraction');

assert.match(
  failureSource,
  /'data-analyze-failure-icon': ''[\s\S]*className: '!bg-\[#ded2f1\] max-md:!text-\[#6A37C3\] md:mb-6 md:text-action-emphasized'/,
  'Failure icon should use the exact 64px Figma circle',
);
assert.match(failureSource, /icon=\{FileCorruptIcon\} size=\{32\} strokeWidth=\{1\.6\}[\s\S]*className="md:hidden"/, 'Mobile failure should use the exact 32px file-error glyph');
assert.match(failureSource, /icon=\{FileSearchIcon\} size=\{32\} strokeWidth=\{1\.5\}[\s\S]*className="hidden md:block"/, 'Desktop failure should retain FileSearchIcon');
assert.match(
  failureSource,
  /'data-analyze-failure-title': ''[\s\S]*className: 'text-black md:text-text-strong'/,
  'Failure title should match the exact black mobile type and retain desktop spacing',
);
assert.match(
  failureSource,
  /'data-analyze-failure-description': ''[\s\S]*className: 'max-w-\[330px\] max-md:!text-\[#6e6779\] md:mt-3 md:text-muted'/,
  'Failure description should match the exact mobile type and retain desktop styling',
);
assert.match(
  failureSource,
  /data-analyze-failure-action[\s\S]*fullWidth[\s\S]*className="h-10 min-h-10 rounded-\[8px\] !bg-\[#6a37c3\] text-\[16px\] font-medium leading-\[16px\] !text-\[#ffffff\][^"]*hover:!bg-\[#6a37c3\][^"]*focus:!bg-\[#6a37c3\][^"]*focus-visible:!bg-\[#6a37c3\][^"]*active:!bg-\[#6a37c3\][^"]*md:w-auto md:min-w-\[180px\]/,
  'Failure CTA should match the exact mobile geometry, typography, and pinned interaction color',
);
assert.doesNotMatch(failureSource, /danger|AlertCircleIcon|border/, 'Failure state should not use warning or danger-border styling');

for (const { locale, translations } of locales) {
  const failure = translations.analyze.failure;
  for (const kind of ['invalidDocument', 'unsupportedDocument', 'extractionFailed', 'generic']) {
    assert.equal(typeof failure[kind].title, 'string', `${locale} should localize ${kind} title`);
    assert.equal(typeof failure[kind].description, 'string', `${locale} should localize ${kind} description`);
    assert.ok(failure[kind].title.length > 0, `${locale} ${kind} title should not be empty`);
    assert.ok(failure[kind].description.length > 0, `${locale} ${kind} description should not be empty`);
  }
  assert.equal(typeof failure.uploadAnother, 'string', `${locale} should localize upload another`);
  assert.equal(typeof failure.retry, 'string', `${locale} should localize retry`);
}
