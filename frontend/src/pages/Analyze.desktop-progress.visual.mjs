import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../test-results/analyze-desktop-progress');
const responsiveOutputDir = process.env.RESPONSIVE_OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../test-results/analyze-desktop-progress-responsive');
const referencePath = process.env.REFERENCE_PATH
  ?? path.join(outputDir, 'reference.png');
const viewport = { width: 1440, height: 1080 };
const responsiveCases = [
  { name: '1534x862', width: 1534, height: 862 },
  { name: '1534x730', width: 1534, height: 730 },
  { name: '1534x600', width: 1534, height: 600 },
  { name: '1920x915', width: 1920, height: 915 },
  { name: '1900x980', width: 1900, height: 980 },
];
const fallbackViewport = { width: 1534, height: 500 };
const adaptiveDesktopViewport = { width: 1439, height: 800 };
const mobileCases = [
  { name: '320x932', width: 320, height: 932 },
  { name: '360x932', width: 360, height: 932 },
  { name: '390x932', width: 390, height: 932 },
  { name: '430x932', width: 430, height: 932 },
];

await Promise.all([
  fs.mkdir(outputDir, { recursive: true }),
  fs.mkdir(responsiveOutputDir, { recursive: true }),
]);
const browser = await chromium.launch({ headless: true });
let measurements;
const responsiveMeasurements = [];
let fallbackMeasurement;
let adaptive1439;
const mobileMeasurements = [];

