import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import manifest from './references/manifest.json' with { type: 'json' };

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputRoot = process.env.OUTPUT_DIR ?? path.resolve(import.meta.dirname, '../../../../test-results/tests-desktop-runner');
const allCases = [
  ['default', 'default-question-1'], ['question-7', 'question-7-with-skipped-4'], ['selected', 'selected-answer'],
  ['correct', 'correct-feedback'], ['wrong', 'wrong-feedback'], ['results', 'results'], ['review', 'question-review-dialog'],
];
const cases = process.env.VISUAL_CASE ? allCases.filter(([name]) => name === process.env.VISUAL_CASE) : allCases;
assert.ok(cases.length, `unknown VISUAL_CASE ${process.env.VISUAL_CASE}`);

// Source-backed baseline: exact DPR1 Figma exports, the repo's bundled Mabry files, and Chromium 1.61.
// Per-channel deltas <=16 are treated as raster antialiasing. Limits reject structural/paint drift,
// and are recalibrated only after a reviewed source or rendering-environment change.
const VISUAL_THRESHOLDS = {
  default: { significantPixelRatio: .014, meanChannelDifference: 1.1 },
  'question-7': { significantPixelRatio: .015, meanChannelDifference: 1.2 },
  selected: { significantPixelRatio: .015, meanChannelDifference: 1.2 },
  correct: { significantPixelRatio: .019, meanChannelDifference: 1.5 },
  wrong: { significantPixelRatio: .019, meanChannelDifference: 1.5 },
  results: { significantPixelRatio: .017, meanChannelDifference: 1.4 },
  review: { significantPixelRatio: .021, meanChannelDifference: 1.7 },
};

