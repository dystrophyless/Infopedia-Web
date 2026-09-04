import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

/**
 * Deterministic Storybook capture for the Tests hub. The runner records the
 * geometry and computed styles that make the Figma contract observable instead
 * of treating a screenshot as an opaque pass/fail artefact.
 *
 * Set STORYBOOK_URL to an already-running Storybook server. Set
 * FIGMA_REFERENCE_IMAGE to a PNG for optional browser-side overlay/difference
 * images; without it the diff is explicitly marked NOT RUN.
 */
const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.TESTS_VISUAL_OUTPUT ?? path.join(os.tmpdir(), 'infopedia-tests-hub');
const referenceDir = path.join(os.tmpdir(), 'infopedia-tests-figma-references');
const referenceImage = process.env.FIGMA_REFERENCE_IMAGE ?? null;
const weakReferenceImage = process.env.FIGMA_WEAK_REFERENCE_IMAGE ?? null;
const mockReferenceImage = process.env.FIGMA_MOCK_REFERENCE_IMAGE ?? null;
const figmaNode = '727:3094';
const referenceTargetStory = 'features-tests-hub--desktop';
const referenceTargetHeights = new Set([1080, 1293]);
const REFERENCE_ASSETS = {
  chapterNoTest: 'https://www.figma.com/api/mcp/asset/7da2bfdd-15fd-416a-a147-c9c806d28c37.png',
  chapterFirstTest: 'https://www.figma.com/api/mcp/asset/da19ffad-6f84-410e-ade5-556a164daf46.png',
  chapterFull: 'https://www.figma.com/api/mcp/asset/532db32c-949f-4c05-b0c5-a39ee24ce725.png',
  statisticsEmpty: 'https://www.figma.com/api/mcp/asset/782a8ccf-e66b-4186-a834-f812ce72c70c.png',
  recentEmpty: 'https://www.figma.com/api/mcp/asset/4b1c3a15-be29-45f9-b08a-63d208576f2b.png',
};
let downloadedReferences = {};
const RASTER_SENSITIVITY = { requiredImprovement: 0.2, threshold: 16 };
const RASTER_REGIONS = {
  'weak-pre-analysis': { surface: { x: 80, y: 76, width: 200, height: 12 }, icon: { x: 24, y: 24, width: 48, height: 48 }, badge: { x: 140, y: 20, width: 160, height: 36 }, title: { x: 20, y: 92, width: 165, height: 28 }, description: { x: 20, y: 128, width: 280, height: 40 } },
  'mock-inactive': { surface: { x: 80, y: 76, width: 220, height: 12 }, icon: { x: 24, y: 24, width: 48, height: 48 }, badge: { x: 455, y: 20, width: 180, height: 36 }, title: { x: 20, y: 92, width: 190, height: 28 }, description: { x: 20, y: 128, width: 450, height: 26 } },
  'chapter-no-test': { surface: { x: 24, y: 178, width: 272, height: 8 }, badge: { x: 24, y: 24, width: 112, height: 22 }, title: { x: 24, y: 70, width: 272, height: 64 }, question: { x: 24, y: 158, width: 272, height: 14 } },
  'chapter-first-test': { surface: { x: 24, y: 178, width: 272, height: 8 }, badge: { x: 24, y: 24, width: 88, height: 22 }, title: { x: 24, y: 70, width: 272, height: 64 }, question: { x: 24, y: 158, width: 272, height: 14 } },
  'chapter-full': { surface: { x: 24, y: 178, width: 272, height: 8 }, badge: { x: 24, y: 24, width: 88, height: 22 }, delta: { x: 226, y: 24, width: 70, height: 20 }, title: { x: 24, y: 70, width: 272, height: 64 }, question: { x: 24, y: 158, width: 272, height: 14 } },
  'statistics-empty': { surface: { x: 24, y: 122, width: 272, height: 8 }, heading: { x: 24, y: 24, width: 180, height: 20 }, copy: { x: 32, y: 68, width: 264, height: 34 } },
  'recent-empty': { surface: { x: 24, y: 222, width: 272, height: 8 }, heading: { x: 24, y: 24, width: 220, height: 20 }, copy: { x: 32, y: 60, width: 264, height: 34 } },
};

export function classifyRasterRegion(candidate, negativeControls, options = {}) {
  const { requiredImprovement = RASTER_SENSITIVITY.requiredImprovement, threshold = RASTER_SENSITIVITY.threshold, exact = false } = options;
  if (exact) {
    const failures = candidate.differentPixels === 0 ? [] : [`expected exact pixels, found ${candidate.differentPixels} different pixels`];
    return { status: failures.length > 0 ? 'FAIL' : 'PASS', failures, calibration: { method: 'exact', threshold: 0 } };
  }
  const controls = Object.values(negativeControls);
  const baseline = {
    meanAbsoluteChannelDifference: Math.min(...controls.map((control) => control.meanAbsoluteChannelDifference)),
    pixelsAboveThresholdRatio: Math.min(...controls.map((control) => control.pixelsAboveThresholdRatio[threshold])),
  };
  const limits = {
    meanAbsoluteChannelDifference: baseline.meanAbsoluteChannelDifference * (1 - requiredImprovement),
    pixelsAboveThresholdRatio: baseline.pixelsAboveThresholdRatio * (1 - requiredImprovement),
  };
  const failures = [];
  if (candidate.meanAbsoluteChannelDifference >= limits.meanAbsoluteChannelDifference) failures.push(`mean ${candidate.meanAbsoluteChannelDifference} is not ${requiredImprovement * 100}% better than ${baseline.meanAbsoluteChannelDifference}`);
  if (candidate.pixelsAboveThresholdRatio[threshold] >= limits.pixelsAboveThresholdRatio) failures.push(`>${threshold} ratio ${candidate.pixelsAboveThresholdRatio[threshold]} is not ${requiredImprovement * 100}% better than ${baseline.pixelsAboveThresholdRatio}`);
  return {
    status: failures.length > 0 ? 'FAIL' : 'PASS',
    failures,
    calibration: { method: 'reference-self-shift', requiredImprovement, threshold, baseline, limits },
  };
}

class VisualContractError extends Error {}
const desktopWeakPrerequisite = 'Сначала пройдите анализ ЕНТ, чтобы определить слабые темы.';

const captures = [
  { id: 'desktop-full-1080', story: 'features-tests-hub--desktop', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'full' },
  { id: 'desktop-full-1293', story: 'features-tests-hub--desktop', selector: '[data-tests-desktop]', width: 1440, height: 1293, region: 'full' },
  { id: 'desktop-negative-1080', story: 'features-tests-hub--desktop-error', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'negative' },
  { id: 'desktop-negative-1293', story: 'features-tests-hub--desktop-error', selector: '[data-tests-desktop]', width: 1440, height: 1293, region: 'negative' },
  { id: 'desktop-loading-1293', story: 'features-tests-hub--desktop-loading', selector: '[data-tests-desktop]', width: 1440, height: 1293, region: 'loading' },
  { id: 'desktop-empty-1293', story: 'features-tests-hub--desktop-empty', selector: '[data-tests-desktop]', width: 1440, height: 1293, region: 'empty' },
  { id: 'desktop-zero-bank-1293', story: 'features-tests-hub--desktop-zero-bank', selector: '[data-tests-desktop]', width: 1440, height: 1293, region: 'zero-bank' },
  { id: 'desktop-legacy-missing-counts', story: 'features-tests-hub--desktop-legacy-missing-counts', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'legacy-missing-counts' },
  { id: 'desktop-analyze-loading-stale', story: 'features-tests-hub--desktop-analyze-loading', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'analyze-loading' },
  { id: 'desktop-analyze-error-stale', story: 'features-tests-hub--desktop-analyze-error', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'analyze-error' },
  { id: 'desktop-dashboard-error-stale', story: 'features-tests-hub--desktop-error-with-stale-dashboard', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'stale-error' },
  { id: 'desktop-catalog-stale', story: 'features-tests-hub--desktop-catalog-with-stale-dashboard', selector: '[data-tests-desktop]', width: 1440, height: 1080, region: 'stale-catalog' },
  { id: 'weak-pre-analysis', story: 'features-tests-desktop-test-option-card--weak-pre-analysis', selector: '[data-option-card-story="weak-pre-analysis"]', width: 320, height: 196, region: 'weak-pre-analysis', figmaNode: '704:2655' },
  { id: 'mock-inactive', story: 'features-tests-desktop-test-option-card--mock-inactive', selector: '[data-option-card-story="mock-inactive"]', width: 655, height: 180, region: 'mock-inactive', figmaNode: '721:2969' },
  { id: 'chapter-no-test', story: 'features-tests-desktop-chapter-test-card--no-test', selector: '[data-chapter-card]', width: 320, height: 196, region: 'chapter-no-test', figmaNode: '954:2976', referenceKey: 'chapterNoTest', referenceWidth: 320, referenceHeight: 196, elementScreenshot: true },
  { id: 'chapter-legacy-no-test', story: 'features-tests-desktop-chapter-test-card--legacy-no-test', selector: '[data-chapter-card]', width: 320, height: 196, region: 'chapter-legacy-no-test', figmaNode: '954:2976', referenceKey: 'chapterNoTest', referenceWidth: 320, referenceHeight: 196, elementScreenshot: true },
  { id: 'chapter-first-test', story: 'features-tests-desktop-chapter-test-card--first-test', selector: '[data-chapter-card]', width: 320, height: 196, region: 'chapter-first-test', figmaNode: '954:2962', referenceKey: 'chapterFirstTest', referenceWidth: 320, referenceHeight: 196, elementScreenshot: true },
  { id: 'chapter-full', story: 'features-tests-desktop-chapter-test-card--full', selector: '[data-chapter-card]', width: 320, height: 196, region: 'chapter-full', figmaNode: '954:2947', referenceKey: 'chapterFull', referenceWidth: 320, referenceHeight: 196, elementScreenshot: true },
  { id: 'chapter-short-title', story: 'features-tests-desktop-chapter-test-card--short-title', selector: '[data-chapter-card]', width: 320, height: 196, region: 'chapter-short-title', elementScreenshot: true },
  { id: 'statistics-filled', story: 'features-tests-hub--desktop-multiple-attempts', selector: '[aria-labelledby="tests-statistics-title"]', width: 1024, height: 768, region: 'statistics-filled', figmaNode: '1325:2920', elementScreenshot: true },
  { id: 'recent-states', story: 'features-tests-hub--desktop-multiple-attempts', selector: '[aria-labelledby="tests-recent-title"]', width: 1024, height: 768, region: 'recent-states', figmaNode: '1325:2867', elementScreenshot: true },
  { id: 'recent-metric-stress', story: 'features-tests-hub--desktop-recent-metric-stress', selector: '[aria-labelledby="tests-recent-title"]', width: 1024, height: 768, region: 'recent-metric-stress', locale: 'ru-RU', figmaNode: '1325:2867', elementScreenshot: true },
  { id: 'recent-metric-stress-kk', story: 'features-tests-hub--desktop-recent-metric-stress-kazakh', selector: '[aria-labelledby="tests-recent-title"]', width: 1024, height: 768, region: 'recent-metric-stress', locale: 'kk-KZ', figmaNode: '1325:2867', elementScreenshot: true },
  { id: 'statistics-empty', story: 'features-tests-hub--desktop-legacy-missing-counts', selector: '[aria-labelledby="tests-statistics-title"]', width: 1440, height: 1080, region: 'statistics-empty', figmaNode: '1325:2920', referenceWidth: 320, referenceHeight: 134, elementScreenshot: true },
  { id: 'recent-empty', story: 'features-tests-hub--desktop-zero-attempts', selector: '[aria-labelledby="tests-recent-title"]', width: 1440, height: 1080, region: 'recent-empty', figmaNode: '1325:2934', referenceWidth: 320, referenceHeight: 242, elementScreenshot: true },
  ...[320, 360, 390, 430].map((width) => ({ id: `history-mobile-${width}`, story: 'features-tests-hub--live-analysis', selector: '[data-tests-mobile]', width, height: 844, region: 'history-mobile' })),
  ...[320, 360, 390, 430].flatMap((width) => [
    { id: `mobile-live-${width}`, story: 'features-tests-hub--live-analysis', selector: '[data-tests-mobile]', width, height: 844, region: 'full' },
    { id: `mobile-negative-${width}`, story: 'features-tests-hub--load-error', selector: '[data-tests-mobile]', width, height: 844, region: 'negative' },
    { id: `mobile-question-neutral-${width}`, story: 'features-tests-question--neutral', selector: 'main.test-question-content', width, height: 844, region: 'question-select' },
    { id: `mobile-question-feedback-${width}`, story: 'features-tests-question--correct-feedback', selector: 'main.test-question-content', width, height: 844, region: 'question-feedback' },
    { id: `mobile-result-${width}`, story: 'features-tests-result--with-weak-topic', selector: 'main', width, height: 844, region: 'result' },
  ]),
];
const exactFigmaCaptureIds = new Set(['desktop-legacy-missing-counts', 'chapter-no-test', 'chapter-legacy-no-test', 'chapter-first-test', 'chapter-full', 'chapter-short-title', 'statistics-filled', 'recent-states', 'statistics-empty', 'recent-empty']);
const weakNavigationCaptureIds = new Set([
  'desktop-full-1080',
  'desktop-analyze-loading-stale',
  'desktop-analyze-error-stale',
  'desktop-dashboard-error-stale',
  'desktop-catalog-stale',
  'weak-pre-analysis',
  'mock-inactive',
]);
const visualScope = process.env.TESTS_VISUAL_SCOPE ?? 'all';
const activeCaptures = visualScope === 'figma-exact'
  ? captures.filter((descriptor) => exactFigmaCaptureIds.has(descriptor.id))
  : visualScope === 'test-history'
    ? captures.filter((descriptor) => ['statistics-filled', 'recent-states', 'recent-metric-stress', 'statistics-empty', 'recent-empty', 'history-mobile'].includes(descriptor.region))
  : visualScope === 'weak-navigation'
    ? captures.filter((descriptor) => weakNavigationCaptureIds.has(descriptor.id))
  : captures;

