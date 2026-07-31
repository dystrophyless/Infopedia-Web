import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const read = (relativePath) => readFileSync(path.resolve(srcDir, relativePath), 'utf8');

const frameSource = read('ui/patterns/MobilePageFrame.tsx');
const pinnedAppBarSource = read('ui/patterns/MobilePinnedAppBar.tsx');
const sharedFrameSource = `${frameSource}\n${pinnedAppBarSource}`;
const layoutSource = read('components/Layout.tsx');
const bottomNavSource = read('components/MobileBottomNav.tsx');
const tokensSource = read('styles/tokens.css');

assert.match(
  tokensSource,
  /--mobile-page-app-bar-offset:\s*80px;/,
  'Shared mobile page rail must retain the canonical 80px offset',
);
assert.match(
  tokensSource,
  /--mobile-page-content-end-spacing:\s*32px;/,
  'Shared mobile pages must expose the semantic 32px content-end spacing token',
);
assert.match(
  sharedFrameSource,
  /pt-\[var\(--mobile-page-app-bar-offset\)\] md:hidden/,
  'Shared compact chrome must remain mobile-only',
);
assert.match(sharedFrameSource, /IntersectionObserver/, 'Shared mobile rail must transition to pinned state after leaving its slot');
assert.match(sharedFrameSource, /fixed inset-x-0 top-0 z-sticky h-\[120px\] bg-surface pt-20 px-4 pb-4 border-b border-solid border-\[rgb\(213_211_217\)\] md:hidden/, 'Pinned mobile rail must reserve the status-bar-safe 120px paint box');
assert.match(
  frameSource,
  /showCanonicalAppBar && 'pt-8 md:pt-0'/,
  'Shared compact pages must retain the 32px content gap and remove it on desktop',
);
assert.match(
  frameSource,
  /min-h-\[var\(--mobile-page-available-height,100dvh\)\]/,
  'Shared frame must consume the height published by Layout on mobile',
);
assert.match(
  frameSource,
  /md:h-auto md:min-h-0/,
  'Desktop frame layout must not remain constrained by the mobile available height',
);
assert.match(
  frameSource,
  /max-md:pb-\[var\(--mobile-page-content-end-inset,0px\)\]/,
  'Shared frame content must consume the inherited mobile content-end inset',
);
assert.match(
  frameSource,
  /data-desktop-page-container[\s\S]*md:max-w-\[1200px\][\s\S]*md:px-6[\s\S]*lg:px-8/,
  'Opt-in desktop header and content must share stable responsive gutters',
);
assert.match(
  frameSource,
  /<PageHeader[\s\S]*hidden md:flex/,
  'Desktop heading chrome must reuse PageHeader and stay hidden from mobile',
);
assert.match(frameSource, /data-mobile-page-scroll-viewport[\s\S]*overflow-y-auto overscroll-contain/, 'Content mode must own scrolling on a focusable viewport containing the rail and main');
assert.doesNotMatch(
  frameSource,
  /--shell-mobile-bottom-nav-height|100dvh\s*-\s*88px/,
  'Shared frame must not own or duplicate the mobile bottom-navigation reserve',
);

assert.match(
  layoutSource,
  /max-md:\[--mobile-page-available-height:calc\(100dvh-var\(--shell-mobile-bottom-nav-height\)\)\][^']*max-md:\[--mobile-page-content-end-inset:var\(--mobile-page-content-end-spacing\)\][^']*max-md:pb-\[var\(--shell-mobile-bottom-nav-height\)\]/,
  'Layout alone must publish the visible content inset and reserve the mobile bottom-navigation height',
);
assert.match(
  layoutSource,
  /max-md:\[--mobile-page-available-height:100dvh\][^']*max-md:\[--mobile-page-content-end-inset:0px\][^']*max-md:pb-0/,
  'Layout must remove the content inset and reserve atomically when mobile navigation is hidden',
);
assert.match(bottomNavSource, /className="bottom-nav[^"]*md:hidden"/, 'Bottom navigation must remain mobile-only');

assert.equal(80 + 24 + 32, 136, 'Shared compact geometry must place first content at y=136');
