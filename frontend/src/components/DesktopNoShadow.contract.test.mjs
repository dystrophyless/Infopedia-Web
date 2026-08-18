import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(import.meta.dirname, '..');
const ownedRoots = ['components', 'features', 'pages', 'ui'];
const decorativeShadowPattern = /\bshadow-(?!none\b)[^\s'"`}]*/g;

function collectTsxFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectTsxFiles(fullPath);
    return fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

const failures = [];
for (const root of ownedRoots) {
  for (const filePath of collectTsxFiles(path.join(srcDir, root))) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(decorativeShadowPattern)) {
      failures.push(`${path.relative(srcDir, filePath)}: ${match[0]}`);
    }
  }
}

assert.deepEqual(
  failures,
  [],
  'Canonical desktop flows and shared UI primitives must not add decorative shadow-* classes; shadow-none and focus ring/outline classes remain allowed',
);
