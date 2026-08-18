import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const landingSource = readFileSync(path.resolve(import.meta.dirname, 'Landing.tsx'), 'utf8');

assert.doesNotMatch(
  landingSource,
  /MobileAppHome|mobileWorkspace|mobileTerms|mobileQuickActions|Terms of the Day|Quick Actions/,
  'Landing should not retain the removed authenticated mobile workspace home',
);
