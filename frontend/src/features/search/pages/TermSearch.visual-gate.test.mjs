import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

const runner = path.resolve(import.meta.dirname, 'TermSearch.filters.visual-artifacts.mjs');
const sourceArtifacts = path.resolve(import.meta.dirname, '../../../../test-results/search-filters-task5');
const states = ['default', 'edition-menu', 'grade-menu', 'chapter-menu'];
const storySource = await fs.readFile(path.resolve(import.meta.dirname, 'TermSearchPage.stories.tsx'), 'utf8');
const pageSource = await fs.readFile(path.resolve(import.meta.dirname, 'TermSearchPage.tsx'), 'utf8');
const runnerSource = await fs.readFile(runner, 'utf8');
assert.doesNotMatch(
  storySource,
  /apiClient\.get\s*=/,
  'Task-5 stories must not mutate the shared apiClient singleton; use the scoped request provider',
);
assert.match(
  storySource,
  /SearchRequestClientProvider/,
  'Task-5 stories must provide a scoped request client',
);
assert.doesNotMatch(
  runnerSource,
  /mobileMeasurements|mobile-\$\{width\}\.measurements/,
  'desktop Task-5 visual gate must not consume stale mobile measurement artifacts',
);

for (const storyName of [
  'DesktopFiltersDefault',
  'DesktopFiltersEditionMenu',
  'DesktopFiltersGradeMenu',
  'DesktopFiltersChapterMenu',
]) {
  const start = storySource.indexOf(`export const ${storyName}:`);
  assert.notEqual(start, -1, `${storyName} must remain available to the focused Storybook gate`);
  const next = storySource.indexOf('\nexport const ', start + 1);
  const storyBlock = storySource.slice(start, next === -1 ? storySource.length : next);
  assert.doesNotMatch(storyBlock, /tags:\s*\['!test'\]/, `${storyName} must not opt out of Storybook tests`);
  assert.doesNotMatch(storyBlock, /a11y:\s*\{\s*disable:\s*true/, `${storyName} must keep a11y enabled`);
}
const a11yIncludeMatch = storySource.match(
  /const desktopFiltersA11yParameters[\s\S]*?context:\s*\{\s*include:\s*\[([\s\S]*?)\]\s*\}/,
);
assert.ok(a11yIncludeMatch, 'Task-5 stories must declare a scoped accessibility include list');
for (const selector of ['[aria-controls="search-filter-page-sheet"]', '[role="dialog"]']) {
  assert.match(
    a11yIncludeMatch[1],
    new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Task-5 accessibility scope must include ${selector}`,
  );
}
assert.match(
  pageSource,
  /aria-label=\{filterIsIconOnly \? filter\.label : undefined\}/,
  'desktop result filter trigger must expose its visible filter label on the button branch',
);
assert.match(
  pageSource,
  /aria-controls=\{desktop && filterIsIconOnly \? 'search-filter-page-sheet' : undefined\}/,
  'desktop result filter trigger must reference the filter dialog',
);

async function createFixture() {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), 'term-search-visual-gate-'));
  await fs.cp(sourceArtifacts, target, { recursive: true });
  for (const state of states) {
    await fs.copyFile(
      path.join(target, `${state}.reference.png`),
      path.join(target, `${state}.actual.png`),
    );
    const measurementPath = path.join(target, `${state}.measurements.json`);
    const measurement = JSON.parse(await fs.readFile(measurementPath, 'utf8'));
    measurement.viewport.dpr = 1;
    if (measurement.menu) {
      measurement.menu.overflow = 'hidden auto';
      measurement.menu.overflowX = 'hidden';
      measurement.menu.overflowY = 'auto';
      measurement.menu.clientHeight = measurement.menu.height;
      measurement.menu.scrollHeight = measurement.menu.options.at(-1).bottom
        - measurement.menu.y
        + 8;
      measurement.menu.initialScrollTop = 0;
      measurement.menu.maxScrollTop = Math.max(
        0,
        measurement.menu.scrollHeight - measurement.menu.clientHeight,
      );
      measurement.menu.scrollbarWidth = 0;
    }
    await fs.writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  }
  return target;
}

function runGate(outputDir) {
  return spawnSync(process.execPath, [runner], {
    cwd: path.resolve(import.meta.dirname, '../../../..'),
    env: { ...process.env, OUTPUT_DIR: outputDir },
    encoding: 'utf8',
  });
}

const liveResult = runGate(sourceArtifacts);
assert.equal(
  liveResult.status,
  0,
  `verified Figma-versus-Chromium artifacts must pass the structural visual gate:\n${liveResult.stderr}`,
);

const provenanceFixture = await createFixture();
try {
  const result = runGate(provenanceFixture);
  assert.equal(result.status, 0, `baseline visual gate fixture must pass:\n${result.stderr}`);
  const summary = JSON.parse(await fs.readFile(path.join(provenanceFixture, 'summary.json'), 'utf8'));
  assert.deepEqual(summary.source, {
    manifest: 'TermSearch.filters.figma-references.json',
    schemaVersion: 1,
    fileKey: 'aa8qReawBBhHIXDAbS18OP',
    nodes: {
      default: '689:2793',
      'edition-menu': '841:1358',
      'grade-menu': '841:3608',
      'chapter-menu': '845:3814',
    },
    comparisonRegion: { x: 936, y: 24, width: 480, height: 600 },
    referenceSha256: {
      default: 'fc280d8bfd238f28ec3dc305a29ac5d4a2742351c13c821294517097eea33cb6',
      'edition-menu': 'add5b9e2c3a28accc8e30d301cad40696e779073371bacc733a39299d765e602',
      'grade-menu': '307991d1507b5981ecbcd4fb6e960d4e7e15a48d87dbbe8a7dcef841319026fd',
      'chapter-menu': '9a4807e26f6253b57350c3c45f24bbf668b798534a0dd7951b9724fc175c7009',
    },
  });
} finally {
  await fs.rm(provenanceFixture, { recursive: true, force: true });
}

const manifestFixture = await createFixture();
try {
  for (const suffix of ['reference.png', 'actual.png']) {
    const imagePath = path.join(manifestFixture, `default.${suffix}`);
    const image = PNG.sync.read(await fs.readFile(imagePath));
    image.data[0] = image.data[0] === 255 ? 254 : image.data[0] + 1;
    await fs.writeFile(imagePath, PNG.sync.write(image));
  }
  const result = runGate(manifestFixture);
  assert.notEqual(result.status, 0, 'visual gate must reject a reference whose manifest hash changed');
} finally {
  await fs.rm(manifestFixture, { recursive: true, force: true });
}

const dprFixture = await createFixture();
try {
  const measurementPath = path.join(dprFixture, 'default.measurements.json');
  const measurement = JSON.parse(await fs.readFile(measurementPath, 'utf8'));
  measurement.viewport.dpr = 1.25;
  await fs.writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  const result = runGate(dprFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when the captured DPR is not exactly 1');
} finally {
  await fs.rm(dprFixture, { recursive: true, force: true });
}

const computedStyleFixture = await createFixture();
try {
  const measurementPath = path.join(computedStyleFixture, 'edition-menu.measurements.json');
  const measurement = JSON.parse(await fs.readFile(measurementPath, 'utf8'));
  measurement.menu.backgroundColor = 'rgb(0, 0, 0)';
  await fs.writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  const result = runGate(computedStyleFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when a captured computed style differs');
} finally {
  await fs.rm(computedStyleFixture, { recursive: true, force: true });
}

const menuGeometryFixture = await createFixture();
try {
  const measurementPath = path.join(menuGeometryFixture, 'chapter-menu.measurements.json');
  const measurement = JSON.parse(await fs.readFile(measurementPath, 'utf8'));
  measurement.menu.options[0].height = 49;
  await fs.writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  const result = runGate(menuGeometryFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when menu option geometry or clipping differs');
} finally {
  await fs.rm(menuGeometryFixture, { recursive: true, force: true });
}

const menuClippingFixture = await createFixture();
try {
  const measurementPath = path.join(menuClippingFixture, 'grade-menu.measurements.json');
  const measurement = JSON.parse(await fs.readFile(measurementPath, 'utf8'));
  measurement.menu.overflow = 'visible';
  measurement.menu.overflowY = 'visible';
  await fs.writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  const result = runGate(menuClippingFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when menu clipping is disabled');
} finally {
  await fs.rm(menuClippingFixture, { recursive: true, force: true });
}

const pixelFixture = await createFixture();
try {
  const actualPath = path.join(pixelFixture, 'default.actual.png');
  const image = PNG.sync.read(await fs.readFile(actualPath));
  for (let y = 530; y < 546; y += 1) {
    for (let x = 260; x < 276; x += 1) {
      const panelPixel = (((24 + y) * image.width) + 936 + x) * 4;
      image.data[panelPixel] = 0;
      image.data[panelPixel + 1] = 0;
      image.data[panelPixel + 2] = 0;
    }
  }
  await fs.writeFile(actualPath, PNG.sync.write(image));
  const result = runGate(pixelFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when a source-backed paint region differs');
} finally {
  await fs.rm(pixelFixture, { recursive: true, force: true });
}

const edgeFixture = await createFixture();
try {
  const actualPath = path.join(edgeFixture, 'default.actual.png');
  const image = PNG.sync.read(await fs.readFile(actualPath));
  for (let y = 28; y < 62; y += 1) {
    for (let x = 420; x < 454; x += 1) {
      const pixel = (((24 + y) * image.width) + 936 + x) * 4;
      image.data[pixel] = 255;
      image.data[pixel + 1] = 255;
      image.data[pixel + 2] = 255;
    }
  }
  await fs.writeFile(actualPath, PNG.sync.write(image));
  const result = runGate(edgeFixture);
  assert.notEqual(result.status, 0, 'visual gate must fail when a source-backed painted edge disappears');
} finally {
  await fs.rm(edgeFixture, { recursive: true, force: true });
}

const panelBackgroundFixture = await createFixture();
try {
  const actualPath = path.join(panelBackgroundFixture, 'default.actual.png');
  const image = PNG.sync.read(await fs.readFile(actualPath));
  for (let y = 580; y < 600; y += 1) {
    for (let x = 230; x < 250; x += 1) {
      const panelBackgroundPixel = (((24 + y) * image.width) + 936 + x) * 4;
      image.data[panelBackgroundPixel] = 224;
      image.data[panelBackgroundPixel + 1] = 224;
      image.data[panelBackgroundPixel + 2] = 224;
    }
  }
  await fs.writeFile(actualPath, PNG.sync.write(image));
  const result = runGate(panelBackgroundFixture);
  assert.notEqual(result.status, 0, 'visual gate must not mask background paint inside the Figma panel crop');
} finally {
  await fs.rm(panelBackgroundFixture, { recursive: true, force: true });
}

const backgroundFixture = await createFixture();
try {
  const actualPath = path.join(backgroundFixture, 'default.actual.png');
  const image = PNG.sync.read(await fs.readFile(actualPath));
  image.data[0] = image.data[0] === 255 ? 254 : image.data[0] + 1;
  await fs.writeFile(actualPath, PNG.sync.write(image));
  const result = runGate(backgroundFixture);
  assert.equal(
    result.status,
    0,
    `pixels outside the source-backed panel crop must not affect the gate:\n${result.stderr}`,
  );
} finally {
  await fs.rm(backgroundFixture, { recursive: true, force: true });
}

console.log('TermSearch visual gate behavior contract passed');