await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { dpr: 1, fileKey: manifest.fileKey, thresholds: VISUAL_THRESHOLDS, states: {} };
try {
  for (const [name, story] of cases) {
    const source = manifest.states[name];
    const page = await browser.newPage({ viewport: { width: source.width, height: source.height }, deviceScaleFactor: 1 });
    await page.goto(`${storybook}/iframe.html?id=tests-desktop-figma-runner--${story}&viewMode=story`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const root = page.locator('[data-desktop-test-runner], [data-desktop-test-results]').first();
    try { await root.waitFor({ state: 'attached', timeout: 20_000 }); }
    catch (error) { throw new Error(`${name} story did not render: ${(await page.locator('body').innerText()).slice(0, 2000)}`, { cause: error }); }
    assert.notEqual(await root.evaluate(node => getComputedStyle(node).display), 'none', `${name} desktop composition must be visible`);
    await page.evaluate(async () => document.fonts.ready);
    const dialogInteractions = name === 'review' ? await verifyDialogLifecycle(page) : null;
    const resultsHover = name === 'results' ? await verifyResultsHoverContract(page) : null;
    const target = path.join(outputRoot, name);
    await fs.mkdir(target, { recursive: true });
    const actualPath = path.join(target, 'actual.png');
    const referencePath = path.resolve(import.meta.dirname, 'references', `${name}.png`);
    await page.screenshot({ path: actualPath });
    await fs.copyFile(referencePath, path.join(target, 'reference.png'));
    const measurements = await page.evaluate(() => {
      const rootNode = document.querySelector('[data-desktop-test-runner], [data-desktop-test-results]');
      const box = rootNode?.getBoundingClientRect();
      const dialogNode = document.querySelector('#test-review-dialog');
      const dialog = dialogNode?.getBoundingClientRect();
      const dialogStyle = dialogNode ? getComputedStyle(dialogNode) : null;
      const overlayStyle = dialogNode?.parentElement ? getComputedStyle(dialogNode.parentElement) : null;
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        root: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
        dialog: dialog ? { x: dialog.x, y: dialog.y, width: dialog.width, height: dialog.height } : null,
        dialogBorderRadius: dialogStyle?.borderRadius ?? null,
        dialogBackground: dialogStyle?.backgroundColor ?? null,
        overlayBackground: overlayStyle?.backgroundColor ?? null,
        background: rootNode ? getComputedStyle(rootNode).backgroundColor : null,
      };
    });
    assert.deepEqual(measurements.viewport, { width: source.width, height: source.height, dpr: 1 });
    assert.equal(measurements.root?.height, source.height, `${name} root must fill the Figma canvas height`);
    if (name === 'review') {
      assert.deepEqual(measurements.dialog, { x: 392, y: 499, width: 656, height: 515 });
      assert.equal(measurements.dialogBorderRadius, '16px', 'review dialog must preserve the Figma 16px radius over Surface defaults');
      assert.equal(measurements.dialogBackground, 'rgb(255, 255, 255)');
      assert.equal(measurements.overlayBackground, 'rgba(22, 21, 25, 0.25)', 'review overlay must preserve the Figma paint over Dialog defaults');
    }
    const diff = await compare(referencePath, actualPath, target);
    assertVisualGate(name, diff);
    const interactionMatrix = await verifyInteractionMatrix(page, name);
    report.states[name] = { nodeId: source.nodeId, measurements, diff, interactionMatrix, dialogInteractions, resultsHover };
    await fs.writeFile(path.join(target, 'measurements.json'), JSON.stringify(report.states[name], null, 2));
    await page.close();
  }
  await assertMeaningfulPaintMutationRejected();
} finally { await browser.close(); }
await fs.writeFile(path.join(outputRoot, 'summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

function visualState(node) {
  const style = getComputedStyle(node);
  return { rect: node.getBoundingClientRect().toJSON(), background: style.backgroundColor, border: style.borderColor, color: style.color, boxShadow: style.boxShadow, transform: style.transform, opacity: style.opacity };
}

async function verifyInteractionMatrix(page, name) {
  const scope = name === 'review' ? page.locator('#test-review-dialog') : page.locator('[data-desktop-test-runner], [data-desktop-test-results]').first();
  const buttons = scope.locator('button:enabled');
  const count = await buttons.count();
  assert.ok(count > 0, `${name} must expose enabled controls`);
  const evidence = [];
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const label = await button.getAttribute('aria-label') ?? (await button.innerText()).trim();
    const before = await button.evaluate(visualState);
    await button.hover();
    const buttonHandle = await button.elementHandle();
    assert.ok(buttonHandle, `${name}/${label}: enabled button DOM handle must exist`);
    const hoverChanged = await waitForHoverPaintChange(page, buttonHandle, before, `${name}/${label}`);
    await buttonHandle.dispose();
    const hover = await button.evaluate(visualState);
    assert.deepEqual(hover.rect, before.rect, `${name}/${label}: hover must be layout-neutral`);
    assert.notDeepEqual({ ...hover, rect: undefined }, { ...before, rect: undefined }, `${name}/${label}: hover must be visible`);
    await page.mouse.move(0, 0);
    await button.focus();
    const focus = await button.evaluate(visualState);
    assert.deepEqual(focus.rect, before.rect, `${name}/${label}: focus-visible must be layout-neutral`);
    assert.notEqual(focus.boxShadow, before.boxShadow, `${name}/${label}: focus-visible must be visible`);
    evidence.push({ label, hoverChanged, focusChanged: true, rectStable: true });
  }
  return evidence;
}

async function verifyDialogLifecycle(page) {
  const trigger = page.getByRole('button', { name: 'Открыть разбор вопроса 7' });
  const close = () => page.getByRole('button', { name: 'Закрыть разбор вопроса' });
  await close().click();
  await trigger.click(); await close().waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Закрыть разбор вопроса', { polling: 'raf', timeout: 1000 });
  assert.equal(await close().evaluate(node => document.activeElement === node), true, 'dialog initial focus must target close control');
  await page.keyboard.press('Tab');
  assert.equal(await close().evaluate(node => document.activeElement === node), true, 'dialog Tab loop must retain its only enabled control');
  await page.keyboard.press('Escape');
  await trigger.waitFor({ state: 'visible' });
  assert.equal(await trigger.evaluate(node => document.activeElement === node), true, 'Escape must restore trigger focus');
  await trigger.click(); await close().waitFor();
  await page.locator('#test-review-dialog').locator('..').dispatchEvent('pointerdown');
  await trigger.waitFor({ state: 'visible' });
  assert.equal(await trigger.evaluate(node => document.activeElement === node), true, 'backdrop dismiss must restore trigger focus');
  await trigger.click(); await close().waitFor(); await close().click();
  assert.equal(await trigger.evaluate(node => document.activeElement === node), true, 'close control must restore trigger focus');
  await trigger.click(); await close().waitFor(); await close().evaluate(node => node.blur());
  return { initialFocus: true, tabLoop: true, escape: true, backdrop: true, close: true, focusRestored: true };
}

async function waitForHoverPaintChange(page, button, before, label) {
  // Playwright polling:'raf' is requestAnimationFrame-backed and bounded below.
  try {
    await page.waitForFunction(({ node, before }) => {
    if (!node || !node.isConnected) return false;
    const style = getComputedStyle(node);
    return style.backgroundColor !== before.background || style.borderColor !== before.border || style.color !== before.color || style.boxShadow !== before.boxShadow || style.transform !== before.transform || style.opacity !== before.opacity;
    }, { node: button, before }, { polling: 'raf', timeout: 1000 });
    return true;
  } catch (error) {
    const actual = await button.evaluate(visualState);
    throw new Error(`${label} hover did not settle to a visible paint change; last actual=${JSON.stringify(actual)}`, { cause: error });
  }
}

async function waitForExactPaint(page, button, expected, label) {
  const selector = '[data-figma-contrast-lock="results-overview-wrong"]';
  const started = Date.now();
  try {
    await page.waitForFunction(({ selector, expected }) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      return style.backgroundColor === expected.background && style.color === expected.foreground;
    }, { selector, expected }, { polling: 'raf', timeout: 1000 });
  } catch (error) {
    const actual = await button.evaluate(visualState);
    throw new Error(`${label} exact paint did not settle; last actual=${JSON.stringify(actual)}; expected=${JSON.stringify(expected)}; elapsed=${Date.now() - started}ms`, { cause: error });
  }
  return button.evaluate(visualState);
}

