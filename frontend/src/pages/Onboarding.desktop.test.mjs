import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(import.meta.dirname, 'Onboarding.tsx'), 'utf8');
assert.match(source, /type OnboardingStep = 'grade' \| 'username';/);
assert.match(source, /AuthShell title=\{step === 'grade'/);
assert.match(source, /<form onSubmit=\{handleGradeSubmit\}/);
assert.match(source, /<form onSubmit=\{handleUsernameSubmit\}/);
assert.match(source, /max-md:hidden/);
