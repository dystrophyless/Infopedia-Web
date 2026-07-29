import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const landing = readFileSync(path.resolve(import.meta.dirname, 'Landing.tsx'), 'utf8');
assert.match(landing, /const ONBOARDING_TARGET = '\/onboarding';/);
assert.doesNotMatch(landing, /components\/(Hero|StatsBar|FeatureCard)/);
assert.doesNotMatch(landing, /id="books"/);
assert.match(landing, /<MobileFeatureCarousel isAuthenticated=\{isAuthenticated\}/);
assert.match(landing, /function landingCtaTarget\(path: string, isAuthenticated: boolean\)/);
assert.match(landing, /return isAuthenticated \? path : ONBOARDING_TARGET;/);
assert.match(landing, /function DesktopGuestHero[\s\S]*landingCtaTarget\('\/search', isAuthenticated\)/);
