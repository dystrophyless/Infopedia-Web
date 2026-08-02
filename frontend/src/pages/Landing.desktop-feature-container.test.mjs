import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landing = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const start = landing.indexOf('function DesktopFeatureCards');
const end = landing.indexOf('function DesktopSourceProof', start);
assert.notEqual(start, -1, 'DesktopFeatureCards should be defined');
const features = landing.slice(start, end === -1 ? landing.length : end);

assert.match(
  features,
  /<div[^>]*className="mx-auto w-full max-w-\[1120px\]"[\s\S]*id="desktop-feature-rail"/,
  'Desktop feature heading, controls, and rail should share one centered 1120px wrapper',
);
assert.doesNotMatch(features, /pl-\[clamp\(|pr-\[clamp\(|calc\(50vw|w-\[1560px\]|max-w-\[1560px\]/);
assert.match(features, /className="mt-10 w-full overflow-x-auto/);
assert.match(features, /className="flex w-max snap-x snap-mandatory gap-\[32px\]/);

console.log('Landing desktop feature container contract passed');
