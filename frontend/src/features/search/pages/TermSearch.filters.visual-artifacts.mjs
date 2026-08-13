import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const outputDir = process.env.OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../../../test-results/search-filters-task5');
const manifestFilename = 'TermSearch.filters.figma-references.json';
const manifest = JSON.parse(
  await fs.readFile(path.resolve(import.meta.dirname, manifestFilename), 'utf8'),
);
assert.equal(manifest.schemaVersion, 1, 'Figma reference manifest schema');
assert.equal(manifest.fileKey, 'aa8qReawBBhHIXDAbS18OP', 'Figma reference file key');
const states = Object.keys(manifest.references);
const panelCrop = manifest.comparisonRegion;

function assertRect(actual, expected, label) {
  for (const property of ['x', 'y', 'width', 'height']) {
    assert.equal(actual[property], expected[property], `${label} ${property}`);
  }
}

function assertStyles(actual, expected, label) {
  for (const [property, value] of Object.entries(expected)) {
    assert.equal(actual[property], value, `${label} ${property}`);
  }
}

async function createVisualArtifacts(state) {
  const referenceMetadata = manifest.references[state];
  const [referenceBuffer, actualBuffer] = await Promise.all([
    fs.readFile(path.join(outputDir, referenceMetadata.filename)),
    fs.readFile(path.join(outputDir, `${state}.actual.png`)),
  ]);
  assert.equal(
    createHash('sha256').update(referenceBuffer).digest('hex'),
    referenceMetadata.sha256,
    `${state} reference SHA-256`,
  );
  const referencePage = PNG.sync.read(referenceBuffer);
  const actualPage = PNG.sync.read(actualBuffer);
  assert.equal(actualPage.width, referencePage.width, `${state} reference and actual widths`);
  assert.equal(actualPage.height, referencePage.height, `${state} reference and actual heights`);
  const expected = cropImage(referencePage, panelCrop);
  const received = cropImage(actualPage, panelCrop);

  const overlay = new PNG({ width: expected.width, height: expected.height });
  const diff = new PNG({ width: expected.width, height: expected.height });
  let differentPixels = 0;
  let totalDifference = 0;

  for (let index = 0; index < expected.data.length; index += 4) {
    let pixelDifference = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(expected.data[index + channel] - received.data[index + channel]);
      overlay.data[index + channel] = Math.round(
        (expected.data[index + channel] + received.data[index + channel]) / 2,
      );
      diff.data[index + channel] = delta;
      pixelDifference += delta;
      totalDifference += delta;
    }
    overlay.data[index + 3] = 255;
    diff.data[index + 3] = 255;
    if (pixelDifference > 12) differentPixels += 1;
  }

  await Promise.all([
    fs.writeFile(path.join(outputDir, `${state}.reference.crop.png`), PNG.sync.write(expected)),
    fs.writeFile(path.join(outputDir, `${state}.actual.crop.png`), PNG.sync.write(received)),
    fs.writeFile(path.join(outputDir, `${state}.overlay.png`), PNG.sync.write(overlay)),
    fs.writeFile(path.join(outputDir, `${state}.diff.png`), PNG.sync.write(diff)),
  ]);

  const structural = calculateStructuralMetrics(expected, received);
  for (const anchor of manifest.paintAnchors[state]) {
    assert.deepEqual(readRgb(expected, anchor.x, anchor.y), anchor.rgb, `${state} reference paint anchor`);
    assert.deepEqual(readRgb(received, anchor.x, anchor.y), anchor.rgb, `${state} actual paint anchor`);
  }

  return {
    width: expected.width,
    height: expected.height,
    differentPixels,
    differentPixelRatio: differentPixels / (expected.width * expected.height),
    meanAbsoluteChannelDifference: totalDifference / (expected.width * expected.height * 3),
    ...structural,
  };
}

