import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentDir = import.meta.dirname;
const indexSource = readFileSync(path.resolve(componentDir, '../../index.html'), 'utf8');
const indexCssSource = readFileSync(path.resolve(componentDir, '../index.css'), 'utf8');
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
  'Mobile authenticated shell should provide the Figma bottom navigation component',
);

assert.ok(
  existsSync(splashPath),
  'Mobile route transitions should provide a dedicated MobileRouteSplash component',
);

const bottomNavSource = readFileSync(bottomNavPath, 'utf8');

assert.match(
  bottomNavSource,
  /const activeItemClass = 'text-\[#6a37c3\]';/,
  'Mobile bottom navigation should use the Figma active violet',
);
const splashSource = readFileSync(splashPath, 'utf8');
const bottomNavCssBlock = indexCssSource.match(/\.bottom-nav\s*\{[^}]*\}/)?.[0] ?? '';

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
  /max-md:pb-\[88px\]/,
  'Layout should reserve exactly the Figma 88px bottom-navigation height on mobile',
);

assert.match(
  indexSource,
  /<meta\s+name="viewport"\s+content="[^"]*\bviewport-fit=cover\b[^"]*"/,
  'Document viewport should allow the mobile bottom nav to cover the iOS safe-area edge',
);

assert.match(
  indexCssSource,
  /html,\s*body,\s*#root\s*\{[\s\S]*margin:\s*0;[\s\S]*padding:\s*0;[\s\S]*min-height:\s*100%;[\s\S]*width:\s*100%;[\s\S]*\}/,
  'Global document shell should remove browser spacing around the mobile viewport',
);

assert.match(
  indexCssSource,
  /\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*box-sizing:\s*border-box;[\s\S]*\}/,
  'Global CSS should explicitly use border-box sizing for shell and nav layout',
);

assert.match(
  navbarSource,
  /<header[^>]+max-md:hidden/,
  'Desktop top navbar should be hidden completely on mobile',
);

assert.match(
  bottomNavSource,
  /data-figma-node="14:1564"/,
  'Mobile bottom navigation should carry the implemented Figma node id',
);

assert.match(
  bottomNavSource,
  /className="bottom-nav[^"]*md:hidden"/,
  'Mobile bottom navigation should use the global bottom-nav shell class',
);

assert.match(
  bottomNavCssBlock,
  /\.bottom-nav\s*\{[\s\S]*position:\s*fixed;[\s\S]*left:\s*0;[\s\S]*right:\s*0;[\s\S]*bottom:\s*0;[\s\S]*width:\s*100%;[\s\S]*height:\s*88px;[\s\S]*background:\s*#f8f5fc;[\s\S]*\}/,
  'Mobile bottom navigation shell should pin to the viewport edge at the Figma 88px height',
);

assert.doesNotMatch(
  bottomNavCssBlock,
  /safe-area-inset/,
  'Figma canvas already includes the safe zone, so the mobile nav shell must not add one dynamically',
);

assert.doesNotMatch(
  bottomNavCssBlock,
  /(?:^|\n)\s*bottom:\s*env\(safe-area-inset-bottom/,
  'Mobile bottom navigation should never use safe-area as its bottom offset',
);

assert.match(
  bottomNavSource,
  /bottom-nav-inner[^"]*max-w-\[430px\][^"]*grid-cols-4[^"]*px-\[7px\][^"]*pt-3/,
  'Mobile bottom navigation should preserve the 430px frame, four columns, 7px side inset, and 12px top inset',
);

for (const iconName of [
  'Search01Icon',
  'CheckmarkSquare02Icon',
  'ChartAnalysisIcon',
  'UserIcon',
]) {
  assert.match(
    bottomNavSource,
    new RegExp(iconName),
    `Mobile bottom navigation should use the Figma ${iconName} glyph`,
  );
}

for (const labelKey of ['nav.search', 'nav.tests', 'nav.analyze', 'profile.navProfile']) {
  assert.match(
    bottomNavSource,
    new RegExp(labelKey.replace('.', '\\.')),
    `Mobile bottom navigation should include ${labelKey}`,
  );
}

for (const route of ["'/tests'", "'/analyze'", "'/profile'"]) {
  assert.match(
    bottomNavSource,
    new RegExp(route),
    `Mobile bottom navigation should link to ${route}`,
  );
}

assert.match(
  bottomNavSource,
  /setSearchModalOpen\(true\)/,
  'Mobile search nav item should open the search-choice sheet',
);

assert.match(
  bottomNavSource,
  /text-\[10px\][^"]*leading-\[10px\][^"]*text-\[#524d5b\]/,
  'Mobile bottom navigation labels should match the Figma 10px muted text treatment',
);

assert.match(
  bottomNavSource,
  /activeItemClass\s*=\s*'text-\[#6a37c3\]'/,
  'Mobile bottom navigation should accent the active tab icon and label with the updated Figma purple text color',
);

assert.doesNotMatch(
  bottomNavSource,
  /activeItemClass\s*=\s*'[^']*bg-\[#6a37c3\]/,
  'Mobile bottom navigation active state should not add a purple background fill',
);

assert.match(
  bottomNavSource,
  /getItemClass\(searchIsActive\)/,
  'Mobile bottom navigation should apply the active visual state to the search tab route group',
);

assert.match(
  bottomNavSource,
  /const testsIsActive = location\.pathname\.startsWith\('\/tests'\);/,
  'Mobile bottom navigation should keep the tests tab active for nested test-question routes',
);

assert.match(
  bottomNavSource,
  /getItemClass\(testsIsActive\)/,
  'Mobile bottom navigation should apply the active visual state to the tests route group',
);

for (const [routeName, routePattern] of [
  ['analyze', "location.pathname === '/analyze'"],
  ['profile', "location.pathname === '/profile'"],
]) {
  assert.match(
    bottomNavSource,
    new RegExp(`getItemClass\\(${routePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`),
    `Mobile bottom navigation should apply the active visual state to the ${routeName} route`,
  );
}

assert.doesNotMatch(
  bottomNavSource,
  /Home01Icon|ChartColumnIcon|Profile02Icon|border-t|shadow|backdrop-blur|bg-surface/,
  'Mobile bottom navigation should not keep the old home-based or chrome-heavy styling',
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
