import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const loginSource = readFileSync(path.resolve(import.meta.dirname, 'Login.tsx'), 'utf8');
assert.match(loginSource, /function getLoginValidationErrors\([\s\S]*?email: string,[\s\S]*?password: string,[\s\S]*?t:/);
assert.match(loginSource, /const loginCanSubmit = Object\.keys\(loginValidationErrors\)\.length === 0/);
assert.match(loginSource, /<AuthSubmit[\s\S]*disabled=\{!loginCanSubmit\}/);
assert.match(loginSource, /const nextErrors = getLoginValidationErrors\(email, password, t\)/);
assert.doesNotMatch(loginSource, /const credentialsComplete/);
assert.doesNotMatch(loginSource, /mobileProgress=/);
assert.doesNotMatch(loginSource, /mobileHeaderMode="status-aware"/);
assert.doesNotMatch(loginSource, /mobileHeaderMode=/);
assert.match(loginSource, /desktopLayout="centered-card"/);
assert.doesNotMatch(loginSource, /desktopFlowStep=\{3\}/);
assert.match(loginSource, /<AuthSubmit[\s\S]*loading=\{loading\}[\s\S]*mobileVisual="figma-auth"[\s\S]*desktopVisual="onboarding">/);
assert.match(loginSource, /<Link to="\/onboarding"/);
