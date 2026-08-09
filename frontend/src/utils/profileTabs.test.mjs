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

const {
  parseProfileTab,
  setProfileTab,
  shouldShowProfileLogout,
} = await importTs('src/utils/profileTabs.ts');

for (const [query, expected] of [
  ['', 'profile'],
  ['tab=profile', 'profile'],
  ['tab=weakTopics', 'weakTopics'],
  ['tab=settings', 'settings'],
  ['tab=unknown', 'profile'],
]) {
  assert.equal(
    parseProfileTab(new URLSearchParams(query)),
    expected,
    `Profile tab query ${query || '<absent>'} should resolve to ${expected}`,
  );
}

const unrelated = new URLSearchParams('source=sidebar&tab=weakTopics&campaign=august');
assert.equal(setProfileTab(unrelated, 'settings').toString(), 'source=sidebar&tab=settings&campaign=august');
assert.equal(unrelated.toString(), 'source=sidebar&tab=weakTopics&campaign=august', 'Codec must not mutate caller state');
assert.equal(
  setProfileTab(new URLSearchParams('source=sidebar&tab=settings'), 'profile').toString(),
  'source=sidebar',
  'Writing the default profile tab should remove only the tab parameter',
);

assert.equal(shouldShowProfileLogout('profile'), true);
assert.equal(shouldShowProfileLogout('settings'), true);
assert.equal(shouldShowProfileLogout('weakTopics'), false);
assert.equal(shouldShowProfileLogout('progress'), false);
assert.equal(shouldShowProfileLogout('favorites'), false);

console.log('Profile tab codec contract passed');
