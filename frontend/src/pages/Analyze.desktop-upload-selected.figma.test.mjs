import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentSource = readFileSync(
  path.resolve(import.meta.dirname, '../features/analyze/components/AnalyzeDesktopUploadGuide.tsx'),
  'utf8',
);
const pageSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.tsx'), 'utf8');
const storiesSource = readFileSync(path.resolve(import.meta.dirname, 'Analyze.stories.tsx'), 'utf8');
const visualPath = path.resolve(import.meta.dirname, 'Analyze.desktop-upload-selected.visual.mjs');
const ru = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8'));

assert.match(
  componentSource,
  /file: File \| null;/,
  'desktop guide should expose the selected file as controlled state',
);
assert.match(componentSource, /submitting: boolean;/, 'desktop guide should expose Analyze submission state');
assert.match(componentSource, /onFileChange: \(file: File \| null\) => void;/, 'desktop guide should expose Analyze file selection');
assert.match(componentSource, /onSubmit: \(event: React\.FormEvent<HTMLFormElement>\) => void;/, 'desktop guide should expose Analyze submission');
assert.match(componentSource, /File02Icon/, 'selected PDF should use the exact HugeIcons File02 glyph');
assert.match(componentSource, /file \? \([\s\S]*data-analyze-desktop-selected/, 'selected upload state should replace the empty prompt in the same dropzone');
assert.match(componentSource, /\{file\.name\}/, 'selected upload state should render the actual filename');
assert.match(componentSource, /t\('analyze\.selectedFileHint'\)/, 'selected upload state should reuse the approved locale copy');
assert.match(componentSource, /onSubmit=\{onSubmit\}/, 'desktop form should forward submit into the real Analyze flow');
assert.match(componentSource, /disabled=\{!file \|\| submitting\}/, 'desktop submit should be enabled only for a selected idle file');

assert.match(pageSource, /const showDesktopUploadGuide = showUploadForm;/, 'desktop guide should remain mounted after file selection');
assert.match(pageSource, /showDesktopUploadGuide \? ANALYZE_EMPTY_DESKTOP_PAGE_CLASS/, 'selected desktop upload should retain the Figma page rail');
assert.match(pageSource, /<AnalyzeDesktopUploadGuide[\s\S]*file=\{file\}[\s\S]*submitting=\{submitting\}[\s\S]*onFileChange=\{handleFileChange\}[\s\S]*onSubmit=\{handleSubmit\}/, 'Analyze should pass its real controlled upload state and handlers');
assert.match(pageSource, /showDesktopUploadGuide \? 'min-\[1440px\]:hidden'/, 'legacy upload form should stay hidden at 1440px in both empty and selected states');

assert.match(storiesSource, /export const DesktopUploadSelected:/, 'Storybook should expose the uploaded desktop state');
assert.match(storiesSource, /new File\(\['sample'\], 'analysis\.pdf'/, 'Storybook should upload the deterministic selected filename');
assert.match(storiesSource, /data-analyze-desktop-composition/, 'Storybook should prove the guide remains mounted');
assert.match(storiesSource, /data-analyze-desktop-active-step/, 'Storybook should prove tutorial state remains active');
assert.equal(existsSync(visualPath), true, 'deterministic selected-state visual runner should exist');

assert.equal(ru.analyze.selectedFileHint, 'Нажмите, что бы выбрать другой файл');
assert.equal(kk.analyze.desktopGuide.uploadTitle, 'PDF файлын алып қойдыңыз ба?');
assert.equal(kk.analyze.desktopGuide.uploadBodyFirst, 'Төмендегі өрісті басып,');
assert.equal(kk.analyze.desktopGuide.uploadBodySecond, 'тақырыптар статистикасы бар файлыңызды таңдаңыз');

console.log('Analyze selected desktop upload Figma contract passed');
