import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const profileSource = readFileSync(
  path.resolve(import.meta.dirname, 'Profile.tsx'),
  'utf8',
);

assert.match(
  profileSource,
  /if \(loading\) {\s*return <WeakTopicsLoadingState \/>;\s*}/s,
  'WeakTopicsPanel loading branch should use its own weak topics loading state',
);

assert.match(
  profileSource,
  /function WeakTopicsLoadingState\(\)/,
  'Profile.tsx should define a dedicated weak topics loading component',
);

assert.match(
  profileSource,
  /aria-hidden="true"[\s\S]*animate-pulse/,
  'Weak topics loading state should be decorative and animated',
);