function box(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function style(element) {
  if (!element) return null;
  const computed = getComputedStyle(element);
  return {
    display: computed.display,
    position: computed.position,
    backgroundColor: computed.backgroundColor,
    color: computed.color,
    borderColor: computed.borderColor,
    borderWidth: computed.borderWidth,
    borderRadius: computed.borderRadius,
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    whiteSpace: computed.whiteSpace,
    wordBreak: computed.wordBreak,
    padding: computed.padding,
    gap: computed.gap,
    cursor: computed.cursor,
    pointerEvents: computed.pointerEvents,
    maskImage: computed.maskImage,
    webkitMaskImage: computed.webkitMaskImage,
    transform: computed.transform,
    transitionProperty: computed.transitionProperty,
    transitionDuration: computed.transitionDuration,
    transitionTimingFunction: computed.transitionTimingFunction,
    zIndex: computed.zIndex,
  };
}

async function writeStatus(status, details = {}) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'run-status.json'), `${JSON.stringify({ status, ...details }, null, 2)}\n`);
}

async function downloadReferenceAssets() {
  await fs.mkdir(referenceDir, { recursive: true });
  const entries = await Promise.all(Object.entries(REFERENCE_ASSETS).map(async ([key, url]) => {
    const target = path.join(referenceDir, `${key}.png`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(target, bytes);
      return [key, { status: 'PASS', path: target, url, bytes: bytes.length }];
    } catch (error) {
      return [key, { status: 'NOT RUN', url, reason: `Reference download failed: ${error.message}` }];
    }
  }));
  return Object.fromEntries(entries);
}

async function renderOverlayDiff(page, screenshot, reference, descriptor) {
  if (!reference) return { status: 'NOT RUN', reason: descriptor.referenceKey ? `Figma reference ${descriptor.referenceKey} was unavailable` : 'FIGMA_REFERENCE_IMAGE was not provided' };
  const isDesktopReference = descriptor.story === referenceTargetStory
    && descriptor.width === 1440
    && referenceTargetHeights.has(descriptor.height);
  const isWeakReference = descriptor.region === 'weak-pre-analysis' && descriptor.width === 320 && descriptor.height === 196;
  const isMockReference = descriptor.region === 'mock-inactive' && descriptor.width === 655 && descriptor.height === 180;
  const isExactNodeReference = Boolean(descriptor.referenceKey);
  if (!isDesktopReference && !isWeakReference && !isMockReference && !isExactNodeReference) {
    return {
      status: 'NOT RUN',
      reason: 'Figma reference targets the ready desktop capture at 1440px width',
    };
  }
  const referenceBuffer = await fs.readFile(reference);
  const data = await page.evaluate(async ({ current, expected, targetWidth, targetHeight, regions }) => {
    const decode = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
    const currentImage = await decode(`data:image/png;base64,${current}`);
    const expectedImage = await decode(`data:image/png;base64,${expected}`);
    const width = Math.min(targetWidth, currentImage.width, expectedImage.width);
    const height = Math.min(targetHeight, currentImage.height, expectedImage.height);
    const currentCanvas = document.createElement('canvas');
    const expectedCanvas = document.createElement('canvas');
    currentCanvas.width = expectedCanvas.width = width;
    currentCanvas.height = expectedCanvas.height = height;
    currentCanvas.getContext('2d').drawImage(currentImage, 0, 0, width, height, 0, 0, width, height);
    expectedCanvas.getContext('2d').drawImage(expectedImage, 0, 0, width, height, 0, 0, width, height);
    const overlayCanvas = document.createElement('canvas');
    const differenceCanvas = document.createElement('canvas');
    overlayCanvas.width = differenceCanvas.width = width;
    overlayCanvas.height = differenceCanvas.height = height;
    const overlay = overlayCanvas.getContext('2d');
    const difference = differenceCanvas.getContext('2d');
    overlay.drawImage(expectedCanvas, 0, 0);
    overlay.globalAlpha = 0.5;
    overlay.drawImage(currentCanvas, 0, 0);
    difference.drawImage(expectedCanvas, 0, 0);
    difference.globalCompositeOperation = 'difference';
    difference.drawImage(currentCanvas, 0, 0);
    const expectedPixels = expectedCanvas.getContext('2d').getImageData(0, 0, width, height).data;
    const currentPixels = currentCanvas.getContext('2d').getImageData(0, 0, width, height).data;
    const thresholds = [0, 8, 16, 32, 64];
    const metricsForRegion = (region = { x: 0, y: 0, width, height }, comparisonPixels = currentPixels, shiftX = 0, shiftY = 0) => {
      const startX = Math.max(0, region.x);
      const startY = Math.max(0, region.y);
      const endX = Math.min(width, region.x + region.width);
      const endY = Math.min(height, region.y + region.height);
      const pixelsAboveThreshold = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
      let totalChannelDifference = 0;
      let maxChannelDifference = 0;
      let totalPixels = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const expectedIndex = (y * width + x) * 4;
          const comparisonX = x - shiftX;
          const comparisonY = y - shiftY;
          const comparisonIndex = comparisonX >= 0 && comparisonX < width && comparisonY >= 0 && comparisonY < height
            ? (comparisonY * width + comparisonX) * 4
            : null;
          const comparison = comparisonIndex === null
            ? [255, 255, 255]
            : [comparisonPixels[comparisonIndex], comparisonPixels[comparisonIndex + 1], comparisonPixels[comparisonIndex + 2]];
          const redDifference = Math.abs(expectedPixels[expectedIndex] - comparison[0]);
          const greenDifference = Math.abs(expectedPixels[expectedIndex + 1] - comparison[1]);
          const blueDifference = Math.abs(expectedPixels[expectedIndex + 2] - comparison[2]);
          const pixelDifference = Math.max(redDifference, greenDifference, blueDifference);
          totalPixels += 1;
          totalChannelDifference += redDifference + greenDifference + blueDifference;
          maxChannelDifference = Math.max(maxChannelDifference, pixelDifference);
          for (const threshold of thresholds) {
            if (pixelDifference > threshold) pixelsAboveThreshold[threshold] += 1;
          }
        }
      }
      return {
        totalPixels,
        differentPixels: pixelsAboveThreshold[0],
        differentPixelRatio: pixelsAboveThreshold[0] / totalPixels,
        meanAbsoluteChannelDifference: totalChannelDifference / (totalPixels * 3),
        maxChannelDifference,
        pixelsAboveThreshold,
        pixelsAboveThresholdRatio: Object.fromEntries(thresholds.map((threshold) => [threshold, pixelsAboveThreshold[threshold] / totalPixels])),
      };
    };
    const metrics = metricsForRegion();
    const regionMetrics = Object.fromEntries(Object.entries(regions ?? {}).map(([name, region]) => [name, {
      candidate: metricsForRegion(region),
      negativeControls: {
        referenceShiftX: metricsForRegion(region, expectedPixels, 1, 0),
        referenceShiftY: metricsForRegion(region, expectedPixels, 0, 1),
      },
    }]));
    return {
      overlay: overlayCanvas.toDataURL('image/png'),
      difference: differenceCanvas.toDataURL('image/png'),
      referenceCrop: targetWidth < expectedImage.width || targetHeight < expectedImage.height ? expectedCanvas.toDataURL('image/png') : null,
      dimensions: { width, height },
      expectedDimensions: { width: expectedImage.width, height: expectedImage.height },
      metrics,
      regionMetrics,
    };
  }, {
    current: screenshot.toString('base64'),
    expected: referenceBuffer.toString('base64'),
    targetWidth: descriptor.referenceWidth ?? descriptor.width,
    targetHeight: descriptor.referenceHeight ?? descriptor.height,
    regions: RASTER_REGIONS[descriptor.region] ?? null,
  });
  const overlayPath = path.join(outputDir, `${descriptor.id}.overlay.png`);
  const differencePath = path.join(outputDir, `${descriptor.id}.difference.png`);
  await fs.writeFile(overlayPath, Buffer.from(data.overlay.split(',')[1], 'base64'));
  await fs.writeFile(differencePath, Buffer.from(data.difference.split(',')[1], 'base64'));
  let referenceCrop = null;
  if (data.referenceCrop) {
    const referenceCropPath = path.join(outputDir, `${descriptor.id}.reference-crop.png`);
    await fs.writeFile(referenceCropPath, Buffer.from(data.referenceCrop.split(',')[1], 'base64'));
    referenceCrop = { path: referenceCropPath, width: data.dimensions.width, height: data.dimensions.height };
  }
  const regionAcceptance = Object.fromEntries(Object.entries(data.regionMetrics).map(([name, region]) => [
    name,
    classifyRasterRegion(region.candidate, region.negativeControls, { exact: name === 'surface' }),
  ]));
  const failures = Object.entries(regionAcceptance)
    .filter(([, result]) => result.status === 'FAIL')
    .flatMap(([name, result]) => result.failures.map((failure) => `${name}: ${failure}`));
  return {
    status: failures.length > 0 ? 'APPROXIMATION' : 'PASS',
    dimensions: data.dimensions,
    expectedDimensions: data.expectedDimensions,
    pixelPipeline: {
      deviceScaleFactor: 1,
      screenshot: 'viewport, fullPage=false',
      comparison: data.expectedDimensions.width === data.dimensions.width && data.expectedDimensions.height === data.dimensions.height
        ? 'native 1:1 pixels'
        : `top-left crop to ${data.dimensions.width}x${data.dimensions.height}; no resampling`,
    },
    reference,
    referenceCrop,
    overlay: overlayPath,
    difference: differencePath,
    metrics: data.metrics,
    regionMetrics: data.regionMetrics,
    regionAcceptance,
    sensitivity: RASTER_SENSITIVITY,
    failures,
  };
}

