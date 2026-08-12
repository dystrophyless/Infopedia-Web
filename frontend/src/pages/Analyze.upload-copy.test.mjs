import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const analyzeSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const uploadSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopUploadGuide.tsx'),
  'utf8',
);
const ruLocale = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const kkLocale = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8'));

assert.match(
  analyzeSource,
  /eyebrow=\{!showUploadForm \? t\('analyze\.eyebrow'\) : undefined\}[\s\S]*description=\{!showUploadForm \? t\('analyze\.description'\) : undefined\}/,
  'Analyze upload screen should retain the compact page-title treatment',
);
assert.match(uploadSource, /md:hidden">\{t\('analyze\.uploadTitle'\)\}<\/p>/, 'adaptive upload should render the mobile PDF subtitle');
assert.match(uploadSource, /\{file\.name\}[\s\S]*t\('analyze\.selectedFileHint'\)/, 'selected state should render the real filename and alternate-file helper');
assert.match(uploadSource, /href="https:\/\/app\.testcenter\.kz"[\s\S]*target="_blank"/, 'mobile help copy should expose a real external help action');
assert.match(uploadSource, /submitting \? t\('common\.loading'\) : `\$\{t\('analyze\.submit'\)\} →`/, 'adaptive CTA should preserve loading and arrow copy');
assert.match(uploadSource, /aria-busy=\{submitting\}/, 'adaptive form should expose submission state accessibly');
assert.match(uploadSource, /focus-visible:ring-2|focus-within:ring-2/, 'upload controls and tutorial navigation should expose keyboard focus');
assert.match(
  uploadSource,
  /<MobileBenefitCard eyebrow=\{t\('analyze\.benefitWeakEyebrow'\)\}[\s\S]*<MobileBenefitCard eyebrow=\{t\('analyze\.benefitBooksEyebrow'\)\}[\s\S]*<MobileBenefitCard featured eyebrow=\{t\('analyze\.benefitPersonalEyebrow'\)/,
  'mobile benefit cards should keep all three localized outcomes',
);
assert.doesNotMatch(analyzeSource, /uploadInstructionBody|formatBytes\(MAX_ANALYZE_UPLOAD_BYTES\)|InstructionStep|AnalyzeBenefitCards/, 'Analyze should not retain legacy inline upload copy or helpers');

for (const [localeName, locale] of [['ru', ruLocale], ['kk', kkLocale]]) {
  const analyze = locale.analyze;
  const publicCopy = [
    analyze.description,
    analyze.uploadTitle,
    analyze.uploadHint,
    analyze.uploadDropHint,
    analyze.uploadInstructionBody,
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

  assert.doesNotMatch(publicCopy, /2\s*MB|2\s*МБ|{{size}}|Infopedia/, `${localeName} upload copy should avoid technical limits and brand-as-actor wording`);
}

assert.match(ruLocale.analyze.description, /Мы разберем/, 'Russian description should retain the approved copy');
assert.equal(kkLocale.analyze.desktopGuide.steps.length, 6, 'Kazakh tutorial should retain all six localized steps');