function cropImage(source, crop) {
  assert.ok(crop.x >= 0 && crop.y >= 0, 'crop origin must be inside the source image');
  assert.ok(crop.x + crop.width <= source.width, 'crop width must fit the source image');
  assert.ok(crop.y + crop.height <= source.height, 'crop height must fit the source image');
  const target = new PNG({ width: crop.width, height: crop.height });
  PNG.bitblt(source, target, crop.x, crop.y, crop.width, crop.height, 0, 0);
  return target;
}

function readRgb(image, x, y) {
  assert.ok(x >= 0 && x < image.width && y >= 0 && y < image.height, 'paint anchor inside crop');
  const index = (y * image.width + x) * 4;
  return [...image.data.subarray(index, index + 3)];
}

function calculateStructuralMetrics(reference, actual) {
  const width = reference.width;
  const height = reference.height;
  const referenceEdges = createEdgeMap(reference);
  const actualEdges = createEdgeMap(actual);
  let referenceEdgeCount = 0;
  let actualEdgeCount = 0;
  let referenceUnmatchedEdges = 0;
  let actualUnmatchedEdges = 0;
  let flatPaintPixels = 0;
  let flatPaintMismatchPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (referenceEdges[pixel]) {
        referenceEdgeCount += 1;
        if (!hasNearbyEdge(actualEdges, width, height, x, y)) referenceUnmatchedEdges += 1;
      }
      if (actualEdges[pixel]) {
        actualEdgeCount += 1;
        if (!hasNearbyEdge(referenceEdges, width, height, x, y)) actualUnmatchedEdges += 1;
      }
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) continue;
      const referenceIndex = pixel * 4;
      let flat = true;
      for (let offsetY = -1; offsetY <= 1 && flat; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighbor = ((y + offsetY) * width + x + offsetX) * 4;
          if (
            reference.data[referenceIndex] !== reference.data[neighbor]
            || reference.data[referenceIndex + 1] !== reference.data[neighbor + 1]
            || reference.data[referenceIndex + 2] !== reference.data[neighbor + 2]
          ) {
            flat = false;
            break;
          }
        }
      }
      if (!flat) continue;
      flatPaintPixels += 1;
      let delta = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        delta += Math.abs(reference.data[referenceIndex + channel] - actual.data[referenceIndex + channel]);
      }
      if (delta > 12) flatPaintMismatchPixels += 1;
    }
  }

  return {
    referenceEdgeCount,
    actualEdgeCount,
    referenceUnmatchedEdges,
    actualUnmatchedEdges,
    edgeMismatchRatio: Math.max(
      referenceUnmatchedEdges / referenceEdgeCount,
      actualUnmatchedEdges / actualEdgeCount,
    ),
    flatPaintPixels,
    flatPaintMismatchPixels,
    flatPaintMismatchRatio: flatPaintMismatchPixels / flatPaintPixels,
  };
}

function createEdgeMap(image) {
  const { width, height } = image;
  const luminance = new Float32Array(width * height);
  const edges = new Uint8Array(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    luminance[pixel] = (
      0.2126 * image.data[index]
      + 0.7152 * image.data[index + 1]
      + 0.0722 * image.data[index + 2]
    );
  }
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      const gradient = (
        Math.abs(luminance[pixel + 1] - luminance[pixel - 1])
        + Math.abs(luminance[pixel + width] - luminance[pixel - width])
      );
      if (gradient >= 48) edges[pixel] = 1;
    }
  }
  return edges;
}

function hasNearbyEdge(edges, width, height, x, y) {
  for (let nearbyY = Math.max(0, y - 2); nearbyY <= Math.min(height - 1, y + 2); nearbyY += 1) {
    for (let nearbyX = Math.max(0, x - 2); nearbyX <= Math.min(width - 1, x + 2); nearbyX += 1) {
      if (edges[nearbyY * width + nearbyX]) return true;
    }
  }
  return false;
}

