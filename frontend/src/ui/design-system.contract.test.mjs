import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const uiDir = import.meta.dirname;
const srcDir = path.resolve(uiDir, '..');
const frontendDir = path.resolve(srcDir, '..');
const atomsDir = path.join(uiDir, 'atoms');
const moleculesDir = path.join(uiDir, 'molecules');
const tokensSource = readFileSync(path.join(srcDir, 'styles', 'tokens.css'), 'utf8');
const packageJson = JSON.parse(readFileSync(path.join(frontendDir, 'package.json'), 'utf8'));
const onboardingSource = readFileSync(path.join(srcDir, 'pages', 'Onboarding.tsx'), 'utf8');

const atomNames = [
  'Button',
  'IconButton',
  'Input',
  'Chip',
  'Surface',
  'Heading',
  'Text',
  'Divider',
  'Spinner',
];

const forbiddenAtomImportPatterns = [
  /from ['"].*\/api\//,
  /from ['"].*\/stores\//,
  /from ['"]react-router-dom['"]/,
  /from ['"]react-i18next['"]/,
  /from ['"]i18next['"]/,
];

function readSource(filePath) {
  assert.ok(existsSync(filePath), `${path.relative(frontendDir, filePath)} should exist`);
  return readFileSync(filePath, 'utf8');
}

function collectFiles(dir, predicate) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectFiles(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

assert.equal(
  packageJson.scripts['test:design-system'],
  'node src/ui/design-system.contract.test.mjs',
  'frontend package should expose npm run test:design-system',
);

for (const tokenName of [
  '--radius-control',
  '--radius-surface',
  '--control-height-md',
  '--control-height-lg',
  '--space-mobile-rail',
  '--type-body-size',
  '--type-helper-size',
]) {
  assert.match(tokensSource, new RegExp(`${tokenName}:`), `tokens.css should define ${tokenName}`);
}

const uiIndexSource = readSource(path.join(uiDir, 'index.ts'));
const atomsIndexSource = readSource(path.join(atomsDir, 'index.ts'));

assert.match(uiIndexSource, /export \* from '\.\/atoms';/, 'src/ui should re-export atoms');
assert.match(
  onboardingSource,
  /from '\.\.\/ui'/,
  'Onboarding proof slice should consume primitives from src/ui',
);

for (const atomName of atomNames) {
  const filePath = path.join(atomsDir, `${atomName}.tsx`);
  const source = readSource(filePath);

  assert.match(
    atomsIndexSource,
    new RegExp(`export \\* from './${atomName}';`),
    `atoms/index.ts should export ${atomName}`,
  );
  assert.match(source, new RegExp(`export (const|function) ${atomName}\\b`), `${atomName} should be exported`);

  for (const pattern of forbiddenAtomImportPatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${atomName} should stay app-agnostic and avoid ${pattern}`,
    );
  }

  assert.doesNotMatch(
    source,
    /#[0-9a-fA-F]{3,8}\b/,
    `${atomName} should use design tokens or Tailwind theme classes instead of raw hex colors`,
  );
}

const moleculeFiles = collectFiles(moleculesDir, (filePath) => filePath.endsWith('.tsx'));
for (const filePath of moleculeFiles) {
  const source = readFileSync(filePath, 'utf8');
  assert.doesNotMatch(
    source,
    /from ['"].*\/pages\//,
    `${path.relative(frontendDir, filePath)} should not import page modules`,
  );
  assert.doesNotMatch(
    source,
    /from ['"].*\/api\//,
    `${path.relative(frontendDir, filePath)} should not import API clients`,
  );
  assert.doesNotMatch(
    source,
    /from ['"].*\/stores\//,
    `${path.relative(frontendDir, filePath)} should not import app stores`,
  );
}
