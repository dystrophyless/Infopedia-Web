import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(import.meta.dirname, '..');
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
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

assert.match(
  indexCssSource,
  /@media \(max-width: 767px\)[\s\S]*\[class\*='shadow-'\][\s\S]*box-shadow: none !important/,
  'Mobile CSS should globally flatten decorative Tailwind shadows',
);

assert.match(
  indexCssSource,
  /@media \(max-width: 767px\)[\s\S]*\[class\*='border'\][\s\S]*border-color: transparent !important/,
  'Mobile CSS should globally hide decorative border outlines',
);
