import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const componentsDir = import.meta.dirname;
const rootEntrySource = readFileSync(path.resolve(componentsDir, 'RootEntry.tsx'), 'utf8');
const appSource = readFileSync(path.resolve(componentsDir, '../App.tsx'), 'utf8');

assert.match(rootEntrySource, /useAuthStore\(\(state\) => state\.isAuthenticated\)/, 'Root entry should inspect authentication state');
assert.match(rootEntrySource, /const MOBILE_QUERY = '\(max-width: 767px\)'/, 'Root entry should use the mobile breakpoint');
assert.match(rootEntrySource, /useState\(false\)/, 'Root entry should start with a desktop-safe SSR value');
assert.match(rootEntrySource, /useEffect\(\(\) => \{[\s\S]*window\.matchMedia\(MOBILE_QUERY\)/, 'Root entry should subscribe to the media query after mount');
assert.match(rootEntrySource, /mediaQuery\.addEventListener\('change', handleChange\)/, 'Root entry should react to viewport changes');
assert.match(rootEntrySource, /mediaQuery\.removeEventListener\('change', handleChange\)/, 'Root entry should clean up the viewport listener');
assert.match(rootEntrySource, /isAuthenticated && isMobile[\s\S]*<Navigate to="\/search" replace \/>/, 'Authenticated mobile root should replace-navigate to search');
assert.match(rootEntrySource, /return <Landing \/>/, 'Root entry should preserve Landing for guests and desktop');
assert.match(appSource, /<Public>[\s\S]*<RootEntry \/>[\s\S]*<\/Public>/, 'App root should render RootEntry inside Public');
assert.match(appSource, /path="\/search"[\s\S]*<Protected>[\s\S]*<TermSearch \/>/, 'Search should remain a protected route');
