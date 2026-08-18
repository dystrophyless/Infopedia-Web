import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const uploadSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopUploadGuide.tsx'),
  'utf8',
);
const analyzeStoriesSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.stories.tsx'), 'utf8');
const storybookPreviewSource = readFileSync(path.resolve(import.meta.dirname, '../../.storybook/preview.ts'), 'utf8');

assert.match(
  analyzeStoriesSource,
  /export const UploadFileSelectedMobile430:[\s\S]*value: 'mobile430'[\s\S]*analysis\.pdf/,
  'Analyze should expose a 430x932 selected-PDF story for the Figma mobile upload state',
);
assert.match(storybookPreviewSource, /mobile430:[\s\S]*width: '430px'[\s\S]*height: '932px'/, 'Storybook should retain the 430x932 mobile viewport');
assert.match(storybookPreviewSource, /desktop1231:[\s\S]*width: '1231px'[\s\S]*height: '800px'/, 'Storybook should define the reported 1231x800 intermediate viewport');

assert.match(
  analyzeSource,
  /const ANALYZE_UPLOAD_PAGE_CLASS = '[^']*max-md:px-0[^']*min-\[1440px\]:px-16[^']*min-\[1440px\]:py-8';/,
  'Analyze upload page should delegate mobile rails to the adaptive component and preserve exact 1440 page padding',
);
assert.match(
  analyzeSource,
  /<PageContainer\s+width="full"\s+gutter="none"\s+className=\{showUploadForm \? ANALYZE_UPLOAD_PAGE_CLASS : isProcessing \? ANALYZE_PROCESSING_PAGE_CLASS : isMobileResult \? ANALYZE_RESULTS_PAGE_CLASS : ANALYZE_PAGE_CLASS\}/,
  'Analyze should select one upload page class without a breakpoint-only branch',
);
assert.match(
  analyzeSource,
  /<PageHeader\s+className=\{`\$\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : isProcessing \? ANALYZE_PROCESSING_HEADER_CLASS : ANALYZE_HEADER_CLASS\} \$\{isMobileResult \? 'max-md:hidden' : ''\} \$\{showUploadForm \? 'min-\[1440px\]:hidden' : ''\}`\}/,
  'Analyze should keep the compact upload header below 1440 while the exact 1440 composition owns its title treatment',
);

assert.equal((uploadSource.match(/<form\b/g) ?? []).length, 1, 'adaptive upload should own one form');
assert.equal((uploadSource.match(/type="file"/g) ?? []).length, 1, 'adaptive upload should own one native file input');
assert.match(
  uploadSource,
  /h-\[214px\][\s\S]*border-2[\s\S]*border-dashed[\s\S]*px-12 py-12[\s\S]*md:h-\[196px\]/,
  'one dropzone should preserve the 214px mobile anatomy and exact 196px desktop height',
);
assert.match(
  uploadSource,
  /size-16[\s\S]*bg-\[#ded2f1\][\s\S]*text-\[#572d9f\][\s\S]*md:size-12/,
  'empty upload circle should preserve the 64px mobile lavender state and adapt to the desktop geometry',
);
assert.match(uploadSource, /DocumentAttachmentIcon[\s\S]*File02Icon/, 'adaptive dropzone should use HugeIcons in both responsive states');
assert.doesNotMatch(uploadSource, /figma-document-attachment\.svg/, 'adaptive dropzone should not use a custom attachment SVG');
assert.match(uploadSource, /UserAiIcon,[\s\S]*} from '@hugeicons\/core-free-icons';/, 'mobile benefits should import the selected HugeIcons export');
assert.match(
  uploadSource,
  /<HugeiconsIcon icon=\{UserAiIcon\} size=\{32\} strokeWidth=\{1\.5\} className="shrink-0 text-\[#6a37c3\]" aria-hidden="true" \/>/,
  'mobile benefits should render the exact decorative 32px purple UserAiIcon contract',
);
assert.doesNotMatch(uploadSource, /figma-user-ai\.svg/, 'mobile benefits should not retain the migrated public SVG path');
assert.equal(existsSync(path.resolve(import.meta.dirname, '../../public/figma-user-ai.svg')), false, 'the migrated public SVG file must stay removed');
assert.match(
  uploadSource,
  /<section className="mt-12 pb-8 md:hidden" data-analyze-mobile-benefits>[\s\S]*\{t\('analyze\.benefitsTitle'\)\}[\s\S]*<MobileBenefitCard/,
  'adaptive component should preserve the mobile benefits section after the CTA',
);
assert.match(
  uploadSource,
  /mt-6 grid grid-cols-1 gap-4 min-\[360px\]:grid-cols-2 min-\[360px\]:gap-2/,
  'mobile benefits should stack at 320px and use a 2+1 grid from 360px',
);
assert.match(
  uploadSource,
  /type="submit"[\s\S]*h-12 w-full[\s\S]*md:h-10[\s\S]*min-\[1440px\]:w-\[326px\]/,
  'one submit action should span the mobile rail and preserve the exact desktop control geometry',
);
assert.doesNotMatch(analyzeSource, /showDesktopUploadGuide|ANALYZE_EMPTY_DESKTOP_PAGE_CLASS|<form\b|type="file"/, 'Analyze should not retain the legacy upload branch or form');
assert.doesNotMatch(uploadSource, /max-md:rounded-none/, 'adaptive upload should retain rounded mobile cards');
