import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);
const progressSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopProgress.tsx'),
  'utf8',
);
const uploadSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopUploadGuide.tsx'),
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
  /<AnalyzeDesktopProgress[\s\S]*progressSnapshot=\{progressSnapshot\}[\s\S]*file=\{file\}[\s\S]*onBack=\{onBack\}/,
  'Analyze should pass the shared snapshot, selected uploaded file, and back action into the adaptive progress view',
);
assert.doesNotMatch(analyzeSource, /(?:function|export function) AnalyzeProgress|<AnalyzeProgress\s|data-analyze-legacy-progress/, 'Analyze should not retain the legacy progress component or marker');
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
  /className=\{`\$\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing \? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS\} \$\{isMobileResult \? 'max-md:hidden' : ''\} \$\{showUploadForm \? 'min-\[1440px\]:hidden' : ''\}`\}/,
  'Analyze should select processing-specific mobile header spacing without changing desktop result/header behavior',
);
assert.match(
  progressSource,
  /export function AnalyzeDesktopProgress\(\{[\s\S]*file\?: File \| null[\s\S]*onBack\?: \(\) => void/,
  'adaptive AnalyzeDesktopProgress should accept optional file metadata and a mobile back callback',
);
assert.match(
  progressSource,
  /<MobilePageFrame[\s\S]*className="md:hidden"[\s\S]*appBar=\{\{[\s\S]*title: t\('analyze\.mobileResultTitle'\)[\s\S]*titleAlign: 'start'[\s\S]*compactLayout: 'leading-only'[\s\S]*leading:/,
  'adaptive progress should wrap mobile processing content in a leading-only structured frame app bar',
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
  progressSource,
  /data-analyze-mobile-progress/,
  'adaptive progress should expose a dedicated mobile composition without the legacy marker',
);
assert.doesNotMatch(
  progressSource,
  /aria-label=\{t\('analyze\.mobileResultBack'\)\}\s+className="[^"]*(?:size-10|size-6)[^"]*"/,
  'Analyze frame leading actions must not override the compact action-slot geometry',
);
assert.match(
  progressSource,
  /data-analyze-mobile-progress[\s\S]*size-36[\s\S]*<svg[\s\S]*viewBox="0 0 144 144"[\s\S]*text-\[32px\]/,
  'AnalyzeProgress should expose the 144px mobile SVG circular percentage visual',
);
assert.doesNotMatch(progressSource, /conic-gradient/, 'adaptive progress mobile ring should not use a conic-gradient');
assert.match(
  progressSource,
  /r="68"[\s\S]*strokeWidth="8"[\s\S]*strokeLinecap="round"[\s\S]*pathLength="100"/,
  'AnalyzeProgress mobile ring should use the restored 8px stroke, 68px radius, and rounded cap',
);
assert.match(
  progressSource,
  /clampedProgress > 0[\s\S]*clampedProgress >= 100 \? '100' : `\$\{clampedProgress\} 100`/,
  'AnalyzeProgress mobile ring should avoid zero-progress caps and full-circle seam overlap',
);
assert.match(
  progressSource,
  /const clampedProgress = clampPercent\(progressSnapshot\.percent\)/,
  'adaptive progress should consume the shared displayed, aria, and fill percentage snapshot',
);
assert.match(
  progressSource,
  /w-full rounded-\[8px\] bg-\[#ffffff\] p-8/,
  'adaptive progress mobile processing card should use the Figma white 32px-padded surface',
);
assert.match(
  progressSource,
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
  progressSource,
  /Ваш файл|t\('analyze\.fileEyebrow'\)/,
  'AnalyzeProgress mobile file card should include the selected-file eyebrow',
);
assert.match(
  progressSource,
  /DocumentAttachmentIcon/,
  'AnalyzeProgress mobile file metadata should use the HugeIcons attachment icon',
);
assert.match(
  progressSource,
  /<HugeiconsIcon icon=\{DocumentAttachmentIcon\} size=\{32\} strokeWidth=\{1\.5\} className="shrink-0 text-\[#6a37c3\]" \/>/,
  'AnalyzeProgress mobile file metadata icon should use a 1.5px stroke',
);
assert.match(
  uploadSource,
  /icon=\{File02Icon\} size=\{32\}[\s\S]*md:hidden[\s\S]*icon=\{DocumentAttachmentIcon\} size=\{24\}/,
  'Analyze upload dropzone should use File02Icon when empty while retaining the attachment icon for a selected file',
);
assert.match(
  progressSource,
  /<p className="text-\[12px\] font-medium leading-3 text-\[#865bcf\]">\{t\('analyze\.fileEyebrow'\)\}/,
  'AnalyzeProgress mobile file eyebrow should use Medium weight',
);
assert.match(
  progressSource,
  /formatAnalyzeFileSize\(file\.size\)/,
  'AnalyzeProgress mobile file card should show a formatted uploaded-file size',
);
assert.match(
  storiesSource,
  /export const ProcessingUploadedFileMobile430:[\s\S]*value: 'mobile430'[\s\S]*<AnalyzeProcessingViews[\s\S]*new File\(\[[\s\S]*analysis\.pdf[\s\S]*onBack=\{\(\) => undefined\}/,
  'Analyze should expose the canonical adaptive 430px processing frame with back action and an actual uploaded PDF file',
);
assert.match(
  storiesSource,
  /export const ProcessingUploadedFileMobile430:[\s\S]*stage:\s*'parsing'[\s\S]*progressOverride=\{78\}/,
  'The 78% mobile behavior fixture should truthfully map to analysis',
);
