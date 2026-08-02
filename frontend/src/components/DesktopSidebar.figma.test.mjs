import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const componentSource = readFileSync(path.resolve(import.meta.dirname, 'DesktopSidebar.tsx'), 'utf8');
const storySource = readFileSync(path.resolve(import.meta.dirname, 'DesktopSidebar.stories.tsx'), 'utf8');

assert.match(componentSource, /<aside[^>]+hidden md:flex[^>]+w-\[320px\]/, 'Desktop sidebar should be a 320px desktop-only aside');
assert.match(componentSource, /sticky top-0 self-start/, 'Desktop sidebar should remain sticky in normal document flow');
assert.doesNotMatch(componentSource, /(?:^|[ -])(fixed|absolute)(?:[ -]|\")/, 'Desktop sidebar should not leave normal flex flow with fixed or absolute positioning');
assert.match(componentSource, /w-\[320px\][^\"]*shrink-0/, 'Desktop sidebar should preserve the 320px flex reservation');
assert.match(componentSource, /border-\[#ded2f1\][^\"]*bg-white[^\"]*p-8/, 'Sidebar should use the Figma border, white surface, and 32px padding');
assert.match(componentSource, /h-\[44px\][^\"]*w-\[170px\]/, 'Sidebar logo should preserve the 170x44 Figma geometry');
assert.match(componentSource, /gap-\[8px\]/, 'Sidebar navigation should use an 8px row gap');
assert.match(componentSource, /h-\[48px\][^\"]*gap-\[16px\][^\"]*rounded-\[8px\]/, 'Sidebar rows should preserve 48px height, 16px icon gap, and 8px radius');
assert.match(componentSource, /bg-\[#6a37c3\]/, 'Sidebar active state should use the Figma violet');
assert.match(componentSource, /text-\[#6e6779\]/, 'Sidebar inactive state should use the Figma muted text');
assert.match(componentSource, /font-medium[^\"]*text-\[20px\][^\"]*leading-\[20px\]/, 'Sidebar user name should use the 20/20 medium role');
assert.match(componentSource, /text-\[#b1acb9\][^\"]*text-\[16px\][^\"]*leading-\[16px\]/, 'Sidebar plan label should use the 16/16 muted role');
assert.match(componentSource, /aria-current=\{isActive \? 'page' : undefined\}/, 'Sidebar links should expose the active page to assistive technology');
assert.match(componentSource, /disabled[^>]+aria-disabled="true"/, 'Algosha AI should be explicitly disabled because no route exists yet');
assert.match(componentSource, /to="\/profile"/, 'Sidebar user row should navigate to the profile flow');
assert.match(storySource, /MemoryRouter/, 'Sidebar stories should render links in a router harness');
assert.match(storySource, /ScrollableLayoutFlow/, 'Sidebar stories should cover sticky behavior in a scrollable layout');
