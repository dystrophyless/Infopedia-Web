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

assert.match(
  profileSource,
  /const WEAK_TOPICS_PANEL_SECTION_CLASS = 'px-8 py-12 max-md:px-5';/,
  'Weak topics loading and loaded states should share the same panel section spacing',
);

assert.match(
  profileSource,
  /const WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS = 'grid gap-4 lg:h-\[320px\] lg:grid-cols-\[240px_minmax\(0,1fr\)\]';/,
  'Weak topics loading and loaded states should share the same master-detail grid',
);

assert.match(
  profileSource,
  /className=\{WEAK_TOPICS_PANEL_SECTION_CLASS\}[\s\S]*<WeakTopicsMasterDetail/,
  'Loaded weak topics state should use the shared panel section spacing',
);

assert.match(
  profileSource,
  /className=\{WEAK_TOPICS_PANEL_SECTION_CLASS\}[\s\S]*<span className="sr-only"/,
  'Loading weak topics state should use the shared panel section spacing',
);

assert.match(
  profileSource,
  /className=\{`\$\{WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS\} animate-pulse`\}/,
  'Loading weak topics state should reuse the loaded master-detail grid before adding animation',
);

assert.match(
  profileSource,
  /className=\{WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS\}[\s\S]*<WeakTopicList/,
  'Loaded weak topics state should use the shared master-detail grid',
);

assert.match(
  profileSource,
  /mt-4 border-t border-border\/30 pt-3[\s\S]*mt-4 grid grid-cols-3 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1[\s\S]*Array\.from\(\{ length: 3 \}\)/,
  'Loading book skeleton should match the loaded responsive three-book grid',
);

assert.match(
  profileSource,
  /min-h-\[96px\] w-full min-w-0[\s\S]*px-3 py-3/,
  'Loading book skeleton should match the taller loaded book card dimensions',
);

assert.match(
  profileSource,
  /<span className="mt-3 min-w-0">[\s\S]*<span className="flex items-center justify-between gap-3">/,
  'Loading book skeleton should place the coverage placeholder at the same lower position as loaded cards',
);
