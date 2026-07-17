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

assert.match(
  analyzeSource,
  /<AnalyzeProgress\s+currentTask=\{currentTask\}\s+file=\{file\}/,
  'Analyze should pass the selected uploaded file into the processing progress view',
);
assert.match(
  analyzeSource,
  /const ANALYZE_PROCESSING_HEADER_CLASS = '[^']*max-md:[^']*\[&>div>div>div\]:hidden[^']*\[&>div>div>p\]:hidden/,
  'Analyze processing header should hide eyebrow and description only on the mobile Figma composition',
);
assert.match(
  analyzeSource,
  /const ANALYZE_PROCESSING_PAGE_CLASS = `\$\{ANALYZE_PAGE_CLASS\} max-md:pt-\[88px\] max-md:px-6`;/,
  'Analyze processing page should scope the 24px mobile rail and 88px title offset to the waiting state',
);
assert.match(
  analyzeSource,
  /className=\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing \? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS\}/,
  'Analyze should select processing-specific mobile header spacing without changing desktop result/header behavior',
);
assert.match(
  analyzeSource,
  /export function AnalyzeProgress\(\{[\s\S]*file\?: File \| null/,
  'AnalyzeProgress should accept optional file metadata without breaking existing consumers',
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
  /const progressPercent = Number\.isFinite\(sourceProgressPercent\)[\s\S]*Math\.min\(100, Math\.max\(0, sourceProgressPercent\)\)/,
  'AnalyzeProgress should clamp the shared displayed and aria progress value to 0..100',
);
assert.match(
  analyzeSource,
  /max-md:w-full max-md:rounded-\[8px\] max-md:bg-\[#ffffff\] max-md:p-8/,
  'AnalyzeProgress mobile processing card should use the Figma white 32px-padded surface',
);
assert.match(
  analyzeSource,
  /getStageLabel\(currentStage, t\)/,
  'AnalyzeProgress desktop body should retain localized stage semantics',
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