const measurements = Object.fromEntries(
  await Promise.all(
    states.map(async (state) => [
      state,
      JSON.parse(await fs.readFile(path.join(outputDir, `${state}.measurements.json`), 'utf8')),
    ]),
  ),
);
for (const [state, measurement] of Object.entries(measurements)) {
  assert.deepEqual(
    { width: measurement.viewport.width, height: measurement.viewport.height },
    { width: 1440, height: 1372 },
    `${state} viewport`,
  );
  assert.deepEqual(
    { scrollX: measurement.viewport.scrollX, scrollY: measurement.viewport.scrollY },
    { scrollX: 0, scrollY: 0 },
    `${state} scroll origin`,
  );
  assertRect(measurement.panel, { x: 936, y: 24, width: 480, height: 600 }, `${state} panel`);
  assertStyles(measurement.overlay, {
    backgroundColor: 'rgba(22, 21, 25, 0.25)',
    padding: '24px',
  }, `${state} overlay`);
  assertStyles(measurement.panel, {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: '16px',
    fontFamily: '"Mabry Pro", sans-serif',
    padding: '32px',
  }, `${state} panel`);
  assertStyles(measurement.title, {
    color: 'rgb(106, 55, 195)',
    fontFamily: '"Mabry Pro", sans-serif',
    fontSize: '24px',
    lineHeight: '24px',
  }, `${state} title`);
}

assertRect(measurements.default.fields[0], { x: 968, y: 146, width: 416, height: 48 }, 'ENT field');
assertRect(measurements.default.fields[1], { x: 968, y: 244, width: 416, height: 48 }, 'edition field');
assertRect(measurements.default.fields[2], { x: 968, y: 342, width: 416, height: 48 }, 'grade field');
assertRect(measurements.default.fields[3], { x: 968, y: 440, width: 416, height: 48 }, 'chapter field');
assertRect(measurements.default.buttons.reset, { x: 968, y: 544, width: 204, height: 48 }, 'reset button');
assertRect(measurements.default.buttons.apply, { x: 1180, y: 544, width: 204, height: 48 }, 'apply button');
assert.equal(measurements.default.panel.borderRadius, '16px');
assert.equal(measurements.default.panel.padding, '32px');
assert.equal(measurements.default.overlay.backgroundColor, 'rgba(22, 21, 25, 0.25)');

for (const field of measurements.default.fields) {
  assertStyles(field, {
    backgroundColor: 'rgb(255, 255, 255)',
    borderColor: 'rgb(165, 133, 219)',
    borderRadius: '8px',
    fontFamily: '"Mabry Pro", sans-serif',
    fontSize: '16px',
    lineHeight: '24px',
    padding: '8px 16px',
  }, `default ${field.id} field`);
}

assertRect(measurements['edition-menu'].menu, { x: 968, y: 300, width: 416, height: 176 }, 'edition menu');
assertRect(measurements['grade-menu'].menu, { x: 968, y: 96, width: 416, height: 238 }, 'grade menu');
assertRect(measurements['chapter-menu'].menu, { x: 968, y: 96, width: 416, height: 336 }, 'chapter menu');

const expectedMenuOptions = {
  'edition-menu': [
    { x: 976, y: 308, width: 400, height: 48 },
    { x: 976, y: 364, width: 400, height: 48 },
    { x: 976, y: 420, width: 400, height: 48 },
  ],
  'grade-menu': [
    { x: 976, y: 104, width: 400, height: 48 },
    { x: 976, y: 160, width: 400, height: 48 },
    { x: 976, y: 216, width: 400, height: 48 },
    { x: 976, y: 272, width: 400, height: 48 },
    { x: 976, y: 328, width: 400, height: 48 },
  ],
  'chapter-menu': [
    { x: 976, y: 104, width: 400, height: 48 },
    { x: 976, y: 160, width: 400, height: 56 },
    { x: 976, y: 224, width: 400, height: 56 },
    { x: 976, y: 288, width: 400, height: 48 },
    { x: 976, y: 344, width: 400, height: 48 },
    { x: 976, y: 400, width: 400, height: 56 },
  ],
};

