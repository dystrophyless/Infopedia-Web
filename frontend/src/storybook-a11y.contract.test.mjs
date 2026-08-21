import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(import.meta.dirname, '..');
const previewPath = path.join(frontendDir, '.storybook', 'preview.ts');
const previewSource = readFileSync(previewPath, 'utf8');

const a11yBlock = previewSource.match(/a11y\s*:\s*\{([\s\S]*?)\r?\n\s*\},\r?\n\s*backgrounds\s*:/)?.[1];
assert.ok(a11yBlock, 'preview must define the project-level a11y parameters');
assert.match(a11yBlock, /test\s*:\s*['"]error['"]/, 'project-level a11y tests must remain blocking');

const disabledRulePattern = /\{\s*id\s*:\s*['"]([^'"]+)['"]\s*,\s*enabled\s*:\s*false\s*\}/g;
const disabledRules = [...a11yBlock.matchAll(disabledRulePattern)].map(
  ([, id]) => id,
);
assert.deepEqual(
  disabledRules,
  ['color-contrast'],
  'exactly one global axe rule may be disabled, and it must be color-contrast',
);

function collectStoryFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    const stats = statSync(filePath);
    if (stats.isDirectory()) return collectStoryFiles(filePath);
    return entry.endsWith('.stories.tsx') ? [filePath] : [];
  });
}

const storyFiles = collectStoryFiles(path.join(frontendDir, 'src'));
const disabledRuleIds = [...disabledRules];
for (const storyPath of storyFiles) {
  const source = readFileSync(storyPath, 'utf8');
  const scopedDisabledRules = [...source.matchAll(disabledRulePattern)].map(
    ([, id]) => id,
  );
  disabledRuleIds.push(...scopedDisabledRules);
  assert.doesNotMatch(
    source,
    /a11y\s*:\s*\{[^}]*disable\s*:\s*true/s,
    `${path.relative(frontendDir, storyPath)} must not blanket-disable a11y tests`,
  );
}

assert.equal(
  disabledRuleIds.filter((rule) => rule !== 'color-contrast').length,
  0,
  'all axe rules other than the approved color-contrast exception must remain enabled globally and in stories',
);

console.log(`Storybook a11y contract passed (${storyFiles.length} story files checked)`);
