import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const frontendRoot = path.resolve(import.meta.dirname, '..', '..');

async function importTs(relativePath) {
  const filename = path.resolve(frontendRoot, relativePath);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  return import(url);
}

const { shouldShowProfileLogout } = await importTs('src/utils/profileTabs.ts');

assert.equal(shouldShowProfileLogout('profile'), true);
assert.equal(shouldShowProfileLogout('settings'), true);
assert.equal(shouldShowProfileLogout('weakTopics'), false);
assert.equal(shouldShowProfileLogout('progress'), false);
assert.equal(shouldShowProfileLogout('favorites'), false);
