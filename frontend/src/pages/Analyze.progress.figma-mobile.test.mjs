import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);
const storiesSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.stories.tsx'),
  'utf8',
);
const frameSource = readFileSync(
  path.resolve(import.meta.dirname, '../ui/patterns/MobilePageFrame.tsx'),
  'utf8',
);
const pinnedAppBarSource = readFileSync(
  path.resolve(import.meta.dirname, '../ui/patterns/MobilePinnedAppBar.tsx'),
  'utf8',
);
const appBarSource = readFileSync(
  path.resolve(import.meta.dirname, '../ui/molecules/MobileAppBar.tsx'),
  'utf8',
);
const tokensSource = readFileSync(
  path.resolve(import.meta.dirname, '../styles/tokens.css'),
  'utf8',
);

assert.match(
  analyzeSource,
  /<AnalyzeProgress\s+progressSnapshot=\{progressSnapshot\}\s+file=\{file\}/,
  'Analyze should pass the shared snapshot and selected uploaded file into the legacy progress view',
);
assert.match(
  analyzeSource,
  /const ANALYZE_PROCESSING_HEADER_CLASS = '[^']*max-md:[^']*\[&>div>div>div\]:hidden[^']*\[&>div>div>p\]:hidden/,
  'Analyze processing header should hide eyebrow and description only on the mobile Figma composition',
);
assert.match(
  analyzeSource,
  /const ANALYZE_PROCESSING_PAGE_CLASS = `\$\{ANALYZE_PAGE_CLASS\} max-md:max-w-none max-md:bg-\[#efebf6\] max-md:px-0 max-md:py-0[^`]*`;/,
  'Analyze processing page should use the full mobile canvas for the canonical frame',
);
assert.doesNotMatch(
  analyzeSource,
  /ANALYZE_PROCESSING_PAGE_CLASS = `[^`]*max-md:pt-\[88px\][^`]*`/,
  'Analyze processing page must not retain the obsolete 88px mobile title offset',
);
assert.doesNotMatch(
  analyzeSource,
  /ANALYZE_PROCESSING_PAGE_CLASS = `[^`]*max-md:px-6[^`]*`/,
  'Analyze processing page must not retain the obsolete 24px mobile horizontal compensation',
);
assert.match(
  analyzeSource,
  /className=\{`\$\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing \? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS\} \$\{isMobileResult \? 'max-md:hidden' : ''\} \$\{showDesktopUploadGuide \? 'min-\[1440px\]:hidden' : ''\}`\}/,
  'Analyze should select processing-specific mobile header spacing without changing desktop result/header behavior',
);
assert.match(
  analyzeSource,
  /export function AnalyzeProgress\(\{[\s\S]*file\?: File \| null[\s\S]*onBack\?: \(\) => void/,
  'AnalyzeProgress should accept optional file metadata and a mobile back callback',
);
assert.match(
  analyzeSource,
  /export function AnalyzeProgress\([\s\S]*const content = \([\s\S]*if \(!onBack\) return content;[\s\S]*<MobilePageFrame[\s\S]*appBar=\{\{[\s\S]*title: t\('analyze\.mobileResultTitle'\)[\s\S]*titleAlign: 'start'[\s\S]*compactLayout: 'leading-only'[\s\S]*leading:/,
  'AnalyzeProgress should wrap mobile processing content in a leading-only structured frame app bar',
);
assert.match(
  frameSource,
  /<MobilePinnedAppBar[\s\S]*scrollRootRef=\{scrollMode === 'content' \? scrollViewportRef : undefined\}/,
  'MobilePageFrame should delegate the mobile top rail to the pinned app-bar pattern with the content scroll root',
);
assert.match(
  pinnedAppBarSource,
  /pt-\[var\(--mobile-page-app-bar-offset\)\][\s\S]*MobileAppBar \{\.\.\.appBarProps\} tone="transparent" size="compact" safeArea=\{false\} sticky=\{false\}/,
  'MobilePinnedAppBar should own the compact mobile top rail and app-bar configuration',
);
assert.match(pinnedAppBarSource, /IntersectionObserver/, 'MobilePinnedAppBar should own pinning observer behavior');
assert.match(
  frameSource,
  /showCanonicalAppBar && 'pt-8 md:pt-0'/,
  'MobilePageFrame should own the canonical 32px main-content gap',
);
assert.match(tokensSource, /--mobile-page-app-bar-offset:\s*80px;/, 'Canonical mobile app-bar rail must remain 80px');
assert.match(appBarSource, /grid h-6 min-h-6 grid-cols-\[24px_minmax\(0,1fr\)_24px\]/, 'Compact app bar should own the 24px visual row');
assert.match(appBarSource, /absolute left-1\/2 top-1\/2 flex size-11/, 'Compact app bar should own the centered 44px action target');
assert.equal(80 + 24 + 32, 136, 'Processing content should begin at canonical y=136');
assert.match(
  analyzeSource,
  /<section[^>]*className="overflow-hidden[^\"]*md:mt-6[^\"]*max-md:overflow-visible/,
  'Processing content should have no mobile margin while retaining desktop spacing',
);
assert.doesNotMatch(
  analyzeSource,
  /aria-label=\{t\('analyze\.mobileResultBack'\)\}\s+className="[^"]*(?:size-10|size-6)[^"]*"/,
  'Analyze frame leading actions must not override the compact action-slot geometry',
);
assert.match(
  analyzeSource,
  /hidden max-md:block[\s\S]*size-36[\s\S]*<svg[\s\S]*viewBox="0 0 144 144"[\s\S]*text-\[32px\]/,
  'AnalyzeProgress should expose the 144px mobile SVG circular percentage visual',
);
assert.doesNotMatch(analyzeSource, /conic-gradient/, 'AnalyzeProgress mobile ring should not use a conic-gradient');
assert.match(
  analyzeSource,
  /r="68"[\s\S]*strokeWidth="8"[\s\S]*strokeLinecap="round"[\s\S]*pathLength="100"/,
  'AnalyzeProgress mobile ring should use the restored 8px stroke, 68px radius, and rounded cap',
);
assert.match(
  analyzeSource,
  /progressPercent > 0[\s\S]*progressPercent >= 100 \? '100' : `\$\{progressPercent\} 100`/,
  'AnalyzeProgress mobile ring should avoid zero-progress caps and full-circle seam overlap',
);
assert.match(
  analyzeSource,
  /const \{ percent: progressPercent, effectiveStage \} = progressSnapshot/,
  'AnalyzeProgress should consume the shared displayed, aria, fill, and effective-stage snapshot',
);
assert.match(
  analyzeSource,
  /max-md:w-full max-md:rounded-\[8px\] max-md:bg-\[#ffffff\] max-md:p-8/,
  'AnalyzeProgress mobile processing card should use the Figma white 32px-padded surface',
);
assert.match(
  analyzeSource,
  /getStageLabel\(effectiveStage, t\)/,
  'AnalyzeProgress legacy label should use the monotonic effective phase instead of a stale raw stage',
);
assert.match(
  analyzeSource,
  /<div className="p-8 max-md:p-5 max-md:hidden">/,
  'AnalyzeProgress desktop progress body should be hidden in the mobile composition',
);
assert.match(
  analyzeSource,
  /t\('analyze\.mobileProgressCaption'\)/,
  'AnalyzeProgress mobile caption should use the exact Figma-specific localized copy',
);
const ruTranslations = readFileSync(
  path.resolve(import.meta.dirname, '../locales/ru/translation.json'),
  'utf8',
);
assert.match(
  ruTranslations,
  /"mobileProgressCaption":\s*"Разбираем главы и баллы\.\.\."/,
  'RU mobile progress caption should match the exact Figma ellipsis copy',
);
assert.match(
  analyzeSource,
  /Ваш файл|t\('analyze\.fileEyebrow'\)/,
  'AnalyzeProgress mobile file card should include the selected-file eyebrow',
);
assert.match(
  analyzeSource,
  /DocumentAttachmentIcon/,
  'AnalyzeProgress mobile file metadata should use the HugeIcons attachment icon',
);
assert.match(
  analyzeSource,
  /<HugeiconsIcon icon=\{DocumentAttachmentIcon\} size=\{32\} strokeWidth=\{1\.5\} className="shrink-0 text-\[#6a37c3\]" \/>/,
  'AnalyzeProgress mobile file metadata icon should use a 1.5px stroke',
);
assert.match(
  analyzeSource,
  /<HugeiconsIcon icon=\{DocumentAttachmentIcon\} size=\{32\} strokeWidth=\{1\.5\} \/>/,
  'Analyze upload dropzone should use the DocumentAttachmentIcon at the original size and stroke',
);
assert.match(
  analyzeSource,
  /<p className="text-\[12px\] font-medium leading-3 text-\[#865bcf\]">\{t\('analyze\.fileEyebrow'\)\}/,
  'AnalyzeProgress mobile file eyebrow should use Medium weight',
);
assert.match(
  analyzeSource,
  /formatAnalyzeFileSize\(file\.size\)/,
  'AnalyzeProgress mobile file card should show a formatted uploaded-file size',
);
assert.match(
  storiesSource,
  /export const ProcessingUploadedFileMobile430:[\s\S]*value: 'mobile430'[\s\S]*pt-\[88px\][\s\S]*Анализ ЕНТ[\s\S]*new File\(\[[\s\S]*analysis\.pdf/,
  'Analyze should expose a 430px processing page composition with title offset and an actual uploaded PDF file',
);
assert.match(
  storiesSource,
  /export const ProcessingUploadedFileMobile430:[\s\S]*stage:\s*'parsing'[\s\S]*progressOverride=\{78\}/,
  'The 78% mobile behavior fixture should truthfully map to analysis',
);