for (const [state, expectedOptions] of Object.entries(expectedMenuOptions)) {
  const menu = measurements[state].menu;
  assert.equal(menu.options.length, expectedOptions.length, `${state} option count`);
  for (const [index, expected] of expectedOptions.entries()) {
    assertRect(menu.options[index], expected, `${state} option ${index + 1}`);
  }
  const finalOption = menu.options.at(-1);
  if (state === 'edition-menu') {
    assert.ok(finalOption.bottom <= menu.bottom, `${state} options must fit inside the menu`);
  } else {
    assert.ok(finalOption.bottom > menu.bottom, `${state} final option must be clipped by the menu`);
  }
}

for (const state of ['edition-menu', 'grade-menu', 'chapter-menu']) {
  const menu = measurements[state].menu;
  assertStyles(menu, {
    backgroundColor: 'rgb(248, 245, 252)',
    borderRadius: '16px',
    gap: '8px',
    overflowX: 'hidden',
    overflowY: 'auto',
    padding: '8px',
  }, `${state} menu`);
  assert.equal(menu.clientHeight, menu.height, `${state} menu viewport height`);
  assert.equal(menu.initialScrollTop, 0, `${state} initial scroll position`);
  assert.equal(menu.scrollbarWidth, 0, `${state} scrollbar must remain visually hidden`);
  if (state === 'edition-menu') {
    assert.equal(menu.maxScrollTop, 0, 'edition menu options fit without scrolling');
  } else {
    assert.ok(menu.scrollHeight > menu.clientHeight, `${state} content must overflow vertically`);
    assert.ok(menu.maxScrollTop > 0, `${state} last option must be reachable by scrolling`);
  }
  for (const [index, option] of menu.options.entries()) {
    assertStyles(option, {
      backgroundColor: 'rgb(248, 245, 252)',
      borderColor: 'rgb(165, 133, 219)',
      borderRadius: '8px',
      color: 'rgb(68, 35, 125)',
      fontFamily: '"Mabry Pro", sans-serif',
      fontSize: '16px',
      gap: '16px',
      lineHeight: '16px',
      padding: '11px 16px',
    }, `${state} option ${index + 1}`);
  }
}

const comparisons = Object.fromEntries(
  await Promise.all(states.map(async (state) => [state, await createVisualArtifacts(state)])),
);
const summary = {
  source: {
    manifest: manifestFilename,
    schemaVersion: manifest.schemaVersion,
    fileKey: manifest.fileKey,
    nodes: Object.fromEntries(
      Object.entries(manifest.references).map(([state, reference]) => [state, reference.nodeId]),
    ),
    comparisonRegion: panelCrop,
    referenceSha256: Object.fromEntries(
      Object.entries(manifest.references).map(([state, reference]) => [state, reference.sha256]),
    ),
  },
  comparisons,
  geometry: {
    viewport: { width: 1440, height: 1372 },
    expectedDevicePixelRatio: 1,
    observedDevicePixelRatio: measurements.default.viewport.dpr,
    devicePixelRatioExact: measurements.default.viewport.dpr === 1,
  },
  note: 'Unchecked states are Figma references. Checked pixels use the existing project selection style and are not Figma-verified.',
};

await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

for (const [state, measurement] of Object.entries(measurements)) {
  assert.equal(measurement.viewport.dpr, 1, `${state} device pixel ratio must be exactly 1`);
}
for (const [state, comparison] of Object.entries(comparisons)) {
  const calibration = manifest.rendererCalibration.states[state];
  assert.ok(
    comparison.meanAbsoluteChannelDifference <= calibration.maxMeanAbsoluteChannelDifference,
    `${state} full-panel paint difference exceeds calibrated Figma/Chromium variance`,
  );
  assert.ok(
    comparison.edgeMismatchRatio <= calibration.maxEdgeMismatchRatio,
    `${state} painted edges are not registered with the Figma reference`,
  );
  assert.ok(
    comparison.flatPaintMismatchRatio <= calibration.maxFlatPaintMismatchRatio,
    `${state} flat paint regions exceed calibrated Figma/Chromium variance`,
  );
}