async function assertStorybookStories(page) {
  const response = await page.request.get(`${storybook}/index.json`, { timeout: 15000 });
  if (!response.ok()) throw new Error(`Storybook index unavailable at ${storybook} (HTTP ${response.status()})`);
  const index = await response.json();
  const entries = index?.entries ?? {};
  const missing = activeCaptures
    .map((descriptor) => descriptor.story)
    .filter((story, indexPosition, stories) => !entries[story] && stories.indexOf(story) === indexPosition);
  if (missing.length > 0) {
    throw new Error(`Storybook index at ${storybook} is missing capture stories: ${missing.join(', ')}`);
  }
}

async function waitForTooltipOpacity(page, expected) {
  await page.waitForFunction(
    ({ values }) => {
      const tooltips = [...document.querySelectorAll('[data-chapter-card] [role="tooltip"]')];
      return tooltips.length === values.length
        && tooltips.every((tooltip, index) => getComputedStyle(tooltip).opacity === values[index]);
    },
    { values: expected },
    { polling: 25, timeout: 2000 },
  );
}

const RECENT_STATE_EXPECTATIONS = {
  default: {
    backgroundColor: 'rgb(255, 255, 255)',
    dateOpacity: '1',
    metricsOpacity: '0',
    arrowOpacity: '0',
    dateY: 0,
    metricsY: 2,
    scoreX: 0,
    arrowX: 4,
  },
  hover: {
    backgroundColor: 'rgb(251, 251, 251)',
    dateOpacity: '0',
    metricsOpacity: '1',
    arrowOpacity: '1',
    dateY: -2,
    metricsY: 0,
    scoreX: -24,
    arrowX: 0,
  },
  focus: {
    backgroundColor: 'rgb(251, 251, 251)',
    dateOpacity: '0',
    metricsOpacity: '1',
    arrowOpacity: '1',
    dateY: -2,
    metricsY: 0,
    scoreX: -24,
    arrowX: 0,
  },
  active: {
    backgroundColor: 'rgb(246, 245, 247)',
    dateOpacity: '0',
    metricsOpacity: '1',
    arrowOpacity: '1',
    dateY: -2,
    metricsY: 0,
    scoreX: -24,
    arrowX: 0,
  },
};

async function waitForRecentState(page, stateName, selector = '[data-tests-recent-link]') {
  const expected = RECENT_STATE_EXPECTATIONS[stateName];
  if (!expected) throw new Error(`Unknown recent state ${stateName}`);
  await page.waitForFunction(
    ({ selector: targetSelector, expectedState }) => {
      const link = document.querySelector(targetSelector);
      const date = link?.querySelector('[data-tests-recent-date]');
      const metrics = link?.querySelector('[data-tests-recent-metrics]');
      const score = link?.querySelector('[data-tests-recent-score]');
      const arrow = link?.querySelector('[data-tests-recent-arrow]');
      if (!link || !date || !metrics || !score || !arrow) return false;
      const translation = (value) => {
        if (value === 'none') return { x: 0, y: 0 };
        const matrix = value?.match(/^matrix(?:3d)?\(([^)]+)\)$/)?.[1]?.split(',').map(Number) ?? [];
        return matrix.length === 6
          ? { x: matrix[4], y: matrix[5] }
          : matrix.length === 16
            ? { x: matrix[12], y: matrix[13] }
            : { x: Number.NaN, y: Number.NaN };
      };
      const close = (actual, wanted) => Number.isFinite(actual) && Math.abs(actual - wanted) < 0.5;
      const dateTranslation = translation(getComputedStyle(date).transform);
      const metricsTranslation = translation(getComputedStyle(metrics).transform);
      const scoreTranslation = translation(getComputedStyle(score).transform);
      const arrowTranslation = translation(getComputedStyle(arrow).transform);
      return getComputedStyle(link).backgroundColor === expectedState.backgroundColor
        && getComputedStyle(date).opacity === expectedState.dateOpacity
        && getComputedStyle(metrics).opacity === expectedState.metricsOpacity
        && getComputedStyle(arrow).opacity === expectedState.arrowOpacity
        && close(dateTranslation.y, expectedState.dateY)
        && close(metricsTranslation.y, expectedState.metricsY)
        && close(scoreTranslation.x, expectedState.scoreX)
        && close(arrowTranslation.x, expectedState.arrowX);
    },
    { selector, expectedState: expected },
    { polling: 25, timeout: 2000 },
  );
}

