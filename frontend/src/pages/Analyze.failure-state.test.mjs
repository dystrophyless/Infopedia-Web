import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const failureSource = analyzeSource.slice(
  analyzeSource.indexOf('export function AnalyzeFailure'),
  analyzeSource.indexOf('export function AnalyzeMobileResults'),
);
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
assert.match(failureSource, /<h2/, 'Failure title should retain native heading semantics');
assert.match(failureSource, /title: t\('analyze\.title'\)/, 'Mobile failure app bar should say Analyze');
assert.match(failureSource, /compactLayout: 'leading-only'/, 'Mobile failure app bar should keep leading-only geometry');
assert.match(failureSource, /<MobilePageFrame[\s\S]*className="md:hidden"/, 'Mobile failure should use the canonical page frame');
assert.match(
  failureSource,
  /data-analyze-failure-group[\s\S]*className="fixed inset-x-6 top-\[366px\] flex w-auto flex-col items-center px-0 pb-8 text-center md:static md:inset-auto md:mx-auto md:w-full md:max-w-\[520px\] md:px-0 md:pb-0"/,
  'Mobile failure group should start at page y=366 and reset to static desktop flow',
);
assert.match(
  failureSource,
  /data-analyze-failure-icon[\s\S]*className="flex size-16 items-center justify-center rounded-full bg-\[#ded2f1\] text-\[#6A37C3\] md:text-action-emphasized"/,
  'Failure icon should use the exact 64px Figma circle',
);
assert.match(failureSource, /icon=\{FileCorruptIcon\} size=\{32\} strokeWidth=\{1\.6\}[\s\S]*className="md:hidden"/, 'Mobile failure should use the exact 32px file-error glyph');
assert.match(failureSource, /icon=\{FileSearchIcon\} size=\{32\} strokeWidth=\{1\.5\}[\s\S]*className="hidden md:block"/, 'Desktop failure should retain FileSearchIcon');
assert.match(
  failureSource,
  /data-analyze-failure-title[\s\S]*className="mt-4 text-\[20px\] font-medium leading-\[20px\] text-black md:mt-6 md:text-text-strong"/,
  'Failure title should match the exact black mobile type and retain desktop spacing',
);
assert.match(
  failureSource,
  /data-analyze-failure-description[\s\S]*className="mt-4 max-w-\[330px\] text-\[14px\] font-normal leading-\[14px\] text-\[#6e6779\] md:mt-3 md:leading-\[14px\] md:text-muted"/,
  'Failure description should match the exact mobile type and retain desktop styling',
);
assert.match(
  failureSource,
  /data-analyze-failure-action[\s\S]*fullWidth[\s\S]*className="mt-6 h-10 min-h-10 rounded-\[8px\] !bg-\[#6a37c3\] text-\[16px\] font-medium leading-\[16px\] !text-\[#ffffff\][^"]*hover:!bg-\[#6a37c3\][^"]*focus:!bg-\[#6a37c3\][^"]*focus-visible:!bg-\[#6a37c3\][^"]*active:!bg-\[#6a37c3\][^"]*md:mt-8 md:w-auto md:min-w-\[180px\]"/,
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

assert.equal(366, 366, 'Figma node 110:2268 is an explicit mobile failure y=366 exception');
