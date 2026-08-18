import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pageDir = import.meta.dirname;
const srcDir = path.resolve(pageDir, '..');
const modelPath = path.resolve(srcDir, 'features/analyze/model/desktopProgress.ts');
const componentPath = path.resolve(srcDir, 'features/analyze/components/AnalyzeDesktopProgress.tsx');
const pagePath = path.resolve(pageDir, 'Analyze.tsx');
const storiesPath = path.resolve(pageDir, 'Analyze.stories.tsx');
const visualPath = path.resolve(pageDir, 'Analyze.desktop-progress.visual.mjs');

assert.equal(existsSync(modelPath), true, 'desktop progress needs a pure stage mapper');
assert.equal(existsSync(componentPath), true, 'desktop progress needs a dedicated Figma component');
assert.equal(existsSync(visualPath), true, 'desktop progress needs a deterministic visual runner');

const modelSource = readFileSync(modelPath, 'utf8');
const componentSource = readFileSync(componentPath, 'utf8');
const pageSource = readFileSync(pagePath, 'utf8');
const storiesSource = readFileSync(storiesPath, 'utf8');
const visualSource = readFileSync(visualPath, 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'));

const processingPageClass = pageSource.match(/const ANALYZE_PROCESSING_PAGE_CLASS = [^;]+;/)?.[0] ?? '';
const progressCompositionSource = storiesSource.match(
  /function DesktopProgressComposition[\s\S]*?\n}\n\nfunction AuthenticatedAnalyzeFailureStory/,
)?.[0] ?? '';

assert.match(modelSource, /future_pipeline_stage|unknown nonterminal/i, 'mapper should document its conservative unknown-stage fallback');
const APPROVED_SOURCE_NODE_ID = '970:4512';
const figmaNodeMarkers = [...componentSource.matchAll(/data-figma-node="([^"]+)"/g)]
  .map((match) => match[1]);
assert.deepEqual(
  figmaNodeMarkers,
  [APPROVED_SOURCE_NODE_ID],
  'desktop progress should retain exactly the approved Figma source target',
);
assert.match(componentSource, /role="status"[\s\S]*aria-live="polite"/, 'desktop progress should announce live state politely');
assert.match(componentSource, /role="progressbar"[\s\S]*aria-valuemin=\{0\}[\s\S]*aria-valuemax=\{100\}/, 'desktop progress should expose an inner progressbar');
assert.match(componentSource, /Tick02Icon/, 'completed steps should use the exact HugeIcons tick glyph');
assert.match(componentSource, /File02Icon/, 'file metadata should use the exact HugeIcons file glyph');
assert.match(
  componentSource,
  /icon=\{File02Icon\}[\s\S]*size=\{32\}[\s\S]*strokeWidth=\{1\.5\}/,
  'desktop progress file metadata should use the 32px File02 glyph with a 1.5px stroke',
);

