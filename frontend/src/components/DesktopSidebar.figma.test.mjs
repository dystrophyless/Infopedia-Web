import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const componentSource = readFileSync(path.resolve(import.meta.dirname, 'DesktopSidebar.tsx'), 'utf8');
const storySource = readFileSync(path.resolve(import.meta.dirname, 'DesktopSidebar.stories.tsx'), 'utf8');
const layoutSource = readFileSync(path.resolve(import.meta.dirname, 'Layout.tsx'), 'utf8');
const visualPath = path.resolve(import.meta.dirname, 'DesktopSidebar.visual.mjs');

assert.match(componentSource, /<aside[^>]+hidden md:flex[^>]+w-\[320px\]/, 'Desktop sidebar should be a 320px desktop-only aside');
assert.match(componentSource, /sticky top-0 self-start/, 'Desktop sidebar should remain sticky in normal document flow');
assert.match(
  componentSource,
  /data-profile-disclosure[^>]+className="[^"]*relative[^"]*h-\[48px\]/,
  'Profile disclosure should keep a fixed-height relative anchor so its popup never moves the profile button',
);
assert.doesNotMatch(componentSource, /createPortal|Portal|backdrop|shadow-/, 'Disclosure should not add a portal, scrim, or shadow');
assert.match(componentSource, /w-\[320px\][^\"]*shrink-0/, 'Desktop sidebar should preserve the 320px flex reservation');
assert.match(componentSource, /border-\[#ded2f1\][^\"]*bg-white[^\"]*p-\[32px\]/, 'Sidebar should use the Figma border, white surface, and 32px padding');
assert.match(componentSource, /h-\[43\.736px\][^\"]*w-\[170\.37px\]/, 'Sidebar logo should preserve the exact Figma geometry');
assert.match(componentSource, /gap-\[8px\]/, 'Sidebar navigation should use an 8px row gap');
assert.match(componentSource, /h-\[48px\][^\"]*gap-\[16px\][^\"]*rounded-\[8px\]/, 'Sidebar rows should preserve 48px height, 16px icon gap, and 8px radius');
assert.match(componentSource, /const profileRowClass = \[[\s\S]*transition-colors[\s\S]*profileLooksActive \? 'bg-\[#f8f5fc\]' : 'hover:bg-\[#f8f5fc\]'/, 'Profile row should share nav hover transition and pale hover surface');
assert.match(componentSource, /text-\[16px\][^']*leading-\[16px\]/, 'Navigation should use Figma 16/16 regular typography');
assert.match(componentSource, /bg-\[#f8f5fc\][^']*text-\[#865bcf\]/, 'Active rows should use the Figma pale surface and violet text');
assert.match(componentSource, /text-\[16px\][^\"]*font-medium[^\"]*leading-\[16px\]/, 'Sidebar user name should use the 16/16 medium role');
assert.match(componentSource, /text-\[14px\][^\"]*font-normal[^\"]*leading-\[14px\][^\"]*text-\[#b1acb9\]/, 'Sidebar plan label should use the 14/14 muted role');
assert.match(componentSource, /aria-current=\{profileIsActive \? 'page' : undefined\}/, 'Profile button should retain truthful current-page semantics');
assert.match(componentSource, /aria-expanded=\{profileOpen\}/);
assert.match(componentSource, /aria-controls=\{PROFILE_MENU_ID\}/);
assert.match(componentSource, /profileButtonRef/);
assert.match(componentSource, /firstProfileActionRef/);
assert.match(componentSource, /event\.key === 'Escape'/);
assert.match(componentSource, /pointerdown/);
assert.match(componentSource, /focusin/);
assert.match(componentSource, /disabled[^>]+aria-disabled="true"/, 'Algosha and Help should expose native disabled state');
assert.match(componentSource, /function profileActionClass\(disabled = false\)/);
assert.match(componentSource, /rounded-\[4px\][^']*px-\[8px\][^']*py-\[6px\][^']*transition-colors/);
assert.match(componentSource, /disabled \? '[^']*cursor-not-allowed[^']*' : 'hover:bg-\[#ded2f1\]'/, 'Disabled profile actions must not paint hover');

for (const label of ['Избранное', 'Слабые темы', 'Купить подписку', 'Настройки', 'Справка', 'Выйти']) {
  assert.match(componentSource, new RegExp(label), `Disclosure should include ${label}`);
}
for (const destination of ['/favorites', '/profile?tab=weakTopics', '/subscription', '/profile?tab=settings']) {
  assert.match(componentSource, new RegExp(destination.replace(/[?]/g, '\\?')), `Disclosure should route to ${destination}`);
}
assert.match(
  componentSource,
  /absolute[^"]*bottom-\[56px\][^"]*z-20[^"]*w-\[256px\][^"]*rounded-\[16px\][^"]*bg-\[#efeaf8\][^"]*p-\[8px\]/,
  'Profile popup should overlay navigation above its anchor with a 16px radius and 8px padding',
);
assert.match(componentSource, /size-\[20px\]/);
assert.match(componentSource, /gap-\[8px\][^\"]*rounded-\[4px\][^\"]*px-\[8px\][^\"]*py-\[6px\]/);
assert.match(componentSource, /profileLooksActive = profileIsActive \|\| profileOpen/);
assert.match(componentSource, /className="flex w-full flex-col items-start"/);
assert.match(componentSource, /text-\[14px\][^']*leading-\[14px\][^']*text-\[#4c268c\]/, 'Popup actions should use exact 14/14 Figma typography');
assert.equal((componentSource.match(/data-profile-menu-divider/g) ?? []).length, 2, 'Popup should contain exactly two Figma dividers');

assert.match(layoutSource, /const logout = useAuthStore\(\(s\) => s\.logout\)/);
assert.match(layoutSource, /logout\(\);[\s\S]*navigate\('\/login'\)/);
assert.match(layoutSource, /<DesktopSidebar[\s\S]*onLogout=\{onLogout\}/);

for (const storyName of ['Home', 'Tests', 'Search', 'Analyze', 'AlgoshaAi', 'Profile', 'ProfileDefault', 'ProfileClicked', 'ProfileMenuClicked']) {
  assert.match(storySource, new RegExp(`export const ${storyName}: Story`), `Storybook should expose ${storyName}`);
}
assert.match(storySource, /ProfileClicked:[\s\S]*play:/, 'Clicked profile story should prove its interaction state');
assert.match(storySource, /userEvent\.keyboard\('\{Escape\}'\)/);
assert.match(storySource, /toHaveFocus\(\)/);
assert.equal(existsSync(visualPath), true, 'Deterministic seven-state visual runner should exist');

console.log('Desktop sidebar Figma contract passed');
