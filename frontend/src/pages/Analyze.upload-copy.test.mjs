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
  /eyebrow=\{!showUploadForm \? t\('analyze\.eyebrow'\) : undefined\}[\s\S]*description=\{!showUploadForm \? t\('analyze\.description'\) : undefined\}/,
  'Analyze upload screen should match the compact Figma title treatment without an eyebrow or page description',
);

assert.match(
  analyzeSource,
  /<p className="mt-8 hidden text-\[20px\] font-medium leading-5 text-\[#572d9f\] max-md:block">\{t\('analyze\.uploadTitle'\)\}<\/p>/,
  'Analyze upload screen should render the Figma PDF-upload subtitle on mobile',
);

assert.match(
  analyzeSource,
  /<span className="mt-4 text-\[24px\][^"]*max-md:text-\[16px\][^"]*">[\s\S]*\{file \? file\.name : t\('analyze\.uploadHint'\)\}/,
  'Analyze dropzone should use the Figma upload prompt on mobile',
);

assert.match(
  analyzeSource,
  /<span className="mt-1\.5 text-\[15px\][^"]*max-md:text-\[14px\][^"]*max-md:leading-\[14px\][^"]*max-md:text-\[#a585db\]">[\s\S]*t\('analyze\.uploadDropHint'\)/,
  'Analyze dropzone should use the Figma learn-more helper copy when no file is selected',
);
assert.match(
  analyzeSource,
  /file \?[\s\S]*t\('analyze\.selectedFileHint'\)[\s\S]*file && !taskId/,
  'Analyze selected dropzone should use only the filename and exact alternate-file helper',
);
assert.match(
  analyzeSource,
  /file \?[\s\S]*size-16 bg-\[#6a37c3\] text-\[#ffffff\]/,
  'Analyze selected dropzone should use an unconditional 64px solid purple attachment circle',
);
assert.match(
  analyzeSource,
  /<HugeiconsIcon icon=\{DocumentAttachmentIcon\} size=\{32\} strokeWidth=\{1\.5\} \/>/,
  'Analyze dropzone should render one always-visible 32px HugeIcons attachment glyph with a 1.5px stroke in both states',
);
assert.doesNotMatch(
  analyzeSource,
  /figma-document-attachment\.svg|DocumentAttachmentIcon[^\n]*max-md:hidden/,
  'Analyze selected dropzone should not split the attachment glyph across responsive implementations',
);
assert.match(
  analyzeSource,
  /file && !taskId[\s\S]*hidden md:flex/,
  'Analyze selected file row should stay desktop-only to avoid a mobile duplicate',
);

assert.match(
  analyzeSource,
  /<span className="hidden max-md:inline">\{t\('analyze\.submit'\)\} →<\/span>/,
  'Analyze mobile CTA should include the Figma arrow without changing the desktop label',
);

assert.match(
  analyzeSource,
  /<AnalyzeBenefitCard eyebrow=\{t\('analyze\.benefitWeakEyebrow'\)\} title=\{t\('analyze\.benefitWeakTitle'\)\} body=\{t\('analyze\.benefitWeakBody'\)\} \/>[\s\S]*<AnalyzeBenefitCard eyebrow=\{t\('analyze\.benefitBooksEyebrow'\)\} title=\{t\('analyze\.benefitBooksTitle'\)\} body=\{t\('analyze\.benefitBooksBody'\)\} \/>[\s\S]*<AnalyzeBenefitCard icon=\{UserAiIcon\} eyebrow=\{t\('analyze\.benefitPersonalEyebrow'\)\} title=\{t\('analyze\.benefitPersonalTitle'\)\} body=\{t\('analyze\.benefitPersonalBody'\)\}/,
  'Analyze benefit cards should use localized copy for the three Figma outcomes',
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
    analyze.benefitsTitle,
    analyze.benefitWeakEyebrow,
    analyze.benefitWeakTitle,
    analyze.benefitWeakBody,
    analyze.benefitBooksEyebrow,
    analyze.benefitBooksTitle,
    analyze.benefitBooksBody,
    analyze.benefitPersonalEyebrow,
    analyze.benefitPersonalTitle,
    analyze.benefitPersonalBody,
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