assert.match(pageSource, /<AnalyzeDesktopProgress[\s\S]*progressSnapshot=\{progressSnapshot\}[\s\S]*file=\{file\}[\s\S]*onBack=\{onBack\}/, 'adaptive processing should receive the shared snapshot, selected file, and mobile back action');
assert.equal((pageSource.match(/const progressSnapshot = useAnalyzeProgressSnapshot\(/g) ?? []).length, 1, 'adaptive processing should keep exactly one shared progress hook');
assert.doesNotMatch(pageSource, /useSmoothAnalyzeProgress|SMOOTH_PROGRESS_MAX/, 'the duplicate unbounded timer should be removed');
assert.match(pageSource, /currentTask=\{activeCurrentTask\}/, 'runtime processing should be gated to the active task id');
assert.doesNotMatch(pageSource, /(?:function|export function) AnalyzeProgress|data-analyze-legacy-progress/, 'legacy AnalyzeProgress and its marker should be removed completely');
assert.match(componentSource, /hidden h-full w-full items-center justify-center md:flex/, 'adaptive progress should render the Figma desktop composition from md upward');
assert.match(componentSource, /className="md:hidden"/, 'adaptive progress should render its mobile composition only below md');
assert.match(processingPageClass, /md:h-dvh/, 'desktop processing should follow the real viewport height from md upward');
assert.match(processingPageClass, /md:min-h-\[573px\]/, 'desktop processing should preserve the full readable card height from md upward');
assert.doesNotMatch(processingPageClass, /h-\[1080px\]/, 'desktop processing must not force a Figma-only 1080px canvas at runtime');

assert.equal(ru.analyze.desktopProgress.title, 'Анализируем результаты ЕНТ');
assert.equal(ru.analyze.desktopProgress.description, 'Определяем темы, в которых были потеряны баллы, и планируем персонализированную подготовку.');
assert.deepEqual(ru.analyze.desktopProgress.steps, [
  { label: 'Проверяем файл', done: 'Готово', current: 'Сейчас', next: 'Далее' },
  { label: 'Извлекаем данные', done: 'Готово', current: 'Сейчас', next: 'Далее' },
  { label: 'Анализируем результаты', done: 'Готово', current: 'Сейчас', next: 'Далее' },
  { label: 'Персонализируем подготовку', done: 'Готово', current: 'Сейчас', next: 'Далее' },
]);
assert.equal(ru.analyze.desktopProgress.fileLabel, 'Ваш файл');
assert.equal(typeof kk.analyze.desktopProgress.title, 'string');
assert.equal(kk.analyze.desktopProgress.steps.length, 4);

const sourceReferenceStory = storiesSource.match(
  /export const DesktopProgressFigmaRussian:[\s\S]*?\n};/,
)?.[0] ?? '';
assert.match(sourceReferenceStory, /sourceReferenceOnly[\s\S]*stage:\s*'parsing'[\s\S]*progressOverride=\{42\}[\s\S]*sourceReferenceFillOverride=\{43\.16667\}/, 'RU Figma story should be the explicit 42% source-reference-only composition');
assert.equal((storiesSource.match(/progressOverride=\{42\}/g) ?? []).length, 1, '42% should exist only in the approved source-reference story');
assert.match(storiesSource, /export const DesktopProgressStage3Russian:[\s\S]*stage:\s*'parsing'[\s\S]*progressOverride=\{70\}/, 'RU behavior story should show analysis at 70%');
assert.match(storiesSource, /export const DesktopProgressKazakh:[\s\S]*stage:\s*'parsing'[\s\S]*progressOverride=\{70\}/, 'Kazakh behavior story should show analysis at 70%');
assert.doesNotMatch(pageSource, /progressOverride=\{(?:42|43\.16667)\}|sourceReferenceOnly=\{?true\}?/, 'runtime Analyze must not hardcode source-reference progress');
assert.match(progressCompositionSource, /h-dvh/, 'desktop progress story should follow each requested viewport height');
assert.match(progressCompositionSource, /min-h-\[573px\]/, 'desktop progress story should preserve the full readable card height');
assert.doesNotMatch(progressCompositionSource, /h-\[1080px\]/, 'desktop progress story must not force the reference viewport height');
assert.match(visualSource, /width:\s*1440[\s\S]*height:\s*1080/, 'visual runner should use the exact 1440x1080 viewport');
for (const [width, height] of [[1534, 862], [1534, 730], [1534, 600], [1920, 915], [1900, 980]]) {
  assert.match(
    visualSource,
    new RegExp(`width:\\s*${width}[^}]*height:\\s*${height}`),
    `visual runner should cover ${width}x${height} without document scroll`,
  );
}
assert.match(visualSource, /width:\s*1439[^}]*height:\s*800/, 'visual runner should cover the adaptive desktop branch at 1439px');
for (const width of [320, 360, 390, 430]) {
  assert.match(
    visualSource,
    new RegExp(`width:\\s*${width}[^}]*height:\\s*932`),
    `visual runner should cover ${width}px mobile overflow`,
  );
}
assert.match(visualSource, /document\.fonts\.ready/, 'visual runner should wait for fonts');
assert.match(visualSource, /overlay\.png/, 'visual runner should save overlay evidence');
assert.match(visualSource, /diff\.png/, 'visual runner should save diff evidence');
assert.match(visualSource, /measurements\.json/, 'visual runner should save measurement evidence');

console.log('Analyze desktop progress Figma source contract passed');
