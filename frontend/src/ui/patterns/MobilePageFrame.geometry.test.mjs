import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';

const patternsDir = import.meta.dirname;
const frontendRoot = path.resolve(patternsDir, '..', '..', '..');
const frame = readFileSync(path.resolve(patternsDir, 'MobilePageFrame.tsx'), 'utf8');
const pinnedAppBar = readFileSync(path.resolve(patternsDir, 'MobilePinnedAppBar.tsx'), 'utf8');
const geometrySource = `${frame}\n${pinnedAppBar}`;
const appBar = readFileSync(path.resolve(frontendRoot, 'src/ui/molecules/MobileAppBar.tsx'), 'utf8');
const pageHeader = readFileSync(path.resolve(patternsDir, 'PageHeader.tsx'), 'utf8');
const tokens = readFileSync(path.resolve(frontendRoot, 'src/styles/tokens.css'), 'utf8');

assert.match(tokens, /--mobile-page-app-bar-offset:\s*80px;/, 'Mobile app-bar offset token must be 80px');
assert.match(tokens, /--mobile-page-content-end-spacing:\s*32px;/, 'Mobile content-end spacing token must be 32px');
assert.match(frame, /MobilePageFrameAppBarConfig/, 'Frame must expose a structured app-bar configuration');
assert.match(
  frame,
  /desktopHeader\?: true \| MobilePageFrameDesktopHeaderConfig/,
  'Desktop header rendering must be an explicit opt-in on the shared header configuration',
);
assert.match(frame, /import \{ PageHeader, type PageHeaderProps \} from '\.\/PageHeader'/, 'Frame must reuse PageHeader on desktop');
assert.match(
  frame,
  /<PageHeader[\s\S]*title=\{canonicalAppBarProps\.title\}[\s\S]*description/,
  'Desktop PageHeader must reuse the canonical title and accept desktop supporting content',
);
assert.match(
  frame,
  /data-desktop-page-container[\s\S]*md:max-w-\[1200px\][\s\S]*md:px-6[\s\S]*lg:px-8/,
  'Opt-in desktop header and content must share one responsive container',
);
assert.match(frame, /hidden md:flex/, 'Desktop PageHeader must not duplicate the compact mobile rail');
assert.match(
  frame,
  /\[&_button\]:min-h-11 \[&_button\]:min-w-11 \[&_a\]:inline-flex \[&_a\]:min-h-11 \[&_a\]:min-w-11/,
  'Opt-in desktop header actions must preserve 44px minimum pointer targets',
);
assert.match(geometrySource, /pt-\[var\(--mobile-page-app-bar-offset\)\] md:hidden/, 'Canonical rail must use the semantic offset token');
assert.doesNotMatch(frame, /sticky top-0 z-sticky shrink-0/, 'Initial mobile rail must not be always sticky');
assert.match(geometrySource, /tone="transparent"/, 'Initial mobile app bar must remain transparent');
assert.match(geometrySource, /fixed inset-x-0 top-0 z-sticky h-\[120px\] bg-surface pt-20 px-4 pb-4 border-b border-solid border-\[rgb\(213_211_217\)\] md:hidden/, 'Pinned mobile app bar must reserve the 120px status-bar-safe paint box');
assert.match(geometrySource, /IntersectionObserver/, 'Mobile app-bar pinning must be driven by intersection state');
assert.equal((geometrySource.match(/<MobileAppBar\b/g) ?? []).length, 1, 'Pinning must move one app-bar DOM node rather than clone it');
assert.match(geometrySource, /boundingClientRect\.bottom <= rootTop/, 'Pinning must wait until the original row is fully above the viewport');
assert.match(geometrySource, /threshold: \[0, 1\]/, 'Observer must handle enter and leave transitions');
assert.match(geometrySource, /min-h-\[calc\(var\(--mobile-page-app-bar-offset\)\+1\.5rem\)\]/, 'Rail slot must preserve the 24px flow row while pinned');
assert.match(frame, /data-mobile-page-scroll-viewport/, 'Content mode must expose the actual scroll viewport');
assert.match(frame, /tabIndex=\{scrollMode === 'content' \? 0 : undefined\}/, 'Only the content scroll viewport must be focusable');
assert.match(frame, /aria-label=\{scrollMode === 'content' \? contentLabel \?\? 'Scrollable content' : undefined\}/, 'Content viewport must always have an accessible name');
assert.match(geometrySource, /safeArea=\{false\} sticky=\{false\}/, 'Frame-owned app bar must disable standalone insets and stickiness');
assert.match(frame, /Omit<MobileAppBarProps, 'safeArea' \| 'sticky' \| 'className' \| 'size'>/, 'Frame config must not expose molecule size overrides');
assert.match(geometrySource, /size="compact" safeArea=\{false\} sticky=\{false\}/, 'Frame must force the compact 24px app-bar row');
assert.match(frame, /showCanonicalAppBar && 'pt-8 md:pt-0'/, 'Canonical mobile content must add 32px and reset at desktop');
assert.match(frame, /contentEndInset\?: boolean/, 'Frame must expose a backwards-compatible content-end inset switch for structural sandwich regions');
assert.match(frame, /contentEndInset = true/, 'Existing frame consumers must retain content-end spacing by default');
assert.match(
  frame,
  /contentEndInset && 'max-md:pb-\[var\(--mobile-page-content-end-inset,0px\)\]'/,
  'Frame inner main must consume the shell-published content-end inset only on mobile',
);
assert.match(frame, /\{legacyAppBar\}[\s\S]*<main/, 'Legacy app-bar nodes must remain before main during migration');
assert.doesNotMatch(frame, /pt-\[80px\]|env\(safe-area-inset-top\)/, 'Pattern must not duplicate local 80px or safe-area geometry');
assert.match(
  frame,
  /min-h-\[var\(--mobile-page-available-height,100dvh\)\]/,
  'Document frames should consume the authenticated mobile available-height variable with a dvh fallback',
);
assert.match(
  frame,
  /h-\[var\(--mobile-page-available-height,100dvh\)\] min-h-\[var\(--mobile-page-available-height,100dvh\)\] md:h-auto md:min-h-0/,
  'Content-scrolling frames should use the available-height variable without owning the scroll viewport',
);
assert.doesNotMatch(frame, /\bmin-h-dvh\b|\bh-dvh\b/, 'Frame should not own a raw dvh height that bypasses the shell variable');
assert.doesNotMatch(
  frame,
  /--shell-mobile-bottom-nav-height|100dvh\s*-\s*88px/,
  'Frame must consume shell height without owning another bottom-navigation subtraction',
);
assert.match(pageHeader, /actions && <div className="flex w-full flex-wrap items-center gap-3">/, 'Desktop actions must wrap without overflow');
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
  'h-[120px]',
  'min-h-14',
  'h-6',
  'min-h-6',
  'size-6',
  'size-11',
  'overflow-visible',
  'fixed',
  'inset-x-0',
  'top-0',
  'h-14',
  'z-sticky',
  'bg-surface',
  'pt-20',
  'px-4',
  'pb-4',
  'border-b',
  'border-solid',
  'border-[rgb(213_211_217)]',
  'min-h-[calc(var(--mobile-page-app-bar-offset)+1.5rem)]',
  'max-md:pb-[var(--mobile-page-content-end-inset,0px)]',
  'grid-cols-[24px_minmax(0,1fr)_24px]',
  'box-content',
  'md:h-auto',
  'md:min-h-0',
  'md:overflow-y-visible',
  'md:flex',
  'md:max-w-[1200px]',
  'md:px-6',
  'lg:px-8',
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
let mobileContentEndRule;
result.root.walkRules((rule) => {
  if (rule.nodes.some((node) => node.type === 'decl' && node.prop === 'padding-bottom' && node.value === 'var(--mobile-page-content-end-inset,0px)')) {
    mobileContentEndRule = rule;
  }
});
assert.ok(mobileContentEndRule, 'Tailwind must compile the mobile content-end padding utility');
assert.match(
  mobileContentEndRule.parent?.params ?? '',
  /max-width|not all and \(min-width:/,
  'Mobile content-end padding must remain scoped below the desktop breakpoint',
);
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
assertDeclaration('fixed', 'position', 'fixed');
assertDeclaration('inset-x-0', 'left', '0px');
assertDeclaration('inset-x-0', 'right', '0px');
assertDeclaration('top-0', 'top', '0px');
assertDeclaration('bg-surface', 'background-color', 'rgb(var(--color-surface-rgb) / var(--tw-bg-opacity, 1))');
assertDeclaration('pt-20', 'padding-top', '5rem');
assertDeclaration('px-4', 'padding-left', '1rem');
assertDeclaration('px-4', 'padding-right', '1rem');
assertDeclaration('pb-4', 'padding-bottom', '1rem');
assertDeclaration('border-b', 'border-bottom-width', '1px');
assertDeclaration('border-solid', 'border-style', 'solid');
assert.ok(
  [...result.root.nodes].some(
    (node) => node.type === 'rule' && node.nodes.some(
      (declaration) => declaration.type === 'decl' && declaration.prop === 'border-color' && declaration.value === 'rgb(213 211 217 / var(--tw-border-opacity, 1))',
    ),
  ),
  'Pinned separator must emit the exact #D5D3D9 border color',
);
assert.ok(
  [...result.root.nodes].some(
    (node) => node.type === 'rule' && node.nodes.some(
      (declaration) => declaration.type === 'decl' && declaration.prop === 'min-height' && declaration.value === 'calc(var(--mobile-page-app-bar-offset) + 1.5rem)',
    ),
  ),
  'Rail slot min-height must preserve the canonical 80px + 24px flow row',
);
assertDeclaration('box-content', 'box-sizing', 'content-box');
assertDeclaration('md:h-auto', 'height', 'auto');
assertDeclaration('md:min-h-0', 'min-height', '0px');
assertDeclaration('md:overflow-y-visible', 'overflow-y', 'visible');
assertDeclaration('md:max-w-[1200px]', 'max-width', '1200px');
assertDeclaration('md:px-6', 'padding-left', '1.5rem');
assertDeclaration('md:px-6', 'padding-right', '1.5rem');
assertDeclaration('lg:px-8', 'padding-left', '2rem');
assertDeclaration('lg:px-8', 'padding-right', '2rem');

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
assert.ok(responsive.some((rule) => rule.includes('.md\\:h-auto')), 'Desktop must stop using the mobile available height');
assert.ok(responsive.some((rule) => rule.includes('.md\\:flex')), 'Desktop must activate the shared header/content container');
