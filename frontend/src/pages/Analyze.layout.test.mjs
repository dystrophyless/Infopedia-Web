import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);
const analyzeStoriesSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.stories.tsx'),
  'utf8',
);
const storybookPreviewSource = readFileSync(
  path.resolve(import.meta.dirname, '../../.storybook/preview.ts'),
  'utf8',
);

assert.match(
  analyzeStoriesSource,
  /export const UploadFileSelectedMobile430:[\s\S]*value: 'mobile430'[\s\S]*analysis\.pdf/,
  'Analyze should expose a 430x932 selected-PDF story for the Figma mobile upload state',
);
assert.match(
  storybookPreviewSource,
  /mobile430:[\s\S]*width: '430px'[\s\S]*height: '932px'/,
  'Storybook mobile430 viewport should be configured as 430x932',
);
assert.match(
  analyzeStoriesSource,
  /export const UploadFileSelectedMobile430:[\s\S]*color-contrast[\s\S]*enabled: false/,
  'Figma-locked 430px Analyze story should disable only axe color-contrast checks',
);
assert.match(
  analyzeStoriesSource,
  /UploadFileSelectedMobile430:[\s\S]*analysis\.pdf[\s\S]*getByText\('Нажмите, что бы выбрать другой файл'\)[\s\S]*getByRole\('button', \{ name: \/Начать анализ/,
  'Selected mobile story should assert the exact selected-file helper and enabled CTA',
);

assert.match(
  analyzeSource,
  /const ANALYZE_UPLOAD_PAGE_CLASS = 'mx-auto flex h-\[calc\(100dvh-80px\)\] w-full max-w-\[1180px\] flex-col overflow-hidden px-6 py-14 max-lg:h-auto max-lg:min-h-\[calc\(100dvh-80px\)\] max-lg:overflow-visible max-md:bg-\[#efebf6\] max-md:px-6';/,
  'Analyze upload screen should use Figma canvas and 24px mobile rail while fitting inside the post-navbar viewport on desktop',
);

assert.match(
  analyzeSource,
  /<PageContainer\s+width="full"\s+gutter="none"\s+className=\{showUploadForm \? ANALYZE_UPLOAD_PAGE_CLASS : isProcessing \? ANALYZE_PROCESSING_PAGE_CLASS : ANALYZE_PAGE_CLASS\}/,
  'Analyze page should use the shared page container while keeping upload and processing layouts',
);

assert.match(
  analyzeSource,
  /<PageHeader\s+className=\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing \? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS\}/,
  'Analyze upload header should use the shared header while processing uses the mobile Figma spacing and results keep the standard rhythm',
);

assert.match(
  analyzeSource,
  /<form onSubmit=\{handleSubmit\} className="flex min-h-0 flex-1 flex-col rounded-surface border border-border bg-surface p-5 shadow-feature max-lg:flex-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none">/,
  'Analyze upload form should retain the desktop surface while becoming a rail-aligned mobile layout',
);

assert.match(
  analyzeSource,
  /grid min-h-0 flex-1 grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\] gap-5 max-lg:grid-cols-1/,
  'Analyze upload columns should share the remaining height on desktop',
);

