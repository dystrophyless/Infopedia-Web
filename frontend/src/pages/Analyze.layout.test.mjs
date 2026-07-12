import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);

assert.match(
  analyzeSource,
  /const ANALYZE_UPLOAD_PAGE_CLASS = 'mx-auto flex h-\[calc\(100dvh-80px\)\] w-full max-w-\[1180px\] flex-col overflow-hidden px-6 py-14 max-lg:h-auto max-lg:min-h-\[calc\(100dvh-80px\)\] max-lg:overflow-visible max-md:px-4';/,
  'Analyze upload screen should use the same top spacing as search while fitting inside the post-navbar viewport on desktop',
);

assert.match(
  analyzeSource,
  /<PageContainer\s+width="full"\s+gutter="none"\s+className=\{showUploadForm \? ANALYZE_UPLOAD_PAGE_CLASS : ANALYZE_PAGE_CLASS\}/,
  'Analyze page should use the shared page container while keeping its viewport-fit upload layout',
);

assert.match(
  analyzeSource,
  /<PageHeader\s+className=\{showUploadForm \? ANALYZE_UPLOAD_HEADER_CLASS : ANALYZE_HEADER_CLASS\}/,
  'Analyze upload header should use the shared header while non-upload states keep the standard rhythm',
);

assert.match(
  analyzeSource,
  /<form onSubmit=\{handleSubmit\} className="flex min-h-0 flex-1 flex-col rounded-surface border border-border bg-surface p-5 shadow-feature max-lg:flex-none max-md:rounded-none max-md:shadow-none">/,
  'Analyze upload form should fill the remaining viewport height without forcing page scroll',
);

assert.match(
  analyzeSource,
  /grid min-h-0 flex-1 grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\] gap-5 max-lg:grid-cols-1/,
  'Analyze upload columns should share the remaining height on desktop',
);

assert.match(
  analyzeSource,
  /group flex h-full min-h-\[260px\] cursor-pointer flex-col items-center justify-center/,
  'Analyze upload dropzone should shrink from its old 320px minimum while still keeping a stable hit area',
);

assert.doesNotMatch(
  analyzeSource,
  /className="mx-auto w-full max-w-\[1180px\] overflow-x-hidden px-6 py-12 max-md:px-4"/,
  'Analyze upload screen should not use the old always-scroll page padding',
);

assert.doesNotMatch(
  analyzeSource,
  /py-12|py-8 max-lg:h-auto|max-md:py-6/,
  'Analyze upload screen should not keep a tighter top rhythm than search',
);

assert.doesNotMatch(
  analyzeSource,
  /min-h-\[320px\] cursor-pointer/,
  'Analyze upload dropzone should not keep the old oversized minimum height',
);
