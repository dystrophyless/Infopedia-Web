import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentDir = import.meta.dirname;
const indexSource = readFileSync(path.resolve(componentDir, '../../index.html'), 'utf8');
const indexCssSource = readFileSync(path.resolve(componentDir, '../index.css'), 'utf8');
const layoutSource = readFileSync(path.resolve(componentDir, 'Layout.tsx'), 'utf8');
const navbarSource = readFileSync(path.resolve(componentDir, 'Navbar.tsx'), 'utf8');
const searchChoiceSource = readFileSync(
  path.resolve(componentDir, '../features/search/components/SearchChoiceModal.tsx'),
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
  /MobileShellProvider/,
  'Layout should mount the feature-level mobile shell provider',
);

assert.match(
  layoutSource,
  /useMobileBottomNavDecision/,
  'Layout should consume the shared mobile shell decision',
);

assert.match(
  layoutSource,
  /decision\.visible\s*&&\s*<MobileBottomNav\s+activeItem=\{decision\.activeItem\}\s*\/>/,
  'Layout should render navigation from the shared decision and active item',
);

assert.match(
  layoutSource,
  /max-md:\[--mobile-page-available-height:100dvh\]/,
  'Hidden shell should expose the full mobile viewport',
);

assert.match(
  layoutSource,
  /min-h-dvh flex flex-col bg-bg md:min-h-screen/,
  'Layout should use the dynamic mobile viewport and desktop screen-height roots',
);

assert.match(
  layoutSource,
  /<DesktopSidebar[\s\S]*activeItem=\{desktopShell\.activeItem\}/,
  'Authenticated desktop shell should render the Figma sidebar with route activity',
);
assert.match(
  layoutSource,
  /useAuthStore\.persist\.hasHydrated\(\)/,
  'Desktop shell should gate navigation on persisted auth hydration',
);

assert.match(
  layoutSource,
  /className=\{`flex-1 w-full max-md:min-h-0 max-md:min-w-0/,
  'Layout main should allow mobile flex children to shrink without horizontal overflow',
);

assert.match(
  layoutSource,
  /max-md:\[--mobile-page-available-height:calc\(100dvh-var\(--shell-mobile-bottom-nav-height\)\)\]/,
  'Visible shell should expose the available-height variable and semantic bottom-nav reserve',
);

assert.match(
  layoutSource,
  /decision\.visible\s*\?\s*'[^']*max-md:pb-\[var\(--shell-mobile-bottom-nav-height\)\]'\s*:\s*'[^']*max-md:pb-0'/,
  'One decision should switch the mobile bottom-nav reserve atomically',
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

for (const route of ['"/tests"', '"/analyze"', '"/profile"']) {
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
  /text-\[10px\][^"]*leading-none[^"]*text-\[#524d5b\]/,
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


for (const [routeName, routePattern] of [
  ['analyze', 'analyzeIsActive'],
  ['profile', 'profileIsActive'],
]) {
  assert.match(
    bottomNavSource,
    new RegExp(`getItemClass\\(${routePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`),
    `Mobile bottom navigation should apply the active visual state to the ${routeName} route`,
  );
}

assert.match(
  bottomNavSource,
  /const analyzeIsActive = activeItem === 'analyze';/,
  'Analyze active state should come from the shared active item',
);

assert.match(
  bottomNavSource,
  /const profileIsActive = activeItem === 'profile';/,
  'Profile active state should come from the shared active item',
);

for (const flag of ['analyzeIsActive', 'profileIsActive']) {
  assert.match(bottomNavSource, new RegExp(`getItemClass\\(${flag}\\)`));
  assert.match(
    bottomNavSource,
    new RegExp(`aria-current=\\{${flag} \\? 'page' : undefined\\}`),
  );
}
assert.match(bottomNavSource, /aria-current=\{profileIsActive \? 'page' : undefined\}/);

assert.doesNotMatch(
  bottomNavSource,
  /Home01Icon|ChartColumnIcon|Profile02Icon|border-t|shadow|backdrop-blur|bg-surface/,
  'Mobile bottom navigation should not keep the old home-based or chrome-heavy styling',
);

assert.match(
  searchChoiceSource,
  /overlayClassName="bg-\[#12091f\]\/65 backdrop-blur-\[2px\] max-md:items-end max-md:p-0 max-md:backdrop-blur-none"/,
  'Search choice overlay should align the dialog to the bottom on mobile',
);

assert.match(
  searchChoiceSource,
  /max-md:rounded-t-\[22px\]/,
  'Search choice dialog should become a rounded mobile bottom sheet',
);

assert.match(
  searchChoiceSource,
  /<span\s+aria-hidden="true"\s+className="mx-auto mt-3 hidden h-1\.5 w-\[72px\] rounded-full bg-border\/25 max-md:block"\s+\/>/,
  'Search choice bottom sheet should expose its non-interactive drag handle as decoration',
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
