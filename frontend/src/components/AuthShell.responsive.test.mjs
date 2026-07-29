import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'AuthShell.tsx'), 'utf8');
assert.match(source, /max-lg:bg-\[#efebf6\]/);
assert.match(source, /max-lg:pt-\[65px\]/);
assert.match(source, /max-lg:max-w-\[366px\]/);
assert.match(source, /max-lg:h-12[\s\S]*max-lg:rounded-\[8px\]/);
assert.doesNotMatch(source, /shadow-feature/);
