import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const uiDir = import.meta.dirname;
const srcDir = path.resolve(uiDir, '..');
const frontendDir = path.resolve(srcDir, '..');
const atomsDir = path.join(uiDir, 'atoms');
const moleculesDir = path.join(uiDir, 'molecules');
const patternsDir = path.join(uiDir, 'patterns');
const tokensSource = readFileSync(path.join(srcDir, 'styles', 'tokens.css'), 'utf8');
const packageJson = JSON.parse(readFileSync(path.join(frontendDir, 'package.json'), 'utf8'));
const authShellSource = readFileSync(path.join(srcDir, 'components', 'AuthShell.tsx'), 'utf8');
const onboardingSource = readFileSync(path.join(srcDir, 'pages', 'Onboarding.tsx'), 'utf8');

const forbiddenLibraryImportPatterns = [
  /from ['"].*\/(?:api|stores|pages|features|components)(?:\/|['"])/,
  /from ['"]react-router-dom['"]/,
  /from ['"]react-i18next['"]/,
  /from ['"]i18next['"]/,
];

const rawColorPattern = /#[0-9a-fA-F]{3,8}\b/;

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

function getComponentFiles(componentDir) {
  return collectFiles(
    componentDir,
    (filePath) => filePath.endsWith('.tsx') && !filePath.endsWith('.stories.tsx'),
  );
}

function assertComponentLibraryContract(layerName, componentDir) {
  const indexSource = readSource(path.join(componentDir, 'index.ts'));
  const componentFiles = getComponentFiles(componentDir);

  assert.ok(componentFiles.length > 0, `${layerName} should contain at least one component`);

  for (const componentFile of componentFiles) {
    const componentName = path.basename(componentFile, '.tsx');
    const source = readSource(componentFile);
    const storyFile = componentFile.replace(/\.tsx$/, '.stories.tsx');

    assert.match(
      indexSource,
      new RegExp(`export \\* from './${componentName}';`),
      `${path.relative(frontendDir, componentFile)} should be exported from ${layerName}/index.ts`,
    );
    assert.match(
      source,
      new RegExp(`export (const|function) ${componentName}\\b`),
      `${componentName} should be exported`,
    );
    assert.ok(
      existsSync(storyFile),
      `${path.relative(frontendDir, componentFile)} should have a colocated Storybook story`,
    );
  }
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
  '--type-body-line-height',
  '--type-helper-size',
  '--type-helper-line-height',
]) {
  assert.match(tokensSource, new RegExp(`${tokenName}:`), `tokens.css should define ${tokenName}`);
}

for (const tokenName of [
  '--type-screen-title-line-height',
  '--type-section-title-line-height',
  '--type-card-title-line-height',
  '--type-body-line-height',
  '--type-helper-line-height',
  '--type-caption-line-height',
]) {
  assert.match(
    tokensSource,
    new RegExp(`${tokenName}:\\s*1;`),
    `${tokenName} should enforce exact typography line-height`,
  );
}

const uiIndexSource = readSource(path.join(uiDir, 'index.ts'));
assert.match(uiIndexSource, /export \* from '\.\/atoms';/, 'src/ui should re-export atoms');
assert.match(uiIndexSource, /export \* from '\.\/molecules';/, 'src/ui should re-export molecules');
assert.match(uiIndexSource, /export \* from '\.\/patterns';/, 'src/ui should re-export patterns');
assert.match(
  onboardingSource,
  /from '\.\.\/ui'/,
  'Onboarding proof slice should consume primitives from src/ui',
);
assert.match(
  authShellSource,
  /from '\.\.\/ui'/,
  'Auth controls should consume design-system molecules from src/ui',
);

assertComponentLibraryContract('atoms', atomsDir);
assertComponentLibraryContract('molecules', moleculesDir);
assertComponentLibraryContract('patterns', patternsDir);

const implementationFiles = collectFiles(
  uiDir,
  (filePath) =>
    /\.(ts|tsx)$/.test(filePath) &&
    !filePath.endsWith('.stories.tsx') &&
    !filePath.endsWith('.test.ts') &&
    !filePath.endsWith('.test.tsx'),
);

for (const filePath of implementationFiles) {
  const source = readFileSync(filePath, 'utf8');
  assert.doesNotMatch(
    source,
    rawColorPattern,
    `${path.relative(frontendDir, filePath)} should not contain raw design colors`,
  );
  assert.doesNotMatch(
    source,
    /!important\b/,
    `${path.relative(frontendDir, filePath)} should not override the cascade with !important`,
  );
  for (const pattern of forbiddenLibraryImportPatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${path.relative(frontendDir, filePath)} should stay app-agnostic and avoid ${pattern}`,
    );
  }
}

const inputSource = readSource(path.join(atomsDir, 'Input.tsx'));
assert.doesNotMatch(
  inputSource,
  /auth-field/,
  'Input must not depend on auth-specific global CSS classes',
);

const iconButtonSource = readSource(path.join(atomsDir, 'IconButton.tsx'));
assert.match(iconButtonSource, /type AccessibleName/, 'IconButton should enforce an accessible name');
assert.match(iconButtonSource, /'aria-label': string/, 'IconButton should accept aria-label');
assert.match(iconButtonSource, /'aria-labelledby': string/, 'IconButton should accept aria-labelledby');

const formFieldSource = readSource(path.join(moleculesDir, 'FormField.tsx'));
assert.match(
  formFieldSource,
  /children: \(controlProps: FormFieldControlProps\) => ReactNode/,
  'FormField should own control/message aria wiring through its render prop',
);
assert.match(formFieldSource, /'aria-describedby'/, 'FormField should associate helper/error copy');

const choiceGroupSource = readSource(path.join(moleculesDir, 'ChoiceGroup.tsx'));
const radioOptionSource = readSource(path.join(moleculesDir, 'RadioOption.tsx'));
const checkboxOptionSource = readSource(path.join(moleculesDir, 'CheckboxOption.tsx'));
assert.match(choiceGroupSource, /<fieldset/, 'ChoiceGroup should use native fieldset semantics');
assert.match(choiceGroupSource, /<legend/, 'ChoiceGroup should expose an accessible group label');
assert.match(radioOptionSource, /type="radio"/, 'RadioOption should use a native radio input');
assert.match(checkboxOptionSource, /type="checkbox"/, 'CheckboxOption should use a native checkbox input');
assert.equal(
  existsSync(path.join(moleculesDir, 'ChoiceOption.tsx')),
  false,
  'Ambiguous ChoiceOption should stay split into radio and checkbox APIs',
);

const bottomSheetSource = readSource(path.join(moleculesDir, 'BottomSheet.tsx'));
for (const [pattern, message] of [
  [/createPortal/, 'BottomSheet should render outside clipping ancestors'],
  [/role="dialog"/, 'BottomSheet should expose dialog semantics'],
  [/aria-modal="true"/, 'BottomSheet should be modal'],
  [/event\.key === 'Escape'/, 'BottomSheet should dismiss on Escape'],
  [/event\.key !== 'Tab'/, 'BottomSheet should trap keyboard focus'],
  [/document\.body\.style\.overflow = 'hidden'/, 'BottomSheet should lock body scroll'],
  [/restoreTarget\.focus/, 'BottomSheet should restore focus'],
  [/onPointerDown=\{handleOverlayPointerDown\}/, 'BottomSheet should dismiss from the overlay'],
]) {
  assert.match(bottomSheetSource, pattern, message);
}

assert.match(
  authShellSource,
  /\{\(controlProps\) =>/,
  'AuthShell should consume FormField aria wiring rather than duplicating ids',
);
assert.match(authShellSource, /<Button/, 'AuthShell actions should consume the Button atom');
assert.doesNotMatch(authShellSource, /<input\b/, 'AuthShell inputs should consume the Input atom');