try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${storybook}/iframe.html?id=pages-analyze--desktop-progress-figma-russian&viewMode=story`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.locator('[data-analyze-desktop-progress]').waitFor({ timeout: 15_000 });
  await page.evaluate(async () => { await document.fonts.ready; });

  measurements = await page.evaluate(() => {
    const rounded = (value) => Math.round(value * 100) / 100;
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
    const card = document.querySelector('[data-analyze-desktop-progress]');
    const status = document.querySelectorAll('[data-analyze-desktop-progress][role="status"]');
    const progressbar = card?.querySelector('[role="progressbar"]');
    const forbiddenCopy = [
      'Начать анализ',
      'Как получить PDF',
      'Загрузите PDF',
      'Что вы получите?',
      'Загрузить другой',
      'Повторить',
    ];

    return {
      viewport: { width: innerWidth, height: innerHeight },
      page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      sidebar: rect('[data-desktop-sidebar]'),
      main: card?.parentElement ? (() => {
        const box = card.parentElement.getBoundingClientRect();
        return { x: rounded(box.x), y: rounded(box.y), width: rounded(box.width), height: rounded(box.height) };
      })() : null,
      card: rect('[data-analyze-desktop-progress]'),
      mainBlock: rect('[data-analyze-desktop-progress-main]'),
      title: rect('[data-analyze-desktop-progress-title]'),
      description: rect('[data-analyze-desktop-progress-description]'),
      track: rect('[data-analyze-desktop-progress-track]'),
      fill: rect('[data-analyze-desktop-progress-fill]'),
      steps: rect('[data-analyze-desktop-progress-steps]'),
      divider: rect('[data-analyze-desktop-progress-divider]'),
      file: rect('[data-analyze-desktop-progress-file]'),
      stepStates: [...(card?.querySelectorAll('[data-step-state]') ?? [])].map((node) => node.getAttribute('data-step-state')),
      cardStyle: style('[data-analyze-desktop-progress]', ['background-color', 'border-radius', 'border-width', 'box-shadow', 'padding']),
      titleStyle: style('[data-analyze-desktop-progress-title]', ['font-family', 'font-size', 'font-weight', 'line-height', 'color']),
      percentStyle: style('[data-analyze-desktop-progress-percent]', ['font-size', 'font-weight', 'line-height', 'color']),
      descriptionStyle: style('[data-analyze-desktop-progress-description]', ['font-size', 'font-weight', 'line-height', 'color']),
      trackStyle: style('[data-analyze-desktop-progress-track]', ['height', 'border-radius', 'background-color']),
      fillStyle: style('[data-analyze-desktop-progress-fill]', ['height', 'border-radius', 'background-color']),
      accessibility: {
        statusCount: status.length,
        live: card?.getAttribute('aria-live'),
        busy: card?.getAttribute('aria-busy'),
        progressbarCount: card?.querySelectorAll('[role="progressbar"]').length,
        valueNow: progressbar?.getAttribute('aria-valuenow'),
        valueText: progressbar?.getAttribute('aria-valuetext'),
      },
      interactiveCount: card?.querySelectorAll('button, a, input, select, textarea, [role="dialog"]').length,
      iconCount: card?.querySelectorAll('svg').length,
      visibleMobileNav: [...document.querySelectorAll('nav')].filter((node) => getComputedStyle(node).position === 'fixed' && node.getClientRects().length > 0).length,
      forbiddenCopy: forbiddenCopy.filter((copy) => document.body.innerText.includes(copy)),
    };
  });

  assert.deepEqual(measurements.viewport, viewport);
  assert.deepEqual(measurements.main, { x: 322, y: 0, width: 1118, height: 1080 });
  assert.deepEqual(measurements.card, { x: 561, y: 253.5, width: 640, height: 573, right: 1201, bottom: 826.5 });
  assert.deepEqual(measurements.mainBlock, { x: 609, y: 301.5, width: 544, height: 392, right: 1153, bottom: 693.5 });
  assert.equal(measurements.description.width, 386);
  assert.equal(measurements.description.height, 32);
  assert.deepEqual(measurements.track, { x: 609, y: 405.5, width: 544, height: 8, right: 1153, bottom: 413.5 });
  assert.ok(Math.abs(measurements.fill.width - 234.83) <= 0.03, `Figma fill width: ${measurements.fill.width}`);
  assert.deepEqual(measurements.steps, { x: 609, y: 445.5, width: 544, height: 248, right: 1153, bottom: 693.5 });
  assert.deepEqual(measurements.divider, { x: 609, y: 717.5, width: 544, height: 1, right: 1153, bottom: 718.5 });
  assert.deepEqual(measurements.file, { x: 609, y: 742.5, width: 544, height: 36, right: 1153, bottom: 778.5 });
  assert.deepEqual(measurements.stepStates, ['done', 'done', 'current', 'next']);
  assert.deepEqual(measurements.cardStyle, {
    'background-color': 'rgb(255, 255, 255)',
    'border-radius': '16px',
    'border-width': '0px',
    'box-shadow': 'none',
    padding: '48px',
  });
  assert.equal(measurements.titleStyle['font-size'], '24px');
  assert.equal(measurements.titleStyle['font-weight'], '500');
  assert.equal(measurements.titleStyle.color, 'rgb(22, 21, 25)');
  assert.equal(measurements.percentStyle.color, 'rgb(106, 55, 195)');
  assert.deepEqual(measurements.descriptionStyle, {
    'font-size': '16px',
    'font-weight': '400',
    'line-height': '16px',
    color: 'rgb(110, 103, 121)',
  });
  assert.equal(measurements.trackStyle['background-color'], 'rgba(106, 55, 195, 0.25)');
  assert.equal(measurements.fillStyle['background-color'], 'rgb(106, 55, 195)');
  assert.deepEqual(measurements.accessibility, {
    statusCount: 1,
    live: 'polite',
    busy: 'true',
    progressbarCount: 1,
    valueNow: '42',
    valueText: '42%',
  });
  assert.equal(measurements.interactiveCount, 0);
  assert.equal(measurements.iconCount, 3);
  assert.equal(measurements.visibleMobileNav, 0);
  assert.deepEqual(measurements.forbiddenCopy, []);
  assert.equal(measurements.page.width, 1440);

  await page.screenshot({ path: path.join(outputDir, 'actual.png'), fullPage: false });
  await page.close();

  for (const responsiveCase of responsiveCases) {
    const responsiveViewport = { width: responsiveCase.width, height: responsiveCase.height };
    const responsivePage = await browser.newPage({ viewport: responsiveViewport, deviceScaleFactor: 1 });
    await responsivePage.goto(`${storybook}/iframe.html?id=pages-analyze--desktop-progress-figma-russian&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await responsivePage.locator('[data-analyze-desktop-progress]').waitFor({ timeout: 15_000 });
    await responsivePage.evaluate(async () => { await document.fonts.ready; });

    const responsiveMeasurement = await readResponsiveMeasurement(responsivePage);
    const expectedCardY = Math.round(((responsiveCase.height - 573) / 2) * 100) / 100;
    assert.deepEqual(responsiveMeasurement.viewport, responsiveViewport);
    assert.equal(responsiveMeasurement.document.clientHeight, responsiveCase.height, `${responsiveCase.name}: client height`);
    assert.equal(responsiveMeasurement.document.scrollHeight, responsiveCase.height, `${responsiveCase.name}: no document scroll`);
    assert.equal(responsiveMeasurement.card.width, 640, `${responsiveCase.name}: card width`);
    assert.equal(responsiveMeasurement.card.height, 573, `${responsiveCase.name}: card height`);
    assert.equal(responsiveMeasurement.card.y, expectedCardY, `${responsiveCase.name}: vertically centered card`);
    assert.ok(responsiveMeasurement.card.y >= 0, `${responsiveCase.name}: card top should be visible`);
    assert.ok(responsiveMeasurement.card.bottom <= responsiveCase.height, `${responsiveCase.name}: card bottom should be visible`);
    assert.equal(responsiveMeasurement.shellStyle.height, `${responsiveCase.height}px`, `${responsiveCase.name}: shell height`);
    assert.equal(responsiveMeasurement.shellStyle['min-height'], '573px', `${responsiveCase.name}: readable minimum`);
    assert.equal(responsiveMeasurement.railStyle['align-items'], 'center', `${responsiveCase.name}: vertical alignment`);
    assert.equal(responsiveMeasurement.railStyle['justify-content'], 'center', `${responsiveCase.name}: horizontal alignment`);

    responsiveMeasurements.push({ name: responsiveCase.name, ...responsiveMeasurement });
    await responsivePage.screenshot({
      path: path.join(responsiveOutputDir, `${responsiveCase.name}.png`),
      fullPage: false,
    });
    await responsivePage.close();
  }

  const fallbackPage = await browser.newPage({ viewport: fallbackViewport, deviceScaleFactor: 1 });
  await fallbackPage.goto(`${storybook}/iframe.html?id=pages-analyze--desktop-progress-figma-russian&viewMode=story`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await fallbackPage.locator('[data-analyze-desktop-progress]').waitFor({ timeout: 15_000 });
  await fallbackPage.evaluate(async () => { await document.fonts.ready; });
  fallbackMeasurement = await readResponsiveMeasurement(fallbackPage);
  assert.deepEqual(fallbackMeasurement.viewport, fallbackViewport);
  assert.equal(fallbackMeasurement.document.clientHeight, fallbackViewport.height, 'below minimum: client height');
  assert.equal(fallbackMeasurement.document.scrollHeight, 573, 'below minimum: readable document scroll fallback');
  assert.equal(fallbackMeasurement.card.width, 640, 'below minimum: card width');
  assert.equal(fallbackMeasurement.card.height, 573, 'below minimum: card height');
  assert.equal(fallbackMeasurement.card.y, 0, 'below minimum: card starts at the top of the readable shell');
  assert.equal(fallbackMeasurement.card.bottom, 573, 'below minimum: full card remains reachable by scrolling');
  assert.equal(fallbackMeasurement.shellStyle.height, '573px', 'below minimum: shell clamps to card height');
  assert.equal(fallbackMeasurement.shellStyle['min-height'], '573px', 'below minimum: readable minimum');
  await fallbackPage.screenshot({ path: path.join(responsiveOutputDir, '1534x500-scroll-fallback.png'), fullPage: false });
  await fallbackPage.close();

  const adaptivePage = await browser.newPage({ viewport: adaptiveDesktopViewport, deviceScaleFactor: 1 });
  await adaptivePage.goto(`${storybook}/iframe.html?id=pages-analyze--desktop-progress-figma-russian&viewMode=story`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await adaptivePage.locator('[data-analyze-desktop-progress]').waitFor({ state: 'visible', timeout: 15_000 });
  await adaptivePage.evaluate(async () => { await document.fonts.ready; });
  adaptive1439 = await adaptivePage.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    desktopVisible: Boolean(document.querySelector('[data-analyze-desktop-progress]')?.getClientRects().length),
    mobileVisible: Boolean(document.querySelector('[data-analyze-mobile-progress]')?.getClientRects().length),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.deepEqual(adaptive1439, {
    ...adaptiveDesktopViewport,
    desktopVisible: true,
    mobileVisible: false,
    scrollWidth: adaptiveDesktopViewport.width,
  });
  await adaptivePage.screenshot({ path: path.join(responsiveOutputDir, '1439x800-desktop.png'), fullPage: false });
  await adaptivePage.close();

  for (const mobileCase of mobileCases) {
    const mobileViewport = { width: mobileCase.width, height: mobileCase.height };
    const mobilePage = await browser.newPage({ viewport: mobileViewport, deviceScaleFactor: 1 });
    await mobilePage.goto(`${storybook}/iframe.html?id=pages-analyze--processing-uploaded-file-mobile-430&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await mobilePage.locator('[data-analyze-mobile-progress]').waitFor({ state: 'visible', timeout: 15_000 });
    await mobilePage.evaluate(async () => { await document.fonts.ready; });
    const mobileMeasurement = await mobilePage.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      desktopVisible: Boolean(document.querySelector('[data-analyze-desktop-progress]')?.getClientRects().length),
      mobileVisible: Boolean(document.querySelector('[data-analyze-mobile-progress]')?.getClientRects().length),
      appBarVisible: Boolean(document.querySelector('[data-mobile-page-app-bar-rail]')?.getClientRects().length),
      progressbarVisible: Boolean(document.querySelector('[data-analyze-mobile-progress] [role="progressbar"]')?.getClientRects().length),
      filename: document.querySelector('[data-analyze-mobile-progress]')?.textContent?.includes('analysis.pdf') ?? false,
    }));
    assert.deepEqual(mobileMeasurement.viewport, mobileViewport, `${mobileCase.name}: viewport`);
    assert.ok(mobileMeasurement.scrollWidth <= mobileCase.width, `${mobileCase.name}: no horizontal overflow`);
    assert.equal(mobileMeasurement.desktopVisible, false, `${mobileCase.name}: desktop composition hidden`);
    assert.equal(mobileMeasurement.mobileVisible, true, `${mobileCase.name}: mobile composition visible`);
    assert.equal(mobileMeasurement.appBarVisible, true, `${mobileCase.name}: canonical app bar visible`);
    assert.equal(mobileMeasurement.progressbarVisible, true, `${mobileCase.name}: progressbar visible`);
    assert.equal(mobileMeasurement.filename, true, `${mobileCase.name}: file metadata visible`);
    mobileMeasurements.push({ name: mobileCase.name, ...mobileMeasurement });
    await mobilePage.screenshot({
      path: path.join(responsiveOutputDir, `${mobileCase.name}-mobile.png`),
      fullPage: false,
    });
    await mobilePage.close();
  }
} finally {
  await browser.close();
}

const diffMetrics = await createVisualArtifacts(referencePath, path.join(outputDir, 'actual.png'), outputDir);
await fs.writeFile(
  path.join(outputDir, 'measurements.json'),
  `${JSON.stringify({ ...measurements, diffMetrics }, null, 2)}\n`,
);
await fs.writeFile(
  path.join(responsiveOutputDir, 'measurements.json'),
  `${JSON.stringify({ responsive: responsiveMeasurements, fallback: fallbackMeasurement, adaptive1439, mobile: mobileMeasurements }, null, 2)}\n`,
);
console.log(`Analyze desktop progress visual evidence saved to ${outputDir}`);
console.log(`Analyze desktop progress responsive evidence saved to ${responsiveOutputDir}`);

async function readResponsiveMeasurement(page) {
  return page.evaluate(() => {
    const rounded = (value) => Math.round(value * 100) / 100;
    const rect = (node) => {
      const box = node?.getBoundingClientRect();
      return box && {
        x: rounded(box.x),
        y: rounded(box.y),
        width: rounded(box.width),
        height: rounded(box.height),
        right: rounded(box.right),
        bottom: rounded(box.bottom),
      };
    };
    const style = (node, properties) => {
      if (!node) return null;
      const computed = getComputedStyle(node);
      return Object.fromEntries(properties.map((property) => [property, computed.getPropertyValue(property)]));
    };
    const card = document.querySelector('[data-analyze-desktop-progress]');
    const rail = card?.parentElement ?? null;
    let shell = rail?.parentElement ?? null;
    while (shell && !String(shell.className).includes('h-dvh')) shell = shell.parentElement;

    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        bodyClientHeight: document.body.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
      },
      sidebar: rect(document.querySelector('[data-desktop-sidebar]')),
      main: rect(document.querySelector('main')),
      shell: rect(shell),
      rail: rect(rail),
      card: rect(card),
      shellStyle: style(shell, ['height', 'min-height', 'align-items', 'justify-content', 'overflow-y']),
      railStyle: style(rail, ['height', 'min-height', 'align-items', 'justify-content', 'overflow-y']),
      mainStyle: style(document.querySelector('main'), ['height', 'min-height', 'align-items', 'justify-content', 'overflow-y']),
    };
  });
}

async function createVisualArtifacts(reference, actual, targetDir) {
  const [referenceBuffer, actualBuffer] = await Promise.all([fs.readFile(reference), fs.readFile(actual)]);
  const expected = PNG.sync.read(referenceBuffer);
  const received = PNG.sync.read(actualBuffer);
  assert.equal(received.width, expected.width, 'actual and Figma reference widths should match');
  assert.equal(received.height, expected.height, 'actual and Figma reference heights should match');

  const overlay = new PNG({ width: expected.width, height: expected.height });
  const diff = new PNG({ width: expected.width, height: expected.height });
  let differentPixels = 0;
  let totalDifference = 0;

  for (let index = 0; index < expected.data.length; index += 4) {
    let pixelDifference = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(expected.data[index + channel] - received.data[index + channel]);
      overlay.data[index + channel] = Math.round((expected.data[index + channel] + received.data[index + channel]) / 2);
      diff.data[index + channel] = delta;
      pixelDifference += delta;
      totalDifference += delta;
    }
    overlay.data[index + 3] = 255;
    diff.data[index + 3] = 255;
    if (pixelDifference > 12) differentPixels += 1;
  }

  await Promise.all([
    fs.writeFile(path.join(targetDir, 'overlay.png'), PNG.sync.write(overlay)),
    fs.writeFile(path.join(targetDir, 'diff.png'), PNG.sync.write(diff)),
  ]);

  return {
    width: expected.width,
    height: expected.height,
    differentPixels,
    differentPixelRatio: differentPixels / (expected.width * expected.height),
    meanAbsoluteChannelDifference: totalDifference / (expected.width * expected.height * 3),
  };
}
