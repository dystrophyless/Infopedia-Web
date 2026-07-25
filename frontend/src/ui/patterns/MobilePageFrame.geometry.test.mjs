import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const patternsDir = import.meta.dirname;
const frontendRoot = path.resolve(patternsDir, '..', '..', '..');
const frame = readFileSync(path.resolve(patternsDir, 'MobilePageFrame.tsx'), 'utf8');
const appBar = readFileSync(path.resolve(frontendRoot, 'src/ui/molecules/MobileAppBar.tsx'), 'utf8');
const tokens = readFileSync(path.resolve(frontendRoot, 'src/styles/tokens.css'), 'utf8');

assert.match(tokens, /--mobile-page-app-bar-offset:\s*80px;/, 'Mobile app-bar offset token must be 80px');
assert.match(frame, /MobilePageFrameAppBarConfig/, 'Frame must expose a structured app-bar configuration');
assert.match(frame, /pt-\[var\(--mobile-page-app-bar-offset\)\] md:hidden/, 'Canonical rail must use the semantic offset token');
assert.match(frame, /safeArea=\{false\} sticky=\{false\}/, 'Frame-owned app bar must disable standalone insets and stickiness');
assert.match(frame, /Omit<MobileAppBarProps, 'safeArea' \| 'sticky' \| 'className' \| 'size'>/, 'Frame config must not expose molecule size overrides');
assert.match(frame, /size="compact" safeArea=\{false\} sticky=\{false\}/, 'Frame must force the compact 24px app-bar row');
assert.match(frame, /showCanonicalAppBar && 'pt-8 md:pt-0'/, 'Canonical mobile content must add 32px and reset at desktop');
assert.match(frame, /\{legacyAppBar\}[\s\S]*<main/, 'Legacy app-bar nodes must remain before main during migration');
assert.doesNotMatch(frame, /pt-\[80px\]|env\(safe-area-inset-top\)/, 'Pattern must not duplicate local 80px or safe-area geometry');
assert.match(
  frame,
  /min-h-\[var\(--mobile-page-available-height,100dvh\)\]/,
  'Document frames should consume the authenticated mobile available-height variable with a dvh fallback',
);
assert.match(
  frame,
  /h-\[var\(--mobile-page-available-height,100dvh\)\] min-h-\[var\(--mobile-page-available-height,100dvh\)\] overflow-y-hidden/,
  'Content-scrolling frames should use the available-height variable for both height and minimum height',
);
assert.doesNotMatch(frame, /\bmin-h-dvh\b|\bh-dvh\b/, 'Frame should not own a raw dvh height that bypasses the shell variable');
assert.match(appBar, /size = 'standard'/, 'MobileAppBar must default to the standalone standard size');
assert.match(appBar, /grid min-h-14 h-14/, 'Standard MobileAppBar working height must remain exactly 56px');
assert.match(appBar, /grid h-6 min-h-6 grid-cols-\[24px_minmax\(0,1fr\)_24px\][^']*overflow-visible/, 'Compact MobileAppBar must own the exact 24px visual row');
assert.match(appBar, /size === 'compact' && 'flex h-6 items-center'/, 'Compact title must center within the 24px row');
assert.match(appBar, /relative size-6 overflow-visible/, 'Compact action slots must remain 24px in layout and allow the touch target to escape');
assert.match(appBar, /absolute left-1\/2 top-1\/2 flex size-11 -translate-x-1\/2 -translate-y-1\/2/, 'Compact action targets must be centered at 44px without affecting row flow');
assert.match(appBar, /\[&>\*\]:min-h-11 \[&>\*\]:min-w-11/, 'Compact consumer actions must retain a 44px minimum target');
assert.match(appBar, /safeArea && 'box-content'/, 'Standalone safe-area inset must sit above the 56px working row');

assert.equal(80 + 24 + 32, 136, 'Canonical first content child must start at y=136');

const config = loadConfig(path.join(frontendRoot, 'tailwind.config.ts'));
const classes = [
  'pt-[var(--mobile-page-app-bar-offset)]',
  'max-md:[--mobile-page-available-height:calc(100dvh-var(--shell-mobile-bottom-nav-height))]',
  'md:hidden',
  'pt-8',
  'md:pt-0',
  'h-14',
  'min-h-14',
  'h-6',
  'min-h-6',
  'size-6',
  'size-11',
  'overflow-visible',
  'grid-cols-[24px_minmax(0,1fr)_24px]',
  'box-content',
];
const result = await postcss([
  tailwindcss({
    ...config,
    content: [{ raw: `<div class="${classes.join(' ')}"></div>`, extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });

function findRule(className) {
  const selector = `.${className
    .replaceAll(':', '\\:')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replaceAll(',', '\\,')
    .replaceAll('/', '\\/')}`;
  let matchingRule;
  result.root.walkRules((rule) => {
    if (rule.selector === selector) matchingRule = rule;
  });
  assert.ok(matchingRule, `Tailwind did not generate ${selector}`);
  return matchingRule;
}

function assertDeclaration(className, property, expectedValue) {
  const rule = findRule(className);
  const declaration = rule.nodes.find(
    (node) => node.type === 'decl' && node.prop === property && node.value === expectedValue,
  );
  assert.ok(declaration, `${className} must emit ${property}: ${expectedValue}; received ${rule.toString()}`);
}

assertDeclaration('pt-[var(--mobile-page-app-bar-offset)]', 'padding-top', 'var(--mobile-page-app-bar-offset)');
let mobileAvailableHeightRule;
result.root.walkRules((rule) => {
  if (rule.nodes.some((node) => node.type === 'decl' && node.prop === '--mobile-page-available-height')) {
    mobileAvailableHeightRule = rule;
  }
});
assert.ok(mobileAvailableHeightRule, 'Tailwind must compile the mobile available-height custom property');
assert.equal(
  mobileAvailableHeightRule.nodes.find((node) => node.type === 'decl' && node.prop === '--mobile-page-available-height')?.value,
  'calc(100dvh - var(--shell-mobile-bottom-nav-height))',
  'Mobile available-height custom property should subtract the semantic bottom-nav token',
);
assert.match(
  mobileAvailableHeightRule.parent?.params ?? '',
  /max-width|min-width/,
  'Mobile available-height custom property must be scoped to the max-md breakpoint',
);
assertDeclaration('pt-8', 'padding-top', '2rem');
assertDeclaration('h-14', 'height', '3.5rem');
assertDeclaration('min-h-14', 'min-height', '3.5rem');
assertDeclaration('h-6', 'height', '1.5rem');
assertDeclaration('min-h-6', 'min-height', '1.5rem');
assertDeclaration('size-6', 'height', '1.5rem');
assertDeclaration('size-6', 'width', '1.5rem');
assertDeclaration('size-11', 'height', '2.75rem');
assertDeclaration('size-11', 'width', '2.75rem');
assertDeclaration('overflow-visible', 'overflow', 'visible');
assertDeclaration('box-content', 'box-sizing', 'content-box');

let compactGridRule;
result.root.walkRules((rule) => {
  if (rule.nodes.some((node) => node.type === 'decl' && node.prop === 'grid-template-columns' && node.value === '24px minmax(0,1fr) 24px')) {
    compactGridRule = rule;
  }
});
assert.ok(compactGridRule, 'Tailwind must compile the compact 24px / 1fr / 24px grid');

const responsive = [];
result.root.walkAtRules('media', (rule) => {
  if (rule.params.includes('min-width')) responsive.push(rule.toString());
});
assert.ok(responsive.some((rule) => rule.includes('.md\\:hidden')), 'Desktop must hide the mobile rail');
assert.ok(responsive.some((rule) => rule.includes('.md\\:pt-0')), 'Desktop must remove the mobile content gap');