async function capture(page, descriptor) {
  const url = `${storybook}/iframe.html?id=${descriptor.story}&viewMode=story`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForFunction(
      ({ selector }) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      },
      { selector: descriptor.selector },
      { polling: 250, timeout: 60000 },
    );
  } catch (error) {
    const diagnostics = await page.evaluate(({ selector }) => ({
      selector,
      storyError: document.querySelector('#error-message')?.textContent?.trim() ?? null,
      preparing: Boolean(document.querySelector('.sb-preparing-story')),
      rootText: document.querySelector('#storybook-root')?.textContent?.trim().slice(0, 200) ?? '',
    }), { selector: descriptor.selector });
    throw new Error(`${descriptor.id}: story did not render ${JSON.stringify(diagnostics)} (${error.message})`);
  }
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('font readiness timed out after 30000ms')), 30000)),
    ]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(100);
      const measurements = await page.evaluate(({ selector }) => {
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const style = (element) => {
      if (!element) return null;
      const computed = getComputedStyle(element);
      return {
        display: computed.display,
        position: computed.position,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor,
        borderWidth: computed.borderWidth,
        borderRadius: computed.borderRadius,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        whiteSpace: computed.whiteSpace,
        wordBreak: computed.wordBreak,
        padding: computed.padding,
        gap: computed.gap,
        cursor: computed.cursor,
        pointerEvents: computed.pointerEvents,
        maskImage: computed.maskImage,
        webkitMaskImage: computed.webkitMaskImage,
        transform: computed.transform,
        transitionProperty: computed.transitionProperty,
        transitionDuration: computed.transitionDuration,
        transitionTimingFunction: computed.transitionTimingFunction,
        zIndex: computed.zIndex,
      };
    };
    const root = document.querySelector(selector);
    const main = root?.querySelector('main') ?? root;
    const cards = [...(root?.querySelectorAll('[data-test-mode]') ?? [])];
    const chapterCards = [...(root?.querySelectorAll('[data-chapter-card]') ?? [])];
    const modeSkeletons = [...(root?.querySelectorAll('[data-tests-mode-skeleton]') ?? [])];
    const chapterSkeletons = [...(root?.querySelectorAll('[data-tests-chapter-skeleton]') ?? [])];
    const chaptersGrid = root?.querySelector('[data-tests-chapters-grid]');
    const showMore = root?.querySelector('[data-tests-desktop-show-more]');
    const modeGrid = root?.querySelector('[data-tests-mode-grid]');
    const rightColumn = root?.querySelector('[data-tests-right-column]');
    const metrics = [...(root?.querySelectorAll('[data-chapter-metric]') ?? [])];
    const controls = [...(root?.querySelectorAll('a,button,input,[role="button"]') ?? [])];
    const weakAction = root?.querySelector('[data-testid="tests-weak-mode-card"]') ?? null;
    const contractIcon = root?.querySelector('[data-option-card-icon]') ?? null;
    const contractGlyph = root?.querySelector('[data-option-card-icon-glyph]') ?? null;
    const contractCard = root?.querySelector('[data-option-card-contract]') ?? null;
    const contractTopRow = contractCard?.children[0] ?? null;
    const contractContent = contractCard?.children[1] ?? null;
    const contractTitle = contractContent?.children[0] ?? null;
    const contractDescription = contractContent?.children[1] ?? null;
    const contractBadge = root?.querySelector('[data-option-card-status-badge]') ?? null;
    const chapterCard = root?.matches('[data-chapter-card]') ? root : root?.querySelector('[data-chapter-card]');
    const chapterBadge = chapterCard?.querySelector('[data-chapter-no-data], [data-chapter-metric="accuracy"]') ?? null;
    const chapterBadgeValue = chapterCard?.querySelector('[data-chapter-no-data], [data-chapter-accuracy-value]') ?? null;
    const chapterContent = chapterCard?.querySelector('[data-chapter-content]') ?? null;
    const chapterTitle = chapterCard?.querySelector('[data-chapter-title]') ?? null;
    const chapterQuestion = chapterCard?.querySelector('[data-chapter-question-count]') ?? null;
    const chapterAccuracy = chapterCard?.querySelector('[data-chapter-metric="accuracy"]') ?? null;
    const chapterNoData = chapterCard?.querySelector('[data-chapter-no-data]') ?? null;
    const chapterNoDataTrigger = chapterNoData?.closest('button') ?? null;
    const chapterDelta = chapterCard?.querySelector('[data-chapter-metric="delta"]') ?? null;
    const chapterDeltaValue = chapterCard?.querySelector('[data-chapter-delta-value]') ?? null;
    const chapterDeltaIcon = chapterCard?.querySelector('[data-chapter-delta-icon]') ?? null;
    const chapterNavigation = chapterCard?.querySelector('[data-chapter-navigation]') ?? null;
    const describedTooltip = (trigger) => trigger?.getAttribute('aria-describedby')
      ? document.getElementById(trigger.getAttribute('aria-describedby'))
      : null;
    const focusTargets = chapterCard
      ? [...chapterCard.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true')
      : [];
    const overlaps = (first, second) => {
      const firstBox = box(first);
      const secondBox = box(second);
      return Boolean(firstBox && secondBox
        && firstBox.x < secondBox.right && firstBox.right > secondBox.x
        && firstBox.y < secondBox.bottom && firstBox.bottom > secondBox.y);
    };
    const panelHeading = root?.querySelector('h2') ?? null;
    const statisticsSpacer = root?.querySelector('[data-tests-statistics-spacer]') ?? null;
    const panelEmpty = root?.querySelector('[data-tests-statistics-empty], [data-tests-recent-empty]') ?? null;
    const panelEmptyTitle = panelEmpty?.children[0] ?? null;
    const panelEmptyBody = panelEmpty?.children[1] ?? null;
    const textLines = (element) => {
      if (!element) return [];
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    };
    const renderedFont = (element) => {
      if (!element) return null;
      const computed = getComputedStyle(element);
      const query = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      return { query, loaded: document.fonts.check(query, element.textContent ?? '') };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      root: box(root),
      rootStyle: style(root),
      main: box(main),
      cards: cards.map((card) => ({
        mode: card.getAttribute('data-test-mode'),
        tag: card.tagName.toLowerCase(),
        href: card.getAttribute('href'),
        ariaDisabled: card.getAttribute('aria-disabled'),
        interactiveDescendants: card.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="link"]').length,
        box: box(card),
        style: style(card),
        hitTarget: { minWidth: box(card)?.width >= 44, minHeight: box(card)?.height >= 44 },
      })),
      chapterCards: chapterCards.map((card) => ({ chapterRef: card.getAttribute('data-chapter-ref'), available: card.getAttribute('data-chapter-available'), ariaDisabled: card.getAttribute('aria-disabled'), href: card.querySelector('[data-chapter-navigation]')?.getAttribute('href') ?? null, linkCount: card.querySelectorAll('a').length, box: box(card), style: style(card), hitTarget: { minWidth: box(card)?.width >= 44, minHeight: box(card)?.height >= 44 } })),
      modeSkeletons: modeSkeletons.map((skeleton) => ({ box: box(skeleton), style: style(skeleton) })),
      chapterSkeletons: chapterSkeletons.map((skeleton) => ({ box: box(skeleton), style: style(skeleton) })),
      chaptersGrid: box(chaptersGrid),
      showMore: showMore ? { box: box(showMore), style: style(showMore) } : null,
      modeGrid: box(modeGrid),
      rightColumn: box(rightColumn),
      chapterMetrics: metrics.map((metric) => ({ metric: metric.getAttribute('data-chapter-metric'), box: box(metric), accessibleName: metric.textContent?.trim() ?? '', describedBy: metric.getAttribute('aria-describedby'), tooltip: box(describedTooltip(metric)), style: style(describedTooltip(metric)) })),
      metricVisibility: {
        statisticsEmptyCount: root?.querySelectorAll('[data-tests-statistics-empty]').length ?? 0,
        statisticsSpacerCount: root?.querySelectorAll('[data-tests-statistics-spacer]').length ?? 0,
        statisticsAccuracyCount: root?.querySelectorAll('[data-tests-statistics-accuracy]').length ?? 0,
        statisticsDeltaCount: root?.querySelectorAll('[data-tests-statistics-delta]').length ?? 0,
        chapterNoDataCount: root?.querySelectorAll('[data-chapter-no-data]').length ?? 0,
        chapterMetricCount: root?.querySelectorAll('[data-chapter-metric]').length ?? 0,
      },
      actionCount: controls.length,
      weakAction: weakAction ? {
        tag: weakAction.tagName.toLowerCase(),
        href: weakAction.getAttribute('href'),
        ariaDisabled: weakAction.getAttribute('aria-disabled'),
        contract: weakAction.getAttribute('data-option-card-contract'),
        interactiveDescendants: weakAction.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="link"]').length,
      } : null,
      contractIcon: contractIcon ? { box: box(contractIcon), style: style(contractIcon) } : null,
      contractGlyph: contractGlyph ? { box: box(contractGlyph), style: style(contractGlyph) } : null,
      fontReadiness: {
        status: document.fonts.status,
        mabryFaces: [...document.fonts].filter((face) => face.family.includes('Mabry')).map((face) => ({ family: face.family, weight: face.weight, style: face.style, status: face.status })),
        resources: performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/fonts/MabryPro-')),
      },
      contractTypography: contractCard ? {
        topRow: { box: box(contractTopRow), style: style(contractTopRow) },
        content: { box: box(contractContent), style: style(contractContent) },
        title: { text: contractTitle?.textContent?.trim() ?? '', box: box(contractTitle), style: style(contractTitle), lineRects: textLines(contractTitle), renderedFont: renderedFont(contractTitle) },
        description: { text: contractDescription?.textContent?.trim() ?? '', box: box(contractDescription), style: style(contractDescription), lineRects: textLines(contractDescription), renderedFont: renderedFont(contractDescription) },
        badge: { text: contractBadge?.textContent?.trim() ?? '', box: box(contractBadge), style: style(contractBadge), lineRects: textLines(contractBadge), renderedFont: renderedFont(contractBadge) },
      } : null,
      chapterContract: chapterCard ? {
        card: { box: box(chapterCard), style: style(chapterCard) },
        content: { box: box(chapterContent), style: style(chapterContent) },
        badge: chapterBadge ? { text: chapterBadgeValue?.textContent?.trim() ?? '', box: box(chapterBadge), style: style(chapterBadge), lineRects: textLines(chapterBadgeValue), renderedFont: renderedFont(chapterBadgeValue) } : null,
        title: { text: chapterTitle?.textContent?.trim() ?? '', box: box(chapterTitle), style: style(chapterTitle), lineRects: textLines(chapterTitle), renderedFont: renderedFont(chapterTitle) },
        question: { text: chapterQuestion?.textContent?.trim() ?? '', box: box(chapterQuestion), style: style(chapterQuestion), lineRects: textLines(chapterQuestion), renderedFont: renderedFont(chapterQuestion) },
        accuracy: chapterAccuracy ? { accessibleName: chapterAccuracy.textContent?.trim() ?? '', describedBy: chapterAccuracy.getAttribute('aria-describedby'), box: box(chapterAccuracy), style: style(chapterAccuracy), tooltip: { box: box(describedTooltip(chapterAccuracy)), style: style(describedTooltip(chapterAccuracy)) } } : null,
        noData: chapterNoDataTrigger ? { describedBy: chapterNoDataTrigger.getAttribute('aria-describedby'), tooltipText: describedTooltip(chapterNoDataTrigger)?.textContent?.trim() ?? '', tooltip: { box: box(describedTooltip(chapterNoDataTrigger)), style: style(describedTooltip(chapterNoDataTrigger)) } } : null,
        delta: chapterDelta ? { text: chapterDeltaValue?.textContent?.trim() ?? '', accessibleName: chapterDelta.textContent?.trim() ?? '', describedBy: chapterDelta.getAttribute('aria-describedby'), box: box(chapterDelta), style: style(chapterDelta), tooltip: { box: box(describedTooltip(chapterDelta)), style: style(describedTooltip(chapterDelta)) } } : null,
        deltaIcon: chapterDeltaIcon ? { box: box(chapterDeltaIcon), style: style(chapterDeltaIcon) } : null,
        tooltipCount: chapterCard.querySelectorAll('[role="tooltip"]').length,
        titleToQuestionGap: chapterTitle && chapterQuestion ? box(chapterQuestion).y - box(chapterTitle).bottom : null,
        questionBottomInset: chapterQuestion ? box(chapterCard).bottom - box(chapterQuestion).bottom : null,
        navigationHitBox: chapterNavigation ? { tag: chapterNavigation.tagName.toLowerCase(), href: chapterNavigation.getAttribute('href'), box: box(chapterNavigation) } : null,
        interactiveDescendants: chapterNavigation?.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])').length ?? 0,
        tabOrder: focusTargets.map((target) => target.getAttribute('data-chapter-metric') ?? (target.matches('[data-chapter-navigation]') ? 'navigation' : target.tagName.toLowerCase())),
        overlap: metrics.some((metric) => overlaps(metric, chapterNavigation)),
      } : null,
      emptyPanelContract: panelEmpty ? {
        panel: { box: box(root), style: style(root) },
        heading: { text: panelHeading?.textContent?.trim() ?? '', box: box(panelHeading), style: style(panelHeading), lineRects: textLines(panelHeading), renderedFont: renderedFont(panelHeading) },
        spacer: statisticsSpacer ? { box: box(statisticsSpacer), style: style(statisticsSpacer) } : null,
        copy: { box: box(panelEmpty), style: style(panelEmpty) },
        title: { text: panelEmptyTitle?.textContent?.trim() ?? '', box: box(panelEmptyTitle), style: style(panelEmptyTitle), lineRects: textLines(panelEmptyTitle), renderedFont: renderedFont(panelEmptyTitle) },
        body: { text: panelEmptyBody?.textContent?.trim() ?? '', box: box(panelEmptyBody), style: style(panelEmptyBody), lineRects: textLines(panelEmptyBody), renderedFont: renderedFont(panelEmptyBody) },
      } : null,
      statusBadge: (() => {
        const badge = root?.querySelector('[data-option-card-status-badge]');
        return badge ? { text: badge.textContent?.trim() ?? '', box: box(badge), style: style(badge) } : null;
      })(),
      hitTargets: controls.map((control) => ({
        tag: control.tagName.toLowerCase(),
        role: control.getAttribute('role'),
        text: control.textContent?.trim().slice(0, 120) ?? '',
        box: box(control),
        style: style(control),
        disabled: control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true',
        ariaDisabled: control.getAttribute('aria-disabled'),
      })),
    };
      }, descriptor);
      if (descriptor.id === 'desktop-full-1080') {
        const randomCard = page.locator('[data-testid="tests-random-mode-card"]');
        const weakCard = page.locator('[data-testid="tests-weak-mode-card"]');
        const interactionStyle = (locator) => locator.evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            transform: computed.transform,
            transitionProperty: computed.transitionProperty,
            transitionDuration: computed.transitionDuration,
            transitionTimingFunction: computed.transitionTimingFunction,
          };
        });
        const random = { base: await interactionStyle(randomCard) };
        const weak = { base: await interactionStyle(weakCard) };
        await randomCard.hover();
        await page.waitForTimeout(200);
        random.hover = await interactionStyle(randomCard);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        await randomCard.focus();
        await page.waitForTimeout(200);
        random.focus = await interactionStyle(randomCard);
        await randomCard.evaluate((element) => element.blur());
        await weakCard.hover();
        await page.waitForTimeout(200);
        weak.hover = await interactionStyle(weakCard);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        await weakCard.focus();
        await page.waitForTimeout(200);
        weak.focus = await interactionStyle(weakCard);
        await weakCard.evaluate((element) => element.blur());
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        measurements.optionCardInteraction = { random, weak };
      }
      if (descriptor.region === 'statistics-filled') {
        measurements.statisticsFilled = await page.locator(descriptor.selector).evaluate((panel) => {
          const box = (element) => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
          };
          const style = (element) => {
            const computed = getComputedStyle(element);
            return { backgroundColor: computed.backgroundColor, borderRadius: computed.borderRadius, borderWidth: computed.borderWidth, padding: computed.padding, gap: computed.gap };
          };
          const heading = panel.querySelector('#tests-statistics-title');
          const header = heading?.parentElement;
          const accuracy = panel.querySelector('[data-tests-statistics-accuracy]');
          return {
            node: '1325:2920',
            panel: { box: box(panel), style: style(panel) },
            header: box(header),
            accuracy: box(accuracy),
            bboxGap: box(accuracy).y - box(header).bottom,
          };
        });
        const contract = measurements.statisticsFilled;
        if (contract.panel.box.width !== 320 || contract.panel.box.height !== 134
          || contract.panel.style.backgroundColor !== 'rgb(255, 255, 255)'
          || contract.panel.style.borderRadius !== '16px' || contract.panel.style.borderWidth !== '0px'
          || contract.panel.style.padding !== '24px 24px 32px' || contract.panel.style.gap !== '16px'
          || contract.header.height !== 28 || contract.accuracy.height !== 34 || contract.bboxGap !== 16) {
          throw new VisualContractError(`${descriptor.id}: exact 320x134 statistics geometry failed (${JSON.stringify(contract)})`);
        }
      }
      if (descriptor.region === 'recent-states' || descriptor.region === 'recent-metric-stress') {
        const panel = page.locator(descriptor.selector);
        const links = panel.locator('[data-tests-recent-link]');
        const firstLink = links.first();
        const state = () => firstLink.evaluate((link) => {
          const box = (element) => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
          };
          const computed = (element) => getComputedStyle(element);
          const metric = (selector) => {
            const root = link.querySelector(selector);
            const marker = root?.children[0] ?? null;
            const count = root?.children[1] ?? null;
            const glyph = marker?.querySelector('img') ?? null;
            return root ? {
              box: box(root),
              gap: computed(root).gap,
              marker: { box: box(marker), backgroundColor: computed(marker).backgroundColor, borderColor: computed(marker).borderColor, borderWidth: computed(marker).borderWidth, flexShrink: computed(marker).flexShrink },
              glyph: glyph ? { box: box(glyph), flexShrink: computed(glyph).flexShrink } : null,
              count: { text: count?.textContent?.trim() ?? '', color: computed(count).color, fontSize: computed(count).fontSize, lineHeight: computed(count).lineHeight },
            } : null;
          };
          const date = link.querySelector('[data-tests-recent-date]');
          const metrics = link.querySelector('[data-tests-recent-metrics]');
          const arrow = link.querySelector('[data-tests-recent-arrow]');
          const arrowSvg = arrow?.querySelector('svg') ?? null;
          const score = link.querySelector('[data-tests-recent-score]');
          const title = link.querySelector(':scope > span:first-child > span:first-child');
          const metadata = link.querySelector('[data-tests-recent-metadata]');
          const scoreGroup = link.children[1];
          const linkStyle = computed(link);
          const dateStyle = computed(date);
          const metricsStyle = computed(metrics);
          const scoreStyle = computed(score);
          const arrowStyle = computed(arrow);
          const metricsChildren = metrics ? [...metrics.children].map(box) : [];
          const metricsContentBox = metricsChildren.length > 0
            ? {
              x: Math.min(...metricsChildren.map((item) => item.x)),
              y: Math.min(...metricsChildren.map((item) => item.y)),
              right: Math.max(...metricsChildren.map((item) => item.right)),
              bottom: Math.max(...metricsChildren.map((item) => item.bottom)),
              width: Math.max(...metricsChildren.map((item) => item.right)) - Math.min(...metricsChildren.map((item) => item.x)),
              height: Math.max(...metricsChildren.map((item) => item.bottom)) - Math.min(...metricsChildren.map((item) => item.y)),
            }
            : null;
          return {
            box: box(link),
            backgroundColor: linkStyle.backgroundColor,
            transitionProperty: linkStyle.transitionProperty,
            transitionDuration: linkStyle.transitionDuration,
            transitionTimingFunction: linkStyle.transitionTimingFunction,
            accessibleName: link.getAttribute('aria-label'),
            title: title ? {
              box: box(title),
              textOverflow: computed(title).textOverflow,
              overflow: computed(title).overflow,
              whiteSpace: computed(title).whiteSpace,
              scrollWidth: title.scrollWidth,
              clientWidth: title.clientWidth,
            } : null,
            metadata: metadata ? {
              box: box(metadata),
              overflow: computed(metadata).overflow,
              scrollWidth: metadata.scrollWidth,
              clientWidth: metadata.clientWidth,
            } : null,
            dateBox: box(date),
            dateScrollWidth: date?.scrollWidth ?? null,
            dateClientWidth: date?.clientWidth ?? null,
            metricsBox: box(metrics),
            metricsContentBox,
            scoreBox: box(score),
            arrowLayerBox: box(arrow),
            dateDisplay: dateStyle.display,
            dateOpacity: dateStyle.opacity,
            dateTransform: dateStyle.transform,
            dateWhiteSpace: dateStyle.whiteSpace,
            dateTextOverflow: dateStyle.textOverflow,
            dateOverflow: dateStyle.overflow,
            dateTransitionProperty: dateStyle.transitionProperty,
            dateTransitionDuration: dateStyle.transitionDuration,
            dateTransitionTimingFunction: dateStyle.transitionTimingFunction,
            metricsDisplay: metricsStyle.display,
            metricsOpacity: metricsStyle.opacity,
            metricsTransform: metricsStyle.transform,
            metricsTransitionProperty: metricsStyle.transitionProperty,
            metricsTransitionDuration: metricsStyle.transitionDuration,
            metricsTransitionTimingFunction: metricsStyle.transitionTimingFunction,
            metricsGap: metricsStyle.gap,
            arrowDisplay: arrowStyle.display,
            arrowOpacity: arrowStyle.opacity,
            arrowTransform: arrowStyle.transform,
            arrowTransitionProperty: arrowStyle.transitionProperty,
            arrowTransitionDuration: arrowStyle.transitionDuration,
            arrowTransitionTimingFunction: arrowStyle.transitionTimingFunction,
            arrow: arrowSvg ? { box: box(arrowSvg), color: arrowStyle.color } : null,
            scoreGap: computed(scoreGroup).gap,
            scoreTransform: scoreStyle.transform,
            scoreTransitionProperty: scoreStyle.transitionProperty,
            scoreTransitionDuration: scoreStyle.transitionDuration,
            scoreTransitionTimingFunction: scoreStyle.transitionTimingFunction,
            correct: metric('[data-tests-recent-correct]'),
            incorrect: metric('[data-tests-recent-incorrect]'),
            skipped: metric('[data-tests-recent-skipped]'),
            tooltipCount: link.closest('[aria-labelledby="tests-recent-title"]')?.querySelectorAll('[role="tooltip"]').length ?? 0,
          };
        });
        measurements.recentPanel = await panel.evaluate((element) => {
          const box = (target) => { const rect = target.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }; };
          const computed = getComputedStyle(element);
          const list = element.querySelector('[data-tests-recent-list]');
          const rows = [...element.querySelectorAll('[data-tests-recent-link]')];
          return {
            node: '1325:2934',
            box: box(element),
            padding: computed.padding,
            gap: computed.gap,
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            list: { box: box(list), gap: getComputedStyle(list).gap },
            rows: rows.map(box),
          };
        });
        await page.mouse.move(0, 0);
        await firstLink.evaluate((element) => element.blur());
        await waitForRecentState(page, 'default');
        measurements.recentStates = { default: await state() };
        const screenshotFiles = descriptor.region === 'recent-metric-stress'
          ? descriptor.id === 'recent-metric-stress-kk'
            ? { default: 'recent-stress-default-kk.png', hover: 'recent-stress-hover-kk.png', focus: 'recent-stress-focus-kk.png', active: 'recent-stress-active-kk.png' }
            : { default: 'recent-stress-default.png', hover: 'recent-stress-hover.png', focus: 'recent-stress-focus.png', active: 'recent-stress-active.png' }
          : { default: 'recent-default.png', hover: 'recent-hover.png', focus: 'recent-focus.png', active: 'recent-active.png' };
        await panel.screenshot({ path: path.join(outputDir, screenshotFiles.default) });

        await firstLink.hover();
        await waitForRecentState(page, 'hover');
        measurements.recentStates.hover = await state();
        await panel.screenshot({ path: path.join(outputDir, screenshotFiles.hover) });

        await page.mouse.move(0, 0);
        await waitForRecentState(page, 'default');
        measurements.recentStates.reverseHover = await state();

        await page.locator('[data-testid="tests-weak-mode-card"]').focus();
        await page.keyboard.press('Tab');
        await waitForRecentState(page, 'focus');
        measurements.recentStates.focus = await state();
        await panel.screenshot({ path: path.join(outputDir, screenshotFiles.focus) });

        await firstLink.evaluate((element) => element.blur());
        await page.mouse.move(0, 0);
        await firstLink.hover();
        await page.mouse.down();
        await waitForRecentState(page, 'active');
        measurements.recentStates.active = await state();
        await panel.screenshot({ path: path.join(outputDir, screenshotFiles.active) });
        await page.mouse.up();

        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.mouse.move(0, 0);
        await firstLink.evaluate((element) => element.blur());
        await waitForRecentState(page, 'default');
        const reducedDefault = await state();
        await firstLink.hover();
        await waitForRecentState(page, 'hover');
        const reducedHover = await state();
        await page.mouse.move(0, 0);
        await page.locator('[data-testid="tests-weak-mode-card"]').focus();
        await page.keyboard.press('Tab');
        await waitForRecentState(page, 'focus');
        const reducedFocus = await state();
        await firstLink.evaluate((element) => element.blur());
        await page.mouse.move(0, 0);
        await firstLink.hover();
        await page.mouse.down();
        await waitForRecentState(page, 'active');
        const reducedActive = await state();
        await page.mouse.up();
        await page.mouse.move(0, 0);
        await waitForRecentState(page, 'default');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        measurements.reducedMotionStates = { default: reducedDefault, hover: reducedHover, focus: reducedFocus, active: reducedActive };
        await page.waitForFunction(() => document.querySelector('[data-location-url]')?.textContent?.includes('/tests/random?attemptRef=attempt-1'));
        measurements.recentStates.navigation = await page.locator('[data-location-url]').textContent();

        const { recentPanel, recentStates } = measurements;
        const sameBox = (actual, expected) => actual.width === expected.width && actual.height === expected.height && actual.x === expected.x && actual.y === expected.y;
        const boxesOverlap = (first, second) => Boolean(first && second
          && first.x < second.right && first.right > second.x
          && first.y < second.bottom && first.bottom > second.y);
        const detailsVisible = (snapshot, backgroundColor) => snapshot.backgroundColor === backgroundColor && snapshot.dateOpacity === '0'
          && snapshot.metricsOpacity === '1' && snapshot.arrowOpacity === '1' && sameBox(snapshot.box, recentStates.default.box);
        const transitionContract = (snapshot) => snapshot.transitionProperty === 'background-color'
          && snapshot.transitionDuration === '0.16s' && snapshot.transitionTimingFunction === 'cubic-bezier(0, 0, 0.2, 1)'
          && [
            [snapshot.dateTransitionProperty, snapshot.dateTransitionDuration, snapshot.dateTransitionTimingFunction],
            [snapshot.metricsTransitionProperty, snapshot.metricsTransitionDuration, snapshot.metricsTransitionTimingFunction],
            [snapshot.arrowTransitionProperty, snapshot.arrowTransitionDuration, snapshot.arrowTransitionTimingFunction],
            [snapshot.scoreTransitionProperty, snapshot.scoreTransitionDuration, snapshot.scoreTransitionTimingFunction],
          ].every(([property, duration, timing]) => Boolean(property?.includes('opacity') || property?.includes('transform'))
            && duration === '0.16s' && timing === 'cubic-bezier(0, 0, 0.2, 1)');
        const translation = (transform) => {
          if (transform === 'none') return { x: 0, y: 0 };
          const matrix = transform?.match(/^matrix(?:3d)?\(([^)]+)\)$/)?.[1]?.split(',').map(Number) ?? [];
          return matrix.length === 6 ? { x: matrix[4], y: matrix[5] } : matrix.length === 16 ? { x: matrix[12], y: matrix[13] } : { x: Number.NaN, y: Number.NaN };
        };
        const close = (actual, expected) => Number.isFinite(actual) && Math.abs(actual - expected) < 0.5;
        const defaultDateTranslation = translation(recentStates.default.dateTransform);
        const defaultMetricsTranslation = translation(recentStates.default.metricsTransform);
        const defaultArrowTranslation = translation(recentStates.default.arrowTransform);
        const detailTransforms = [recentStates.hover, recentStates.focus, recentStates.active].every((snapshot) => {
          const dateTranslation = translation(snapshot.dateTransform);
          const metricsTranslation = translation(snapshot.metricsTransform);
          const scoreTranslation = translation(snapshot.scoreTransform);
          const arrowTranslation = translation(snapshot.arrowTransform);
          return close(dateTranslation.y, -2) && close(metricsTranslation.y, 0)
            && close(scoreTranslation.x, -24) && close(arrowTranslation.x, 0);
        });
        const recentLayoutSafe = (snapshot) => snapshot.metadata?.box?.width > 0
          && snapshot.title?.whiteSpace === 'nowrap' && snapshot.title?.textOverflow === 'ellipsis' && snapshot.title?.overflow === 'hidden'
          && snapshot.dateWhiteSpace === 'nowrap' && snapshot.dateTextOverflow === 'ellipsis' && snapshot.dateOverflow === 'hidden'
          && snapshot.dateBox?.right <= snapshot.metadata.box.right + 0.5
          && (snapshot.metricsOpacity === '1'
            ? !boxesOverlap(snapshot.metricsContentBox, snapshot.scoreBox) && !boxesOverlap(snapshot.metricsContentBox, snapshot.arrowLayerBox)
            : !boxesOverlap(snapshot.dateBox, snapshot.scoreBox) && !boxesOverlap(snapshot.dateBox, snapshot.arrowLayerBox));
        const reducedTransitionContract = (snapshot) => [
          [snapshot.transitionProperty, snapshot.transitionDuration],
          [snapshot.dateTransitionProperty, snapshot.dateTransitionDuration],
          [snapshot.metricsTransitionProperty, snapshot.metricsTransitionDuration],
          [snapshot.scoreTransitionProperty, snapshot.scoreTransitionDuration],
          [snapshot.arrowTransitionProperty, snapshot.arrowTransitionDuration],
        ].every(([property, duration]) => property === 'none' && duration === '0s');
        const recentSnapshots = [
          recentStates.default,
          recentStates.hover,
          recentStates.focus,
          recentStates.active,
          recentStates.reverseHover,
          ...Object.values(measurements.reducedMotionStates ?? {}),
        ];
        const kkStressClippingContract = descriptor.id !== 'recent-metric-stress-kk'
          || recentSnapshots.every((snapshot) => snapshot.dateScrollWidth > snapshot.dateClientWidth
            && snapshot.metadata?.clientWidth === snapshot.dateClientWidth
            && snapshot.dateClientWidth === 48
            && snapshot.dateWhiteSpace === 'nowrap'
            && snapshot.dateTextOverflow === 'ellipsis'
            && snapshot.dateOverflow === 'hidden');
        if (recentPanel.box.width !== 320 || recentPanel.box.height !== 242 || recentPanel.padding !== '24px 24px 32px'
          || recentPanel.gap !== '16px' || recentPanel.backgroundColor !== 'rgb(255, 255, 255)' || recentPanel.borderRadius !== '16px'
          || recentPanel.list.box.width !== 272 || recentPanel.list.box.height !== 150 || recentPanel.list.gap !== '0px'
          || recentPanel.rows.length !== 3 || recentPanel.rows.some((row) => row.width !== 272 || row.height !== 50)) {
          throw new VisualContractError(`${descriptor.id}: exact 320x242 panel or 272x150 gapless row geometry failed (${JSON.stringify(recentPanel)})`);
        }
        if (recentStates.default.backgroundColor !== 'rgb(255, 255, 255)' || recentStates.default.dateOpacity !== '1'
          || recentStates.default.metricsOpacity !== '0' || recentStates.default.arrowOpacity !== '0'
          || !close(defaultDateTranslation.y, 0) || !close(defaultMetricsTranslation.y, 2) || !close(defaultArrowTranslation.x, 4)
          || !detailsVisible(recentStates.hover, 'rgb(251, 251, 251)')
          || !detailsVisible(recentStates.focus, 'rgb(251, 251, 251)')
          || !detailsVisible(recentStates.active, 'rgb(246, 245, 247)')
          || ![recentStates.default, recentStates.hover, recentStates.focus, recentStates.active].every(transitionContract)
          || !detailTransforms
          || !sameBox(recentStates.reverseHover.box, recentStates.default.box)
          || recentStates.reverseHover.backgroundColor !== recentStates.default.backgroundColor
          || recentStates.reverseHover.dateOpacity !== recentStates.default.dateOpacity
          || recentStates.reverseHover.metricsOpacity !== recentStates.default.metricsOpacity
          || recentStates.reverseHover.arrowOpacity !== recentStates.default.arrowOpacity
          || !recentSnapshots.every(recentLayoutSafe)
          || !measurements.reducedMotionStates
          || !Object.values(measurements.reducedMotionStates).every(reducedTransitionContract)
          || !detailsVisible(measurements.reducedMotionStates.hover, 'rgb(251, 251, 251)')
          || !detailsVisible(measurements.reducedMotionStates.focus, 'rgb(251, 251, 251)')
          || !detailsVisible(measurements.reducedMotionStates.active, 'rgb(246, 245, 247)')
          || !kkStressClippingContract) {
          throw new VisualContractError(`${descriptor.id}: default/hover/focus/native active state paint or layout stability failed (${JSON.stringify({ recentStates, reducedMotionStates: measurements.reducedMotionStates })})`);
        }
        const metricGeometryMatches = (visible) => visible.metricsGap === '8px' && visible.scoreGap === '4px' && visible.arrow.box.width === 18 && visible.arrow.box.height === 18 && visible.arrow.color === 'rgb(177, 172, 185)'
          && visible.correct.gap === '4px' && visible.correct.marker.box.width === 14 && visible.correct.marker.box.height === 14 && visible.correct.marker.flexShrink === '0' && visible.correct.marker.backgroundColor === 'rgb(41, 174, 112)' && visible.correct.glyph?.box.width === 8 && visible.correct.glyph.box.height === 8 && visible.correct.glyph.flexShrink === '0' && visible.correct.count.color === 'rgb(34, 145, 93)'
          && visible.incorrect.gap === '4px' && visible.incorrect.marker.box.width === 14 && visible.incorrect.marker.box.height === 14 && visible.incorrect.marker.flexShrink === '0' && visible.incorrect.marker.backgroundColor === 'rgb(231, 48, 35)' && visible.incorrect.glyph?.box.width === 8 && visible.incorrect.glyph.box.height === 8 && visible.incorrect.glyph.flexShrink === '0' && visible.incorrect.count.color === 'rgb(188, 37, 26)'
          && visible.skipped.gap === '4px' && visible.skipped.marker.box.width === 14 && visible.skipped.marker.box.height === 14 && visible.skipped.marker.flexShrink === '0' && visible.skipped.marker.borderWidth === '1px' && visible.skipped.marker.borderColor === 'rgb(140, 134, 152)' && visible.skipped.count.color === 'rgb(110, 103, 121)'
          && visible.tooltipCount === 0 && visible.accessibleName === recentStates.default.accessibleName;
        if (![recentStates.hover, recentStates.focus, recentStates.active].every(metricGeometryMatches)
          || !recentStates.navigation?.includes('/tests/random?attemptRef=attempt-1')) {
          throw new VisualContractError(`${descriptor.id}: metric marker, arrow, tooltip removal, or native navigation contract failed`);
        }
        if (descriptor.region === 'recent-metric-stress') {
          for (const [stateName, snapshot] of Object.entries({ hover: recentStates.hover, focus: recentStates.focus, active: recentStates.active })) {
            if (snapshot.correct.count.text !== '0' || snapshot.incorrect.count.text !== '0' || snapshot.skipped.count.text !== '20') {
              throw new VisualContractError(`${descriptor.id}: ${stateName} must retain stress counts 0/0/20 (${JSON.stringify(snapshot)})`);
            }
          }
        }
      }
      if (descriptor.region === 'history-mobile') {
        measurements.mobileSanity = await page.evaluate(() => {
          const desktop = document.querySelector('[data-tests-desktop]');
          const mobile = document.querySelector('[data-tests-mobile]');
          return {
            viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
            desktopDisplay: desktop ? getComputedStyle(desktop).display : null,
            desktopRects: desktop?.getClientRects().length ?? 0,
            mobileDisplay: mobile ? getComputedStyle(mobile).display : null,
            mobileRects: mobile?.getClientRects().length ?? 0,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
        const sanity = measurements.mobileSanity;
        if (sanity.viewport.devicePixelRatio !== 1 || sanity.desktopDisplay !== 'none' || sanity.desktopRects !== 0
          || sanity.mobileDisplay === 'none' || sanity.mobileRects === 0 || sanity.scrollWidth !== descriptor.width) {
          throw new VisualContractError(`${descriptor.id}: desktop must stay hidden and unchanged mobile must fit the viewport (${JSON.stringify(sanity)})`);
        }
      }
      if (descriptor.selector === '[data-tests-desktop]' && measurements.chapterCards.length > 0 && measurements.chapterMetrics.length > 0) {
        const card = page.locator('[data-chapter-card]').first();
        await card.hover();
        const bodyHover = await page.locator('[data-chapter-card] [role="tooltip"]').first().evaluate((element) => getComputedStyle(element).opacity);
        await page.locator('[data-chapter-metric="accuracy"]').first().hover();
        const tooltipOpacity = (trigger) => trigger.evaluate((element) => {
          const tooltip = document.getElementById(element.getAttribute('aria-describedby'));
          return tooltip ? getComputedStyle(tooltip).opacity : null;
        });
        measurements.tooltipStates = {
          bodyHover,
          accuracyHover: await tooltipOpacity(page.locator('[data-chapter-metric="accuracy"]').first()),
        };
        await page.locator('[data-chapter-metric="delta"]').first().focus();
        measurements.tooltipStates.deltaFocus = await tooltipOpacity(page.locator('[data-chapter-metric="delta"]').first());
      }
  if (descriptor.region.startsWith('chapter-')) {
    const tooltipOpacities = () => page.locator('[data-chapter-card] [role="tooltip"]').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));
    if (measurements.chapterContract?.tooltipCount > 0) {
      await page.locator('[data-chapter-title]').hover();
      await waitForTooltipOpacity(page, Array(measurements.chapterContract.tooltipCount).fill('0'));
      measurements.chapterTooltipStates = { bodyHover: await tooltipOpacities() };
      if (measurements.chapterContract.accuracy) {
        await page.locator('[data-chapter-metric="accuracy"]').hover();
        await waitForTooltipOpacity(page, measurements.chapterContract.delta ? ['1', '0'] : ['1']);
        measurements.chapterTooltipStates.accuracyHover = await tooltipOpacities();
      }
      if (measurements.chapterContract.noData) {
        const trigger = page.locator('[data-chapter-no-data]').locator('..').locator('button');
        await trigger.hover();
        await waitForTooltipOpacity(page, ['1']);
        measurements.chapterTooltipStates.noDataHover = await tooltipOpacities();
        await trigger.focus();
        await waitForTooltipOpacity(page, ['1']);
        measurements.chapterTooltipStates.noDataFocus = await tooltipOpacities();
      }
      if (measurements.chapterContract.delta) {
        await page.locator('[data-chapter-metric="delta"]').hover();
        await waitForTooltipOpacity(page, ['0', '1']);
        measurements.chapterTooltipStates.deltaHover = await tooltipOpacities();
        await page.locator('[data-chapter-metric="delta"]').focus();
        await waitForTooltipOpacity(page, ['0', '1']);
        measurements.chapterTooltipStates.deltaFocus = await tooltipOpacities();
      }
    } else {
      measurements.chapterTooltipStates = { bodyHover: [] };
    }

    const contract = measurements.chapterContract;
    const shortTitle = descriptor.region === 'chapter-short-title';
    const expectedState = descriptor.region === 'chapter-no-test' || descriptor.region === 'chapter-legacy-no-test' || shortTitle
      ? { badge: 'Нет данных', badgeBackground: 'rgb(248, 245, 252)', badgeColor: 'rgb(165, 133, 219)', tooltips: 1, noData: true, accuracy: false, delta: false }
      : descriptor.region === 'chapter-first-test'
        ? { badge: '70%', badgeBackground: 'rgb(164, 229, 199)', badgeColor: 'rgb(34, 145, 93)', tooltips: 1, accuracy: true, delta: false }
        : { badge: '96%', badgeBackground: 'rgb(164, 229, 199)', badgeColor: 'rgb(34, 145, 93)', tooltips: 2, accuracy: true, delta: true };
    const exactBox = (actual, width, height) => actual?.width === width && actual?.height === height;
    if (!contract || !exactBox(contract.card.box, 320, 196) || contract.card.style.backgroundColor !== 'rgb(255, 255, 255)'
      || contract.card.style.borderRadius !== '16px' || contract.card.style.borderWidth !== '0px' || contract.card.style.padding !== '24px' || contract.card.style.gap !== '24px') {
      throw new VisualContractError(`${descriptor.id}: exact 320x196 surface contract failed`);
    }
    if (!exactBox(contract.content.box, 272, 102)
      || contract.badge?.text !== expectedState.badge || contract.badge.style.backgroundColor !== expectedState.badgeBackground
      || contract.badge.style.color !== expectedState.badgeColor || contract.badge.style.borderRadius !== '8px'
      || contract.badge.style.padding !== '4px 16px' || contract.badge.style.fontSize !== '14px'
      || contract.badge.style.fontWeight !== '500' || contract.badge.style.fontStyle !== 'normal' || contract.badge.style.lineHeight !== '14px') {
      throw new VisualContractError(`${descriptor.id}: exact content and badge contract failed`);
    }
    const expectedTitle = shortTitle ? 'Системы счисления' : 'Современные тенденции развития информационных технологий. IT Startup (ай-ти-стартап). 3D моделирования';
    const expectedTitleHeight = shortTitle ? 16 : 64;
    const expectedTitleLines = shortTitle ? 1 : 4;
    const expectedTabOrder = expectedState.noData
      ? ['button', 'navigation']
      : expectedState.tooltips === 1
        ? ['accuracy', 'navigation']
        : ['accuracy', 'delta', 'navigation'];
    if (contract.title.text !== expectedTitle
      || contract.title.box.width !== 272 || contract.title.box.height !== expectedTitleHeight || contract.title.lineRects.length !== expectedTitleLines
      || contract.title.style.fontSize !== '16px' || contract.title.style.fontWeight !== '500' || contract.title.style.fontStyle !== 'normal'
      || contract.title.style.lineHeight !== '16px' || contract.title.style.color !== 'rgb(22, 21, 25)'
      || contract.question.text !== '64 вопроса' || contract.question.box.width !== 272 || contract.question.box.height !== 14
      || contract.question.style.fontSize !== '14px' || contract.question.style.fontWeight !== '400' || contract.question.style.fontStyle !== 'normal'
      || contract.question.style.lineHeight !== '14px' || contract.question.style.color !== 'rgb(110, 103, 121)'
      || contract.question.box.y !== 158 || contract.questionBottomInset !== 24 || contract.titleToQuestionGap < 24) {
      throw new VisualContractError(`${descriptor.id}: exact title, four-line wrap, or question typography contract failed`);
    }
    if (!exactBox(contract.navigationHitBox?.box, 272, 102) || contract.navigationHitBox.box.y !== 70
      || contract.navigationHitBox.tag !== 'a' || !contract.navigationHitBox.href?.startsWith('/tests/chapter?chapterRef=')
      || contract.interactiveDescendants !== 0 || contract.overlap
      || JSON.stringify(contract.tabOrder) !== JSON.stringify(expectedTabOrder)) {
      throw new VisualContractError(`${descriptor.id}: sibling navigation, non-overlapping hitboxes, or keyboard tab order failed`);
    }
    if (contract.tooltipCount !== expectedState.tooltips || Boolean(contract.accuracy) !== expectedState.accuracy || Boolean(contract.delta) !== expectedState.delta
      || measurements.chapterTooltipStates.bodyHover.some((opacity) => opacity !== '0')) {
      throw new VisualContractError(`${descriptor.id}: metric visibility or card-body tooltip isolation failed`);
    }
    if (contract.accuracy && (contract.accuracy.accessibleName !== expectedState.badge || !contract.accuracy.describedBy
      || contract.accuracy.tooltip.style.pointerEvents !== 'none' || measurements.chapterTooltipStates.accuracyHover?.[0] !== '1')) {
      throw new VisualContractError(`${descriptor.id}: accuracy tooltip target contract failed`);
    }
    if (contract.noData && (contract.noData.tooltipText !== 'Общая точность по разделу появится после первого теста'
      || !contract.noData.describedBy || contract.noData.tooltip.style.pointerEvents !== 'none'
      || measurements.chapterTooltipStates.noDataHover?.[0] !== '1' || measurements.chapterTooltipStates.noDataFocus?.[0] !== '1')) {
      throw new VisualContractError(`${descriptor.id}: no-data tooltip target, copy, or focus contract failed`);
    }
    if (contract.delta) {
      if (!exactBox(contract.deltaIcon?.box, 20, 20) || contract.delta.style.gap !== '6px' || contract.delta.style.fontSize !== '12px'
        || contract.delta.style.fontWeight !== '500' || contract.delta.style.lineHeight !== '12px' || contract.delta.style.color !== 'rgb(242, 95, 84)'
        || contract.delta.text !== '-3.6%' || contract.delta.accessibleName !== '-3.6%' || !contract.delta.describedBy || contract.delta.tooltip.style.pointerEvents !== 'none'
        || measurements.chapterTooltipStates.accuracyHover?.[1] !== '0' || measurements.chapterTooltipStates.deltaHover?.[0] !== '0'
        || measurements.chapterTooltipStates.deltaHover?.[1] !== '1' || measurements.chapterTooltipStates.deltaFocus?.[1] !== '1') {
        throw new VisualContractError(`${descriptor.id}: exact delta glyph, tone, value, or tooltip isolation failed`);
      }
    }
    if (measurements.fontReadiness.status !== 'loaded' || ![contract.badge, contract.title, contract.question].every((item) => item.renderedFont.loaded)) {
      throw new VisualContractError(`${descriptor.id}: Mabry fonts were not ready before measurement`);
    }
  }
  if (descriptor.region === 'statistics-empty' || descriptor.region === 'recent-empty') {
    const contract = measurements.emptyPanelContract;
    const statistics = descriptor.region === 'statistics-empty';
    const expected = statistics
      ? { width: 320, height: 134, heading: 'Статистика', title: 'Общая точность появится здесь' }
      : { width: 320, height: 242, heading: 'Недавние тесты', title: 'История тестов появится здесь' };
    if (!contract || contract.panel.box.width !== expected.width || contract.panel.box.height !== expected.height
      || contract.panel.style.backgroundColor !== 'rgb(255, 255, 255)' || contract.panel.style.borderRadius !== '16px'
      || contract.panel.style.borderWidth !== '0px' || contract.panel.style.padding !== '24px 24px 32px' || contract.panel.style.gap !== '16px') {
      throw new VisualContractError(`${descriptor.id}: exact empty-panel surface contract failed (${JSON.stringify(contract ? { box: contract.panel.box, style: contract.panel.style } : null)})`);
    }
    if (contract.heading.text !== expected.heading || contract.heading.style.fontSize !== '20px' || contract.heading.style.fontWeight !== '500'
      || contract.heading.style.fontStyle !== 'normal' || contract.heading.style.lineHeight !== '20px' || contract.heading.style.color !== 'rgb(22, 21, 25)'
      || contract.copy.style.padding !== '0px 8px' || contract.copy.style.gap !== '4px'
      || contract.title.text !== expected.title || contract.title.style.fontSize !== '16px' || contract.title.style.fontWeight !== '400'
      || contract.title.style.lineHeight !== '16px' || contract.title.style.color !== 'rgb(57, 54, 63)'
      || contract.body.text !== 'после первого теста' || contract.body.style.fontSize !== '14px' || contract.body.style.fontWeight !== '400'
      || contract.body.style.lineHeight !== '14px' || contract.body.style.color !== 'rgb(140, 134, 152)') {
      throw new VisualContractError(`${descriptor.id}: exact empty-panel copy and typography contract failed`);
    }
    if (statistics && (contract.spacer?.box.width !== 67 || contract.spacer?.box.height !== 28)) {
      throw new VisualContractError(`${descriptor.id}: exact 67x28 statistics spacer contract failed`);
    }
    if (!statistics && contract.spacer !== null) {
      throw new VisualContractError(`${descriptor.id}: recent empty state must not render the statistics spacer`);
    }
    if (measurements.fontReadiness.status !== 'loaded' || ![contract.heading, contract.title, contract.body].every((item) => item.renderedFont.loaded)) {
      throw new VisualContractError(`${descriptor.id}: Mabry fonts were not ready before measurement`);
    }
  }
  if (descriptor.region === 'full' && descriptor.selector === '[data-tests-desktop]' && measurements.showMore && measurements.chapterCards.length >= 2) {
    const [first, second] = measurements.chapterCards;
    const firstRowGap = second.box.x - first.box.right;
    const expectedWidth = first.box.width + firstRowGap + second.box.width;
    if (Math.abs(measurements.showMore.box.width - expectedWidth) > 1) {
      throw new VisualContractError(`${descriptor.id}: show-more width ${measurements.showMore.box.width}px must equal two chapter cards plus their ${firstRowGap}px grid gap (${expectedWidth}px)`);
    }
  }
  if (descriptor.id === 'desktop-full-1080') {
    const randomCard = measurements.cards.find((card) => card.mode === 'random');
    const weakCard = measurements.cards.find((card) => card.mode === 'weak');
    if (randomCard?.tag !== 'a' || randomCard.href !== '/tests/random' || randomCard.interactiveDescendants !== 0
      || weakCard?.tag !== 'a' || weakCard.href !== '/tests/weak' || weakCard.interactiveDescendants !== 0) {
      throw new VisualContractError(`${descriptor.id}: option-card root link or nested action contract failed`);
    }
    const interaction = measurements.optionCardInteraction;
    const transition = (state) => [state.transitionProperty, state.transitionDuration, state.transitionTimingFunction].join('|');
    if (!interaction || transition(interaction.random.base) !== transition(interaction.weak.base)
      || transition(interaction.random.hover) !== transition(interaction.weak.hover)
      || transition(interaction.random.focus) !== transition(interaction.weak.focus)
      || interaction.random.hover.transform === 'none' || interaction.random.hover.transform !== interaction.weak.hover.transform
      || interaction.random.focus.transform === 'none' || interaction.random.focus.transform !== interaction.weak.focus.transform) {
      throw new VisualContractError(`${descriptor.id}: option-card hover/focus transition parity failed`);
    }
  }
  if (descriptor.region === 'loading' && descriptor.selector === '[data-tests-desktop]') {
    const modeHeights = measurements.modeSkeletons.map((skeleton) => skeleton.box?.height);
    if (modeHeights.length !== 3 || modeHeights.some((height, index) => height !== [196, 196, 180][index])) {
      throw new VisualContractError(`${descriptor.id}: loading state must render exactly three mode skeletons at 196px, 196px, and 180px`);
    }
    if (measurements.chapterSkeletons.length !== 6 || measurements.chapterSkeletons.some((skeleton) => skeleton.box?.height !== 196)) {
      throw new VisualContractError(`${descriptor.id}: loading state must render exactly six 196px chapter skeletons`);
    }
    if (measurements.cards.length !== 0 || measurements.chapterCards.length !== 0) {
      throw new VisualContractError(`${descriptor.id}: loading state must not expose mock content or ready chapter cards`);
    }
  }
  if (descriptor.width === 1440 && descriptor.height === 1293) {
    const uiBottom = Math.max(
          measurements.root?.y ?? 0,
          ...measurements.cards.map((card) => card.box?.bottom ?? 0),
          ...measurements.chapterCards.map((card) => card.box?.bottom ?? 0),
          ...measurements.modeSkeletons.map((skeleton) => skeleton.box?.bottom ?? 0),
          ...measurements.chapterSkeletons.map((skeleton) => skeleton.box?.bottom ?? 0),
          ...measurements.hitTargets.map((target) => target.box?.bottom ?? 0),
    );
    measurements.negativeRegion = { startY: 1080, uiBottom, empty: uiBottom <= 1080 };
    if (uiBottom > 1080) throw new VisualContractError(`${descriptor.id}: UI extends into the Figma negative region below y=1080`);
  }
  if (descriptor.region === 'negative' && descriptor.selector === '[data-tests-desktop]' && measurements.cards.some((card) => card.ariaDisabled !== 'true')) {
    throw new VisualContractError(`${descriptor.id}: dashboard-error option cards must remain aria-disabled until the server dashboard is available`);
  }
  if (descriptor.region === 'negative' && descriptor.selector === '[data-tests-desktop]'
    && (measurements.metricVisibility.statisticsEmptyCount !== 0 || measurements.metricVisibility.statisticsSpacerCount !== 0)) {
    throw new VisualContractError(`${descriptor.id}: dashboard-error state must not infer empty statistics without a ready dashboard`);
  }
  if (descriptor.region === 'legacy-missing-counts') {
    const visibility = measurements.metricVisibility;
    if (visibility.statisticsEmptyCount !== 1 || visibility.statisticsSpacerCount !== 1
      || visibility.statisticsAccuracyCount !== 0 || visibility.statisticsDeltaCount !== 0
      || measurements.chapterCards.length !== 6 || visibility.chapterNoDataCount !== 6 || visibility.chapterMetricCount !== 0) {
      throw new VisualContractError(`${descriptor.id}: ready legacy payload must render only inferred empty statistics and chapter badges`);
    }
  }
  if (descriptor.region === 'zero-bank' && descriptor.selector === '[data-tests-desktop]' && measurements.chapterCards.length > 0) {
    if (!measurements.chapterCards.every((card) => card.available === 'false' && card.ariaDisabled === 'true' && card.href === null && card.linkCount === 0)) {
      throw new VisualContractError(`${descriptor.id}: zero-bank chapter cards must be aria-disabled and non-navigable`);
    }
  }
  if (['analyze-loading', 'analyze-error', 'stale-error', 'stale-catalog'].includes(descriptor.region)) {
    if (measurements.weakAction && (measurements.weakAction.tag === 'a' || measurements.weakAction.href !== null || measurements.weakAction.ariaDisabled !== 'true')) {
      throw new VisualContractError(`${descriptor.id}: stale or non-ready state exposed a weak-card link`);
    }
    if (['analyze-loading', 'analyze-error'].includes(descriptor.region) && measurements.weakAction?.contract === 'weak-pre-analysis') {
      throw new VisualContractError(`${descriptor.id}: non-empty Analyze state claimed the empty-analysis prerequisite`);
    }
  }
  if (descriptor.region === 'weak-pre-analysis' || descriptor.region === 'mock-inactive') {
    const expected = descriptor.region === 'weak-pre-analysis'
      ? { width: 320, height: 196, badge: 'После анализа ЕНТ', titleWidth: 127, descriptionWidth: 272, descriptionHeight: 32, descriptionLines: 2, badgeX: 153, badgeWidth: 143 }
      : { width: 655, height: 180, badge: 'В процессе разработки', titleWidth: 131, descriptionWidth: 607, descriptionHeight: 16, descriptionLines: 1, badgeX: 468, badgeWidth: 163 };
    const card = measurements.cards[0];
    if (!card || card.box.width !== expected.width || card.box.height !== expected.height) {
      throw new VisualContractError(`${descriptor.id}: expected exact ${expected.width}x${expected.height} layout bbox`);
    }
    if (measurements.contractIcon?.box.width !== 48 || measurements.contractIcon?.box.height !== 48 || measurements.contractGlyph?.box.width !== 24 || measurements.contractGlyph?.box.height !== 24) {
      throw new VisualContractError(`${descriptor.id}: expected exact 48px icon container and 24px glyph bboxes`);
    }
    const expectedActionCount = descriptor.region === 'weak-pre-analysis' ? 1 : 0;
    if (measurements.actionCount !== expectedActionCount || measurements.statusBadge?.text !== expected.badge) {
      throw new VisualContractError(`${descriptor.id}: option-card action/badge contract failed`);
    }
    if (descriptor.region === 'weak-pre-analysis'
      && (card.tag !== 'a' || card.href !== '/analyze' || card.ariaDisabled !== null || card.interactiveDescendants !== 0)) {
      throw new VisualContractError(`${descriptor.id}: prerequisite card root must be the only /analyze link`);
    }
    if (descriptor.region === 'mock-inactive'
      && (card.tag !== 'div' || card.href !== null || card.ariaDisabled !== 'true' || card.interactiveDescendants !== 0)) {
      throw new VisualContractError(`${descriptor.id}: mock card must remain a disabled non-interactive surface`);
    }
    if (card.style.borderRadius !== '16px' || card.style.borderWidth !== '0px' || card.style.backgroundColor !== 'rgb(255, 255, 255)' || card.style.padding !== '24px 24px 32px' || card.style.gap !== '24px') {
      throw new VisualContractError(`${descriptor.id}: inactive card computed surface contract failed`);
    }
    const typography = measurements.contractTypography;
    const close = (actual, wanted, tolerance = 1.1) => Math.abs(actual - wanted) <= tolerance;
    if (!typography || !close(typography.title.box.x, 24) || !close(typography.title.box.y, 96) || !close(typography.title.box.width, expected.titleWidth) || !close(typography.title.box.height, 20)
      || !close(typography.description.box.x, 24) || !close(typography.description.box.y, 132) || !close(typography.description.box.width, expected.descriptionWidth) || !close(typography.description.box.height, expected.descriptionHeight)
      || typography.description.lineRects.length !== expected.descriptionLines
      || !close(typography.badge.box.x, expected.badgeX, 0.01) || !close(typography.badge.box.y, 24, 0.01) || !close(typography.badge.box.width, expected.badgeWidth, 0.01) || !close(typography.badge.box.height, 28, 0.01)) {
      throw new VisualContractError(`${descriptor.id}: exact Figma text/badge bbox or wrapping contract failed`);
    }
    if (!close(typography.topRow.box.x, 24) || !close(typography.topRow.box.y, 24) || !close(typography.topRow.box.width, expected.descriptionWidth) || !close(typography.topRow.box.height, 48)
      || !close(typography.content.box.x, 24) || !close(typography.content.box.y, 96) || !close(typography.content.box.width, expected.descriptionWidth)
      || typography.content.style.gap !== '16px'
      || measurements.contractIcon.style.borderRadius !== '8px'
      || measurements.contractIcon.style.backgroundColor !== (descriptor.region === 'weak-pre-analysis' ? 'rgb(242, 95, 84)' : 'rgb(203, 240, 223)')
      || typography.badge.style.backgroundColor !== 'rgb(248, 245, 252)' || typography.badge.style.borderRadius !== '8px' || typography.badge.style.padding !== '8px 16px') {
      throw new VisualContractError(`${descriptor.id}: exact Figma row/content/icon/badge computed contract failed`);
    }
    if (measurements.fontReadiness.status !== 'loaded' || ![typography.title, typography.description, typography.badge].every((item) => item.renderedFont.loaded)) {
      throw new VisualContractError(`${descriptor.id}: Mabry fonts were not ready before measurement`);
    }
    const typographyContract = [
      [typography.title, '20px', '500', '20px', descriptor.region === 'weak-pre-analysis' ? 'rgb(22, 21, 25)' : 'rgb(110, 103, 121)'],
      [typography.description, '16px', '400', '16px', descriptor.region === 'weak-pre-analysis' ? 'rgb(110, 103, 121)' : 'rgb(177, 172, 185)'],
      [typography.badge, '12px', '500', '12px', 'rgb(165, 133, 219)'],
    ];
    if (!typographyContract.every(([item, fontSize, fontWeight, lineHeight, color]) => item.style.fontFamily.includes('Mabry Pro')
      && item.style.fontSize === fontSize && item.style.fontWeight === fontWeight && item.style.fontStyle === 'normal'
      && item.style.lineHeight === lineHeight && item.style.letterSpacing === 'normal' && item.style.color === color)) {
      throw new VisualContractError(`${descriptor.id}: exact Mabry computed typography contract failed`);
    }
  }
  // Capture the deterministic viewport, not the component's min-height. This
  // preserves the 1440x1080 primary crop while the 1293 capture explicitly
  // inventories the negative region below the content-bearing frame.
  const screenshotPath = path.join(outputDir, `${descriptor.id}.png`);
  const elementScreenshot = descriptor.elementScreenshot
    ? await page.locator(descriptor.selector).screenshot({ path: screenshotPath })
    : await page.screenshot({ path: screenshotPath, fullPage: false });
  const selectedReference = descriptor.referenceKey
    ? downloadedReferences[descriptor.referenceKey]?.path ?? null
    : descriptor.region === 'weak-pre-analysis'
    ? weakReferenceImage
    : descriptor.region === 'mock-inactive'
      ? mockReferenceImage
      : referenceImage;
  const diff = await renderOverlayDiff(page, elementScreenshot, selectedReference, descriptor);
  return {
    id: descriptor.id,
    storyId: descriptor.story,
    figmaNode: descriptor.figmaNode ?? figmaNode,
    region: descriptor.region,
    viewport: { width: descriptor.width, height: descriptor.height },
    referenceKey: descriptor.referenceKey ?? null,
    screenshot: screenshotPath,
    diff,
    ...measurements,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  downloadedReferences = await downloadReferenceAssets();
  let browser;
  try {
      browser = await chromium.launch({ headless: true });
  } catch (error) {
    await writeStatus('NOT RUN', { reason: `Browser unavailable: ${error.message}` });
    console.error(`NOT RUN: browser unavailable (${error.message})`);
      return;
    }

    const measurements = [];
    try {
      const probe = await browser.newPage();
      try {
        await assertStorybookStories(probe);
      } finally {
        await probe.close();
      }
      for (const descriptor of activeCaptures) {
      const page = await browser.newPage({ viewport: { width: descriptor.width, height: descriptor.height }, deviceScaleFactor: 1, locale: descriptor.locale ?? 'ru-RU' });
      try {
        measurements.push(await capture(page, descriptor));
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    const status = error instanceof VisualContractError ? 'FAIL' : 'NOT RUN';
    await writeStatus(status, { reason: error.message, completed: measurements.map((item) => item.id) });
    console.error(`${status}: ${error.message}`);
    if (status === 'FAIL') process.exitCode = 1;
    return;
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
  const desktopReferenceCaptures = measurements.filter((item) => ['desktop-full-1080', 'desktop-full-1293'].includes(item.id));
  const referenceSummary = {
    desktop: referenceImage
      ? {
        status: desktopReferenceCaptures.some((item) => item.diff?.status === 'FAIL')
          ? 'FAIL'
          : desktopReferenceCaptures.some((item) => item.diff?.status === 'APPROXIMATION')
            ? 'APPROXIMATION'
          : desktopReferenceCaptures.length === 2 && desktopReferenceCaptures.every((item) => item.diff?.status === 'PASS')
            ? 'PASS'
            : 'NOT RUN',
        completedCaptures: desktopReferenceCaptures.map((item) => item.id),
        requiredCaptures: ['desktop-full-1080', 'desktop-full-1293'],
      }
      : { status: 'NOT RUN', reason: 'FIGMA_REFERENCE_IMAGE was not provided' },
    weakPreAnalysis: weakReferenceImage
      ? measurements.find((item) => item.id === 'weak-pre-analysis')?.diff ?? { status: 'NOT RUN' }
      : { status: 'NOT RUN', reason: 'FIGMA_WEAK_REFERENCE_IMAGE was not provided' },
    mockInactive: mockReferenceImage
      ? measurements.find((item) => item.id === 'mock-inactive')?.diff ?? { status: 'NOT RUN' }
      : { status: 'NOT RUN', reason: 'FIGMA_MOCK_REFERENCE_IMAGE was not provided' },
    chapterNoTest: measurements.find((item) => item.id === 'chapter-no-test')?.diff ?? { status: 'NOT RUN' },
    chapterFirstTest: measurements.find((item) => item.id === 'chapter-first-test')?.diff ?? { status: 'NOT RUN' },
    chapterFull: measurements.find((item) => item.id === 'chapter-full')?.diff ?? { status: 'NOT RUN' },
    statisticsEmpty: measurements.find((item) => item.id === 'statistics-empty')?.diff ?? { status: 'NOT RUN' },
    recentEmpty: measurements.find((item) => item.id === 'recent-empty')?.diff ?? { status: 'NOT RUN' },
  };
  const requiredReferenceCaptures = measurements.filter((item) => item.referenceKey);
  const failedReferences = requiredReferenceCaptures.filter((item) => item.diff?.status === 'FAIL');
  const approximateReferences = requiredReferenceCaptures.filter((item) => item.diff?.status === 'APPROXIMATION');
  const missingReferences = requiredReferenceCaptures.filter((item) => item.diff?.status === 'NOT RUN');
  const status = failedReferences.length > 0 ? 'FAIL' : approximateReferences.length > 0 ? 'APPROXIMATION' : missingReferences.length > 0 ? 'NOT RUN' : 'PASS';
  await writeStatus(status, {
    captures: measurements.length,
    visualScope,
    figmaNode,
    referenceImage: {
      desktop: referenceImage ?? 'NOT RUN',
      weakPreAnalysis: weakReferenceImage ?? 'NOT RUN',
      mockInactive: mockReferenceImage ?? 'NOT RUN',
      downloaded: downloadedReferences,
    },
    reference: referenceSummary,
  });
  if (status === 'FAIL') process.exitCode = 1;
  console.log(`Tests hub screenshots and measurements saved to ${outputDir}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch(async (error) => {
    await writeStatus('FAIL', { reason: error.message });
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
