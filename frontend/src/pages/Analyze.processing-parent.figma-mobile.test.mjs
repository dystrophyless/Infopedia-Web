import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);

assert.match(
  analyzeSource,
  /eyebrow=\{!showUploadForm \? t\('analyze\.eyebrow'\) : undefined\}/,
  'Analyze processing parent should keep the desktop eyebrow while the mobile composition hides it at the PageHeader field level',
);
assert.match(
  analyzeSource,
  /description=\{!showUploadForm \? t\('analyze\.description'\) : undefined\}/,
  'Analyze processing parent should keep the desktop description while the mobile composition hides it at the PageHeader field level',
);
assert.match(
  analyzeSource,
  /eyebrowClassName=\{isProcessing \? 'max-md:hidden' : undefined\}/,
  'Analyze processing parent should hide only the eyebrow field on mobile',
);
assert.match(
  analyzeSource,
  /descriptionClassName=\{isProcessing \? 'max-md:hidden' : undefined\}/,
  'Analyze processing parent should hide only the description field on mobile',
);
assert.match(
  analyzeSource,
  /ANALYZE_PROCESSING_HEADER_CLASS = '[^']*max-md:mb-6/,
  'Analyze processing parent should retain the Figma mobile title-to-card spacing variant',
);
