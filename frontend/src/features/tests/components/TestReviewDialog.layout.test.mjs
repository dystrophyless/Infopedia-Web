import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'TestReviewDialog.tsx'), 'utf8');

assert.doesNotMatch(source, /!items-start|!pt-\[499px\]|h-\[515px\]/, 'review dialog must not use fixed top anchoring or fixed height');
assert.match(source, /max-h-\[calc\(100vh-32px\)\]/, 'review dialog should stay within a 16px viewport edge');
assert.match(source, /min-h-0[^\"]*overflow-y-auto/, 'review dialog body should scroll internally while the header remains visible');
assert.match(source, /overflow-x-hidden[^\"]*overflow-y-auto/, 'review dialog body should not expose horizontal overflow');
assert.match(source, /className="[^\"]*size-11[^\"]*"/, 'review dialog close control should expose a 44px hit area');
assert.match(source, /className="[^\"]*break-words[^\"]*text-\[20px\]/, 'long prompts should wrap inside the dialog header');
assert.match(source, /className="[^\"]*break-words[^\"]*text-\[16px\]/, 'long explanations should wrap inside the dialog body');

console.log('TestReviewDialog layout contract passed');
