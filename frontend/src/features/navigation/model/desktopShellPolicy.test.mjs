import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const filename = path.resolve(import.meta.dirname, 'desktopShellPolicy.ts');
const source = readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
const { resolveDesktopShell } = await import(moduleUrl);

assert.deepEqual(resolveDesktopShell({ pathname: '/profile' }, true, true), {
  visible: true,
  activeItem: 'profile',
});
assert.deepEqual(resolveDesktopShell({ pathname: '/profile', search: '?tab=settings' }, true, true), {
  visible: true,
  activeItem: 'profile',
});
assert.deepEqual(resolveDesktopShell({ pathname: '/algosha' }, true, true), {
  visible: true,
  activeItem: null,
});
assert.deepEqual(resolveDesktopShell({ pathname: '/help' }, true, true), {
  visible: true,
  activeItem: null,
});

console.log('Desktop shell policy contract passed');
