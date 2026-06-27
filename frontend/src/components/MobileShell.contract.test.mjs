import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentDir = import.meta.dirname;
const layoutSource = readFileSync(path.resolve(componentDir, 'Layout.tsx'), 'utf8');
const navbarSource = readFileSync(path.resolve(componentDir, 'Navbar.tsx'), 'utf8');
const searchChoiceSource = readFileSync(
  path.resolve(componentDir, 'SearchChoiceModal.tsx'),
  'utf8',
);

const bottomNavPath = path.resolve(componentDir, 'MobileBottomNav.tsx');
const splashPath = path.resolve(componentDir, 'MobileRouteSplash.tsx');

assert.ok(
  existsSync(bottomNavPath),
  'Mobile authenticated shell should provide a dedicated MobileBottomNav component',
);

assert.ok(
  existsSync(splashPath),
  'Mobile route transitions should provide a dedicated MobileRouteSplash component',
);

const bottomNavSource = readFileSync(bottomNavPath, 'utf8');
const splashSource = readFileSync(splashPath, 'utf8');

assert.match(
  layoutSource,
  /<MobileRouteSplash\s*\/>/,
  'Layout should render the mobile route-transition splash once at app-shell level',
);

assert.match(
  layoutSource,
  /isAuthenticated\s*&&\s*<MobileBottomNav\s*\/>/,
  'Layout should render bottom navigation only for authenticated users',
);

assert.match(
  layoutSource,
  /<main[^>]+max-md:pb-\[calc\(86px\+env\(safe-area-inset-bottom\)\)\]/,
  'Layout should reserve global mobile scroll space above the fixed bottom nav',
);

assert.match(
  navbarSource,
  /<header[^>]+max-md:hidden/,
  'Desktop top navbar should be hidden completely on mobile',
);

for (const key of ['nav.home', 'nav.search', 'nav.mobileAnalyze', 'nav.mobileProfile']) {
  assert.match(
    bottomNavSource,
    new RegExp(key.replace('.', '\\.')),
    `Mobile bottom navigation should include ${key}`,
  );
}

assert.match(
  bottomNavSource,
  /setSearchModalOpen\(true\)/,
  'Mobile search nav item should open the search-choice sheet',
);

assert.match(
  bottomNavSource,
  /className="fixed[^"]+bg-surface[^"]+border-0[^"]+shadow-none/,
  'Mobile bottom navigation should be opaque and flat, without a visible border or shadow',
);

assert.doesNotMatch(
  bottomNavSource,
  /bg-surface\/|backdrop-blur|border-t/,
  'Mobile bottom navigation should not use transparency, blur, or a top divider',
);

assert.match(
  bottomNavSource,
  /authTarget\('\/search', isAuthenticated\)/,
  'Mobile search sheet should preserve authenticated search routing',
);

assert.match(
  searchChoiceSource,
  /max-md:items-end/,
  'Search choice overlay should align the dialog to the bottom on mobile',
);

assert.match(
  searchChoiceSource,
  /max-md:rounded-t-\[22px\]/,
  'Search choice dialog should become a rounded mobile bottom sheet',
);

assert.match(
  searchChoiceSource,
  /searchChoice\.sheetHandle/,
  'Search choice bottom sheet should expose an accessible drag handle label',
);

assert.match(
  splashSource,
  /prefers-reduced-motion/,
  'Mobile route splash should respect reduced-motion preferences',
);

assert.doesNotMatch(
  splashSource,
  /useLocation\(\)/,
  'Mobile splash should not react to route changes; it should only appear on app startup',
);
