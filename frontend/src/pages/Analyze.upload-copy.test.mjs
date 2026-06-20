import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(
  path.resolve(import.meta.dirname, 'Analyze.tsx'),
  'utf8',
);

const ruLocale = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8'),
);

assert.match(
  analyzeSource,
  /\{!showUploadForm && \(\s*<p className="mt-2 max-w-\[720px\] text-\[16px\] leading-6 text-text-body">\s*\{t\('analyze\.description'\)\}/,
  'Analyze upload screen should move the page description out of the top header',
);

assert.match(
  analyzeSource,
  /<h2 className="text-\[21px\] font-medium leading-tight text-primary">[\s\S]*\{t\('analyze\.uploadInstructionTitle'\)\}[\s\S]*<p className="mt-1\.5 text-\[14px\] leading-5 text-text-body">[\s\S]*\{t\('analyze\.description'\)\}/,
  'Analyze upload description should sit under the What to do heading',
);

assert.doesNotMatch(
  analyzeSource,
  /uploadInstructionBody|formatBytes\(MAX_ANALYZE_UPLOAD_BYTES\)/,
  'Analyze upload copy should not use the old dry instruction body or expose the upload size limit',
);

for (const [localeName, locale] of [
  ['ru', ruLocale],
  ['kk', kkLocale],
]) {
  const analyze = locale.analyze;
  const publicCopy = [
    analyze.description,
    analyze.uploadTitle,
    analyze.uploadHint,
    analyze.uploadDropHint,
    analyze.uploadInstructionBody,
    analyze.uploadStep1Title,
    analyze.uploadStep1Body,
    analyze.uploadStep2Title,
    analyze.uploadStep2Body,
    analyze.uploadStep3Title,
    analyze.uploadStep3Body,
    analyze.privacyNote,
    analyze.errors.fileTooLarge,
  ].join('\n');

  assert.doesNotMatch(
    publicCopy,
    /2\s*MB|2\s*МБ|{{size}}|Infopedia/,
    `${localeName} analyze upload copy should avoid technical limits and brand-as-actor wording`,
  );
}

assert.match(
  ruLocale.analyze.description,
  /Мы разберем/,
  'Russian analyze description should say "мы разберем"',
);

assert.doesNotMatch(
  ruLocale.analyze.privacyNote,
  /только для анализа текущего результата/,
  'Russian analyze helper note should not keep the old unhelpful file-use text',
);
