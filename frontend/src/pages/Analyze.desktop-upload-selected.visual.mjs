import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../test-results/analyze-desktop-upload-selected');
const viewport = { width: 1440, height: 1080 };
const stories = [
  { language: 'ru', id: 'pages-analyze--desktop-upload-selected' },
  { language: 'kk', id: 'pages-analyze--desktop-upload-selected-kk' },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = {};

try {
  for (const story of stories) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(`${storybook}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.locator('[data-analyze-desktop-selected]').waitFor({ timeout: 15_000 });
    await page.evaluate(async () => { await document.fonts.ready; });

    const result = await page.evaluate(() => {
      const rounded = (value) => Math.round(value * 2) / 2;
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box && {
          x: rounded(box.x),
          y: rounded(box.y),
          width: rounded(box.width),
          height: rounded(box.height),
          right: rounded(box.right),
          bottom: rounded(box.bottom),
        };
      };
      const style = (selector, properties) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const computed = getComputedStyle(node);
        return Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)]));
      };
      const lineCount = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return 0;
        const range = document.createRange();
        range.selectNodeContents(node);
        return new Set([...range.getClientRects()].map((box) => rounded(box.top))).size;
      };
      const clipping = (selector) => {
        const node = document.querySelector(selector);
        return node && {
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
        };
      };
      const textBounds = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        return { top: rounded(box.top), bottom: rounded(box.bottom) };
      };
      const submit = document.querySelector('[data-analyze-desktop-submit]');
      const icon = document.querySelector('[data-analyze-desktop-selected-icon] svg.hidden');

      return {
        viewport: { width: innerWidth, height: innerHeight },
        card: rect('[data-analyze-desktop-upload]'),
        title: rect('[data-analyze-desktop-upload-title]'),
        description: rect('[data-analyze-desktop-upload-description]'),
        divider: rect('[data-analyze-desktop-upload-divider]'),
        dropzone: rect('[data-analyze-desktop-dropzone]'),
        selected: rect('[data-analyze-desktop-selected]'),
        circle: rect('[data-analyze-desktop-selected-icon]'),
        icon: rect('[data-analyze-desktop-selected-icon] svg.hidden'),
        text: rect('[data-analyze-desktop-selected-text]'),
        filename: rect('[data-analyze-desktop-selected-filename]'),
        helper: rect('[data-analyze-desktop-selected-helper]'),
        submit: rect('[data-analyze-desktop-submit]'),
        titleLines: lineCount('[data-analyze-desktop-upload-title]'),
        descriptionLines: lineCount('[data-analyze-desktop-upload-description]'),
        titleClipping: clipping('[data-analyze-desktop-upload-title]'),
        descriptionClipping: clipping('[data-analyze-desktop-upload-description]'),
        titleTextBounds: textBounds('[data-analyze-desktop-upload-title]'),
        descriptionTextBounds: textBounds('[data-analyze-desktop-upload-description]'),
        cardStyle: style('[data-analyze-desktop-upload]', [
          'background-color', 'border-radius', 'box-shadow',
          'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        ]),
        titleStyle: style('[data-analyze-desktop-upload-title]', [
          'color', 'font-size', 'font-weight', 'line-height', 'overflow-y', 'white-space',
        ]),
        descriptionStyle: style('[data-analyze-desktop-upload-description]', [
          'color', 'font-size', 'font-weight', 'line-height', 'overflow-y',
        ]),
        dividerStyle: style('[data-analyze-desktop-upload-divider]', ['background-color']),
        dropzoneStyle: style('[data-analyze-desktop-dropzone]', [
          'background-color', 'border-color', 'border-style', 'border-width', 'border-radius',
        ]),
        circleStyle: style('[data-analyze-desktop-selected-icon]', ['background-color', 'border-radius']),
        filenameStyle: style('[data-analyze-desktop-selected-filename]', ['color', 'font-size', 'font-weight', 'line-height']),
        helperStyle: style('[data-analyze-desktop-selected-helper]', ['color', 'font-size', 'font-weight', 'line-height']),
        submitStyle: style('[data-analyze-desktop-submit]', ['background-color', 'border-radius', 'color', 'font-size', 'font-weight', 'line-height']),
        filenameText: document.querySelector('[data-analyze-desktop-selected-filename]')?.textContent?.trim(),
        helperText: document.querySelector('[data-analyze-desktop-selected-helper]')?.textContent?.trim(),
        submitText: submit?.textContent?.trim(),
        submitEnabled: submit instanceof HTMLButtonElement && !submit.disabled,
        iconStrokeWidth: icon?.querySelector('[stroke-width]')?.getAttribute('stroke-width'),
        activeStep: document.querySelector('[data-analyze-desktop-active-step]')?.getAttribute('data-analyze-desktop-active-step'),
        visibleFilenameCount: [...document.querySelectorAll('*')].filter((node) => node.childElementCount === 0 && node.textContent?.trim() === 'analysis.pdf' && node.checkVisibility()).length,
        formCount: document.querySelectorAll('form').length,
        fileInputCount: document.querySelectorAll('input[type="file"]').length,
      };
    });

    assert.deepEqual(result.viewport, viewport, `${story.language}: viewport`);
    assert.deepEqual(result.card, { x: 1002, y: 130, width: 374, height: 421, right: 1376, bottom: 551 }, `${story.language}: fixed card`);
    assert.deepEqual(result.title && { x: result.title.x, y: result.title.y, height: result.title.height }, { x: 1026, y: 154, height: 20 }, `${story.language}: title placement`);
    assert.deepEqual(result.description, { x: 1026, y: 182, width: 326, height: 28, right: 1352, bottom: 210 }, `${story.language}: description placement`);
    assert.deepEqual(result.divider, { x: 1026, y: 234, width: 326, height: 1, right: 1352, bottom: 235 }, `${story.language}: divider`);
    assert.deepEqual(result.dropzone, { x: 1026, y: 259, width: 326, height: 196, right: 1352, bottom: 455 }, `${story.language}: dropzone`);
    assert.deepEqual(result.selected, { x: 1077, y: 308, width: 224, height: 98, right: 1301, bottom: 406 }, `${story.language}: selected group`);
    assert.deepEqual(result.circle, { x: 1165, y: 308, width: 48, height: 48, right: 1213, bottom: 356 }, `${story.language}: selected circle`);
    assert.deepEqual(result.icon, { x: 1177, y: 320, width: 24, height: 24, right: 1201, bottom: 344 }, `${story.language}: File02 icon`);
    assert.deepEqual(result.text, { x: 1077, y: 372, width: 224, height: 34, right: 1301, bottom: 406 }, `${story.language}: selected text group`);
    assert.deepEqual(result.filename, { x: 1077, y: 372, width: 224, height: 14, right: 1301, bottom: 386 }, `${story.language}: filename`);
    assert.deepEqual(result.helper, { x: 1081.5, y: 394, width: 215, height: 12, right: 1296.5, bottom: 406 }, `${story.language}: replacement helper`);
    assert.deepEqual(result.submit, { x: 1026, y: 479, width: 326, height: 40, right: 1352, bottom: 519 }, `${story.language}: submit`);
    if (story.language === 'ru') {
      assert.ok(Math.abs(result.title.width - 186) <= 0.5, 'ru: title should match the 186px Figma text box');
    }

    assert.equal(result.titleLines, 1, `${story.language}: title should stay on one line`);
    assert.equal(result.descriptionLines, 2, `${story.language}: description should occupy exactly two lines`);
    assert.equal(result.titleStyle['overflow-y'], 'visible', `${story.language}: title glyphs should not be clipped`);
    assert.equal(result.descriptionStyle['overflow-y'], 'visible', `${story.language}: description glyphs should not be clipped`);
    assert.ok(result.descriptionTextBounds.bottom < result.divider.y, `${story.language}: rendered description should clear divider`);
    assert.ok(result.description.bottom < result.divider.y, `${story.language}: description should not overlap divider`);
    assert.equal(result.visibleFilenameCount, 1, `${story.language}: only the desktop filename should be visible`);
    assert.equal(result.formCount, 1, `${story.language}: one adaptive form`);
    assert.equal(result.fileInputCount, 1, `${story.language}: one native file input`);
    assert.equal(result.activeStep, '1', `${story.language}: tutorial should remain active`);

    assert.deepEqual(result.cardStyle, {
      'background-color': 'rgb(255, 255, 255)',
      'border-radius': '16px',
      'box-shadow': 'none',
      'padding-top': '24px',
      'padding-right': '24px',
      'padding-bottom': '32px',
      'padding-left': '24px',
    });
    assert.deepEqual(result.titleStyle, { color: 'rgb(0, 0, 0)', 'font-size': '20px', 'font-weight': '500', 'line-height': '20px', 'overflow-y': 'visible', 'white-space': 'nowrap' });
    assert.deepEqual(result.descriptionStyle, { color: 'rgb(110, 103, 121)', 'font-size': '14px', 'font-weight': '400', 'line-height': '14px', 'overflow-y': 'visible' });
    assert.deepEqual(result.dividerStyle, { 'background-color': 'rgb(246, 245, 247)' });
    assert.deepEqual(result.dropzoneStyle, { 'background-color': 'rgb(248, 245, 252)', 'border-color': 'rgb(106, 55, 195)', 'border-style': 'dashed', 'border-width': '1px', 'border-radius': '8px' });
    assert.deepEqual(result.circleStyle, { 'background-color': 'rgb(106, 55, 195)', 'border-radius': '9999px' });
    assert.deepEqual(result.filenameStyle, { color: 'rgb(22, 21, 25)', 'font-size': '14px', 'font-weight': '500', 'line-height': '14px' });
    assert.deepEqual(result.helperStyle, { color: 'rgb(110, 103, 121)', 'font-size': '12px', 'font-weight': '400', 'line-height': '12px' });
    assert.deepEqual(result.submitStyle, { 'background-color': 'rgb(106, 55, 195)', 'border-radius': '8px', color: 'rgb(255, 255, 255)', 'font-size': '16px', 'font-weight': '500', 'line-height': '16px' });
    assert.equal(result.filenameText, 'analysis.pdf');
    assert.equal(result.helperText, story.language === 'ru' ? 'Нажмите, что бы выбрать другой файл' : 'Басқа файлды таңдау үшін басыңыз');
    assert.equal(result.submitText, story.language === 'ru' ? 'Начать анализ →' : 'Талдауды бастау →');
    assert.equal(result.submitEnabled, true);
    assert.equal(result.iconStrokeWidth, '1.5');

    await page.locator('[data-analyze-desktop-upload]').screenshot({ path: path.join(outputDir, `${story.language}-card.png`) });
    measurements[story.language] = result;
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Analyze selected desktop upload screenshots and measurements saved to ${outputDir}`);
