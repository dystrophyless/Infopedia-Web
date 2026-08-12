import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pageDir = import.meta.dirname;
const srcDir = path.resolve(pageDir, '..');
const modelPath = path.resolve(srcDir, 'features/analyze/model/desktopInstructions.ts');
const componentPath = path.resolve(srcDir, 'features/analyze/components/AnalyzeDesktopUploadGuide.tsx');
const pagePath = path.resolve(pageDir, 'Analyze.tsx');
const storiesPath = path.resolve(pageDir, 'Analyze.stories.tsx');
const visualPath = path.resolve(pageDir, 'Analyze.desktop-instructions.visual.mjs');
const ruPath = path.resolve(srcDir, 'locales/ru/translation.json');
const kkPath = path.resolve(srcDir, 'locales/kk/translation.json');
const assetDir = path.resolve(srcDir, '../public/figma/analyze-desktop');

assert.ok(existsSync(modelPath), 'desktop guide should define one page-local six-step model');
assert.ok(existsSync(componentPath), 'desktop guide should have one isolated page-local component');

const modelSource = readFileSync(modelPath, 'utf8');
const componentSource = readFileSync(componentPath, 'utf8');
const pageSource = readFileSync(pagePath, 'utf8');
const storiesSource = readFileSync(storiesPath, 'utf8');
const visualSource = readFileSync(visualPath, 'utf8');
const ru = JSON.parse(readFileSync(ruPath, 'utf8'));
const kk = JSON.parse(readFileSync(kkPath, 'utf8'));

const stepAssets = Array.from({ length: 6 }, (_, index) => `step-${index + 1}.png`);
for (const asset of stepAssets) {
  assert.ok(existsSync(path.join(assetDir, asset)), `${asset} should be the exact downloaded Figma screenshot asset`);
  assert.match(modelSource, new RegExp(`/figma/analyze-desktop/${asset.replace('.', '\\.')}`));
}

assert.equal((modelSource.match(/imageSrc:/g) ?? []).length, 6, 'guide model should expose exactly six screenshots');
assert.match(modelSource, /externalUrl:\s*'https:\/\/app\.testcenter\.kz'/, 'step one should own the bounded external URL');
assert.equal((modelSource.match(/externalUrl:/g) ?? []).length, 1, 'only step one should expose an external CTA');

assert.match(visualSource, /expectedImageDimensions/, 'visual evidence should define exact intrinsic image dimensions');
assert.match(visualSource, /waitForFunction[\s\S]*image\.complete[\s\S]*image\.naturalWidth > 0[\s\S]*image\.naturalHeight > 0/, 'visual evidence should wait for the active instructional image to decode');
assert.match(visualSource, /assert\.deepEqual\(result\.image[\s\S]*expectedImageDimensions/, 'visual evidence should assert exact instructional image dimensions before capture');

assert.match(componentSource, /useState\(initialStep\)/, 'guide should keep local active-step state');
assert.match(componentSource, /data-analyze-desktop-track/, 'guide should expose the 990x82 top-track geometry');
assert.match(componentSource, /data-analyze-desktop-guide/, 'guide should expose the 600x697 tutorial geometry');
assert.match(componentSource, /data-analyze-desktop-upload/, 'guide should expose the 374x421 empty-upload geometry');
assert.match(componentSource, /data-analyze-desktop-benefits/, 'guide should expose the 374x260 two-benefit geometry');
assert.match(componentSource, /target="_blank"/, 'step-one Testcenter CTA should open in a new tab');
assert.match(componentSource, /Clock01Icon/, 'duration should use the exact HugeIcons clock glyph');
assert.match(componentSource, /DocumentAttachmentIcon/, 'dropzone should use the exact HugeIcons attachment glyph');
assert.match(componentSource, /ArrowLeft01Icon[\s\S]*ArrowRight01Icon/, 'tutorial navigation should use HugeIcons arrows');

assert.match(pageSource, /showUploadForm && \(\s*<AnalyzeDesktopUploadGuide/, 'the adaptive guide should own every upload viewport');
assert.doesNotMatch(pageSource, /showDesktopUploadGuide/, 'Analyze should not retain a breakpoint-only guide branch');
assert.doesNotMatch(pageSource, /hidden min-\[1440px\]:block[\s\S]*<AnalyzeDesktopUploadGuide/, 'the adaptive guide must not be hidden below 1440px');
assert.doesNotMatch(pageSource, /(?:function )?InstructionStep|(?:function )?AnalyzeBenefitCards|<form\b|type="file"|id="analyze-file/, 'Analyze should not retain legacy upload markup or helpers');
assert.equal((componentSource.match(/<form\b/g) ?? []).length, 1, 'adaptive guide should own exactly one form');
assert.equal((componentSource.match(/type="file"/g) ?? []).length, 1, 'adaptive guide should own exactly one native file input');
assert.equal((componentSource.match(/id="analyze-file"/g) ?? []).length, 1, 'adaptive guide should expose one stable input id');
assert.equal((componentSource.match(/htmlFor="analyze-file"/g) ?? []).length, 1, 'adaptive guide should expose one matching file label');
assert.doesNotMatch(componentSource, /analyze-file-desktop/, 'adaptive guide should not retain a duplicate desktop input id');
assert.match(storiesSource, /export const UploadEmptyDesktop1231:/, 'Storybook should expose the adaptive guide at the reported 1231px viewport');

for (const [localeName, locale] of [['ru', ru], ['kk', kk]]) {
  const guide = locale.analyze.desktopGuide;
  assert.ok(guide, `${localeName} should localize the desktop tutorial`);
  assert.equal(guide.steps.length, 6, `${localeName} should localize all six tutorial steps`);
  assert.equal(guide.benefits.length, 2, `${localeName} should localize exactly two benefit rows`);
}

assert.equal(ru.analyze.desktopGuide.steps[0].title, 'Войдите в личный кабинет');
assert.equal(ru.analyze.desktopGuide.steps[5].body, 'Вы успешно получили свой PDF');
assert.equal(kk.analyze.desktopGuide.steps[0].title, 'Жеке кабинетке кіріңіз');
assert.equal(kk.analyze.desktopGuide.steps[5].body, 'PDF файлыңыз сәтті алынды');

for (let step = 1; step <= 6; step += 1) {
  assert.match(storiesSource, new RegExp(`export const DesktopGuideStep${step}:`), `Storybook should expose desktop guide step ${step}`);
}

console.log('Analyze desktop instruction Figma contract passed');
