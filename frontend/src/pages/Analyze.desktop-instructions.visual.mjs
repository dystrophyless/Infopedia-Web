import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../test-results/analyze-desktop-instructions');
const viewport = { width: 1440, height: 1080 };

const expectedControls = [
  ['A', 'BUTTON'],
  ['BUTTON', 'BUTTON'],
  ['BUTTON', 'BUTTON'],
  ['BUTTON', 'BUTTON'],
  ['BUTTON', 'BUTTON'],
  ['BUTTON'],
];
const expectedImageDimensions = [
  { naturalWidth: 486, naturalHeight: 285 },
  { naturalWidth: 440, naturalHeight: 209 },
  { naturalWidth: 440, naturalHeight: 240 },
  { naturalWidth: 440, naturalHeight: 222 },
  { naturalWidth: 440, naturalHeight: 285 },
  { naturalWidth: 440, naturalHeight: 275 },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (let step = 1; step <= 6; step += 1) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const storyPath = `/iframe.html?id=pages-analyze--desktop-guide-step-${step}&viewMode=story`;
    await page.goto(`${storybook}${storyPath}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator(`[data-analyze-desktop-active-step="${step}"]`).waitFor({ timeout: 10_000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    const imageSelector = `[data-analyze-desktop-browser] > div:last-child img[src="/figma/analyze-desktop/step-${step}.png"]`;
    await page.locator(imageSelector).waitFor({ state: 'attached', timeout: 10_000 });
    await page.waitForFunction(
      (selector) => {
        const image = document.querySelector(selector);
        return image instanceof HTMLImageElement
          && image.complete
          && image.naturalWidth > 0
          && image.naturalHeight > 0;
      },
      imageSelector,
      { timeout: 10_000 },
    );

    const result = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box && { x: box.x, y: box.y, width: box.width, height: box.height };
      };
      const guide = document.querySelector('[data-analyze-desktop-guide]');
      const active = document.querySelector('[data-analyze-desktop-active-step]');
      const image = document.querySelector('[data-analyze-desktop-browser] > div:last-child img');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scroll: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        },
        step: Number(active?.getAttribute('data-analyze-desktop-active-step')),
        track: rect('[data-analyze-desktop-track]'),
        body: rect('[data-analyze-desktop-body]'),
        guide: rect('[data-analyze-desktop-guide]'),
        upload: rect('[data-analyze-desktop-upload]'),
        benefits: rect('[data-analyze-desktop-benefits]'),
        browser: rect('[data-analyze-desktop-browser]'),
        dropzone: rect('label[for="analyze-file-desktop"]'),
        image: image && {
          src: image.getAttribute('src'),
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          rect: rect('[data-analyze-desktop-browser] > div:last-child img'),
        },
        controls: guide ? [...guide.querySelectorAll('a, button')].map((node) => ({
          tag: node.tagName,
          href: node.getAttribute('href'),
          target: node.getAttribute('target'),
        })) : [],
        benefitsCount: document.querySelectorAll('[data-analyze-desktop-benefits] article').length,
      };
    });

    assert.deepEqual(result.viewport, viewport, `step ${step}: viewport`);
    assert.deepEqual(result.scroll, viewport, `step ${step}: document should not overflow`);
    assert.equal(result.step, step, `step ${step}: active local state`);
    assert.deepEqual(result.track, { x: 386, y: 32, width: 990, height: 82 }, `step ${step}: track geometry`);
    assert.deepEqual(result.body, { x: 386, y: 130, width: 990, height: 697 }, `step ${step}: body geometry`);
    assert.deepEqual(result.guide, { x: 386, y: 130, width: 600, height: 697 }, `step ${step}: guide geometry`);
    assert.deepEqual(result.upload, { x: 1002, y: 130, width: 374, height: 421 }, `step ${step}: upload geometry`);
    assert.deepEqual(result.benefits, { x: 1002, y: 567, width: 374, height: 260 }, `step ${step}: benefits geometry`);
    assert.deepEqual(result.browser, { x: 410, y: 331, width: 552, height: 400 }, `step ${step}: browser geometry`);
    assert.deepEqual(result.dropzone, { x: 1026, y: 259, width: 326, height: 196 }, `step ${step}: dropzone geometry`);
    assert.deepEqual(result.image, {
      src: `/figma/analyze-desktop/step-${step}.png`,
      complete: true,
      ...expectedImageDimensions[step - 1],
      rect: result.image?.rect,
    }, `step ${step}: loaded instructional image dimensions`);
    assert.deepEqual({
      width: result.image?.rect?.width,
      height: result.image?.rect?.height,
    }, {
      width: expectedImageDimensions[step - 1].naturalWidth,
      height: expectedImageDimensions[step - 1].naturalHeight,
    }, `step ${step}: rendered instructional image dimensions`);
    assert.equal(result.benefitsCount, 2, `step ${step}: benefit count`);
    assert.deepEqual(result.controls.map(({ tag }) => tag), expectedControls[step - 1], `step ${step}: CTA inventory`);
    assert.equal(result.controls.filter(({ href }) => href === 'https://app.testcenter.kz').length, step === 1 ? 1 : 0, `step ${step}: external CTA inventory`);
    if (step === 1) assert.equal(result.controls[0].target, '_blank', 'step 1: Testcenter opens in a new tab');

    await page.screenshot({ path: path.join(outputDir, `step-${step}.png`), fullPage: false });
    measurements.push(result);
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Analyze desktop guide screenshots and measurements saved to ${outputDir}`);