assert.match(
  analyzeSource,
  /group flex h-full min-h-\[260px\] cursor-pointer flex-col items-center justify-center[\s\S]*max-md:h-\[214px\] max-md:min-h-0 max-md:rounded-\[8px\] max-md:border-\[2px\] max-md:border-\[#a585db\][\s\S]*max-md:px-12 max-md:py-12/,
  'Analyze upload dropzone should match the 214px Figma panel, 2px dashed #A585DB outline, and 48px mobile padding',
);

assert.match(
  analyzeSource,
  /file \?[^:]+: 'bg-bg text-primary group-hover:bg-surface max-md:size-16 max-md:!bg-\[#ded2f1\] max-md:hover:!bg-\[#ded2f1\] max-md:focus-within:!bg-\[#ded2f1\] max-md:text-\[#572d9f\]'/,
  'Analyze empty upload circle should retain the deterministic mobile lavender fill on hover',
);

assert.match(
  analyzeSource,
  /strokeWidth=\{1\.5\}/,
  'Analyze upload glyph should use the 1.5px stroke in both empty and selected states',
);

assert.match(
  analyzeStoriesSource,
  /export const UploadEmptyMobile430:[\s\S]*value: 'mobile430'[\s\S]*getByRole\('button', \{ name: \/анализ\/i \}\)[\s\S]*toBeDisabled/,
  'Analyze should expose a disabled-CTA empty upload story at the Figma 430x932 viewport',
);

assert.match(
  analyzeSource,
  /file \?[\s\S]*size-16 bg-\[#6a37c3\] text-\[#ffffff\][\s\S]*<HugeiconsIcon icon=\{DocumentAttachmentIcon\} size=\{32\} strokeWidth=\{1\.5\} \/>/,
  'Analyze selected upload dropzone should keep the exact 64px purple circle and 1.5px 32px HugeIcons glyph',
);

assert.doesNotMatch(
  analyzeSource,
  /figma-document-attachment\.svg|DocumentAttachmentIcon[^\n]*max-md:hidden/,
  'Analyze upload dropzone should use one responsive-independent attachment glyph',
);

assert.match(
  analyzeSource,
  /src="\/figma-user-ai\.svg"[\s\S]*width=\{32\} height=\{32\}/,
  'Analyze benefits should render the local Figma user-AI asset at its exact 32px size',
);

assert.match(
  analyzeSource,
  /<div className="mt-12 hidden max-md:block">[\s\S]*<h2 className="text-\[20px\] font-medium leading-5 text-\[#572d9f\]">[\s\S]*\{t\('analyze\.benefitsTitle'\)\}[\s\S]*<AnalyzeBenefitCards \/>/,
  'Analyze upload screen should introduce the Figma benefits section after the mobile CTA',
);

assert.match(
  analyzeSource,
  /function AnalyzeBenefitCards\(\) \{[\s\S]*mt-6 grid grid-cols-2 gap-2[\s\S]*col-span-2 flex h-24 items-center gap-6 rounded-\[8px\] bg-\[#ffffff\] px-6 py-4/,
  'Analyze benefits should use two half cards followed by one full-width card on mobile',
);

assert.match(
  analyzeSource,
  /<p className="text-\[12px\] font-medium leading-3 text-\[#865bcf\]">\{eyebrow\}<\/p>[\s\S]*<h3 className="mt-1 text-\[16px\] font-normal leading-4 text-\[#161519\]">\{title\}<\/h3>/,
  'Analyze benefit cards should use medium eyebrows and regular-weight titles',
);

assert.match(
  analyzeSource,
  /<Button[\s\S]*type="submit"[\s\S]*className=\{`max-sm:w-full max-md:h-12 max-md:rounded-\[8px\] \$\{file \? 'max-md:bg-\[#6a37c3\] max-md:text-\[#ffffff\]' : 'max-md:bg-\[#ded2f1\] max-md:text-\[#a585db\]'\} disabled:opacity-100`\}/,
  'Analyze submit action should span the 382px mobile rail at the Figma 48px control height',
);

assert.doesNotMatch(
  analyzeSource,
  /className="mx-auto w-full max-w-\[1180px\] overflow-x-hidden px-6 py-12 max-md:px-4"/,
  'Analyze upload screen should not use the old always-scroll page padding',
);

assert.doesNotMatch(
  analyzeSource,
  /ANALYZE_UPLOAD_PAGE_CLASS = '[^']*py-12|ANALYZE_UPLOAD_PAGE_CLASS = '[^']*py-8 /,
  'Analyze upload page should keep the Figma 56px top rhythm',
);

assert.doesNotMatch(
  analyzeSource,
  /max-md:rounded-none/,
  'Analyze mobile upload surface should not discard the Figma card rounding through an old page-level override',
);
