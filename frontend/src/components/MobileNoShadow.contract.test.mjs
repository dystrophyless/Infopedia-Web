import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(import.meta.dirname, '..');
const shadowClassPattern = /className=(?:"([^"]*shadow(?:-|\\\[)[^"]*)"|\{`([^`]*shadow(?:-|\\\[)[^`]*)`\})/g;

function collectTsxFiles(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectTsxFiles(fullPath);
    return fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

const failures = [];

for (const filePath of collectTsxFiles(srcDir)) {
  const source = readFileSync(filePath, 'utf8');
  for (const match of source.matchAll(shadowClassPattern)) {
    const classValue = match[1] ?? match[2] ?? '';
    if (
      classValue.includes('shadow') &&
      !/(?:^|\s)shadow-none(?:\s|$)/.test(classValue) &&
      !classValue.includes('max-md:shadow-none') &&
      !classValue.includes('max-md:[box-shadow:none]')
    ) {
      failures.push(`${path.relative(srcDir, filePath)}: ${classValue}`);
    }
  }
}

assert.deepEqual(
  failures,
  [],
  'Every decorative TSX shadow class should opt out on mobile with max-md:shadow-none',
);