async function verifyResultsHoverContract(page) {
  const wrongCard = page.locator('[data-figma-contrast-lock="results-overview-wrong"]').first();
  const base = { background: 'rgb(252, 229, 227)', foreground: 'rgb(242, 95, 84)' };
  const hover = { background: 'rgb(248, 213, 210)', foreground: base.foreground };
  await page.mouse.move(0, 0);
  const baseBefore = await waitForExactPaint(page, wrongCard, base, 'results base before screenshot');
  await wrongCard.hover();
  const exactHover = await waitForExactPaint(page, wrongCard, hover, 'results hover');
  await page.mouse.move(0, 0);
  const baseAfter = await waitForExactPaint(page, wrongCard, base, 'results base after neutral pointer');
  return { baseBefore, exactHover, baseAfter };
}

function assertVisualGate(name, diff) {
  const limit = VISUAL_THRESHOLDS[name];
  assert.ok(diff.significantPixelRatio <= limit.significantPixelRatio, `${name}: meaningful paint mutation ratio ${diff.significantPixelRatio} exceeds ${limit.significantPixelRatio}`);
  assert.ok(diff.meanChannelDifference <= limit.meanChannelDifference, `${name}: mean paint delta ${diff.meanChannelDifference} exceeds ${limit.meanChannelDifference}`);
}

async function assertMeaningfulPaintMutationRejected() {
  const source = path.resolve(import.meta.dirname, 'references/default.png');
  const png = PNG.sync.read(await fs.readFile(source));
  for (let y = 160; y < 320; y += 1) for (let x = 160; x < 320; x += 1) {
    const offset = (y * png.width + x) * 4;
    png.data[offset] = 0; png.data[offset + 1] = 0; png.data[offset + 2] = 0;
  }
  const mutation = path.join(outputRoot, 'meaningful-paint-mutation.png');
  await fs.writeFile(mutation, PNG.sync.write(png));
  const metrics = await compare(source, mutation, path.join(outputRoot, 'mutation-check'), false);
  assert.throws(() => assertVisualGate('default', metrics), /meaningful paint mutation|mean paint delta/, 'meaningful paint mutation must fail closed');
}

async function compare(referencePath, actualPath, target, writeArtifacts = true) {
  const [expected, actual] = await Promise.all([fs.readFile(referencePath).then(PNG.sync.read), fs.readFile(actualPath).then(PNG.sync.read)]);
  assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
  const overlay = new PNG({ width: expected.width, height: expected.height });
  const diffImage = new PNG({ width: expected.width, height: expected.height });
  let differentPixels = 0; let significantPixels = 0; let totalDifference = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    let delta = 0; let maxChannelDelta = 0;
    for (let c = 0; c < 3; c += 1) { const value = Math.abs(expected.data[i + c] - actual.data[i + c]); delta += value; maxChannelDelta = Math.max(maxChannelDelta, value); }
    if (delta) differentPixels += 1; if (maxChannelDelta > 16) significantPixels += 1; totalDifference += delta;
    for (let c = 0; c < 3; c += 1) { overlay.data[i + c] = Math.round((expected.data[i + c] + actual.data[i + c]) / 2); diffImage.data[i + c] = c === 0 ? Math.min(255, delta) : 0; }
    overlay.data[i + 3] = 255; diffImage.data[i + 3] = 255;
  }
  if (writeArtifacts) { await fs.mkdir(target, { recursive: true }); await Promise.all([fs.writeFile(path.join(target, 'overlay.png'), PNG.sync.write(overlay)), fs.writeFile(path.join(target, 'diff.png'), PNG.sync.write(diffImage))]); }
  const pixels = expected.width * expected.height;
  return { differentPixels, differentPixelRatio: differentPixels / pixels, significantPixels, significantPixelRatio: significantPixels / pixels, antialiasTolerancePerChannel: 16, meanChannelDifference: totalDifference / (pixels * 3) };
}
