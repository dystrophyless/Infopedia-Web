import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const navbarSource = readFileSync(path.resolve(import.meta.dirname, 'Navbar.tsx'), 'utf8');
const languageSource = readFileSync(path.resolve(import.meta.dirname, 'LanguageSwitcher.tsx'), 'utf8');
const figmaLogoPath = path.resolve(import.meta.dirname, '../assets/figma-landing/guest-header-logo.svg');
const layoutSource = readFileSync(path.resolve(import.meta.dirname, 'Layout.tsx'), 'utf8');
const landingSource = readFileSync(path.resolve(import.meta.dirname, '../pages/Landing.tsx'), 'utf8');
const indexCssSource = readFileSync(path.resolve(import.meta.dirname, '../index.css'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../locales/kk/translation.json'), 'utf8'));

assert.match(
  navbarSource,
  /href="#tools"[\s\S]*nav\.features[\s\S]*href="#featured-terms"[\s\S]*nav\.termBase[\s\S]*href="#desktop-analysis"[\s\S]*nav\.analyze/,
  'Landing guest navbar should expose the three Figma actions in order',
);
assert.match(
  navbarSource,
  /<header[^>]*?className="(?=[^"]*h-\[64px\])(?=[^"]*py-\[15px\])(?=[^"]*bg-white)/,
  'Landing guest navbar should use the compact Figma 64px full-width frame with 15px vertical inset',
);
assert.match(
  navbarSource,
  /<div[^>]*data-desktop-content-rail[^>]*className="mx-auto flex h-\[34px\] w-full max-w-\[1152px\] items-center justify-between px-\[24px\]">/,
  'Landing guest navbar should use the centered 1152px/24px content rail',
);
assert.match(navbarSource, /nav-item[^']*inline-flex[^']*items-center[^']*justify-center/, 'Marketing anchors should use flex item geometry from the Figma header');
assert.match(navbarSource, /nav-item[^']*px-\[12px\][^']*py-\[8px\][^']*text-\[14px\][^']*font-normal[^']*leading-none/, 'Marketing anchors should use the compact Figma 12px horizontal and 8px vertical item padding with regular 14px text');
assert.match(navbarSource, /<div className="flex h-\[32px\] w-\[732px\][^"]*">/, 'Logo and tabs should share the Figma 732px left cluster');
assert.match(navbarSource, /import guestHeaderLogoAsset from '\.\.\/assets\/figma-landing\/guest-header-logo\.svg';/, 'Guest header should import the dedicated exact Figma logo asset');
assert.match(navbarSource, /<img src=\{guestHeaderLogoAsset\} alt="Infopedia" className="h-\[32px\] w-\[124px\]" \/>/, 'Guest header should render the dedicated exact Figma logo asset');
assert.doesNotMatch(navbarSource, /src="\/logo\.svg"/, 'Guest header must not reuse the shared logo asset with a different paint');
assert.ok(existsSync(figmaLogoPath), 'Dedicated Figma guest header logo asset must exist');
const figmaLogoSource = readFileSync(figmaLogoPath, 'utf8');
assert.match(figmaLogoSource, /<svg[^>]+width="124"[^>]+height="32"/, 'Dedicated Figma logo asset should preserve the 124x32 export metadata');
assert.match(figmaLogoSource, /fill="#6a37c3"/i, 'Dedicated Figma logo asset should preserve the source purple paint');
assert.match(navbarSource, /<nav className="flex h-\[30px\][^\"]*gap-\[4px\]/, 'Marketing tabs should use the Figma 4px group gap');
assert.match(navbarSource, /href="#tools" className=\{`\$\{marketingLinkClass\} min-w-\[112px\]\`\}/, 'First compact tab should preserve the Figma 112px item width at RU');
assert.match(navbarSource, /href="#featured-terms" className=\{`\$\{marketingLinkClass\} min-w-\[120px\]\`\}/, 'Term-base tab should preserve the Figma 120px item width at RU');
assert.match(navbarSource, /href="#desktop-analysis" className=\{`\$\{marketingLinkClass\} min-w-\[103px\]\`\}/, 'Analyze tab should preserve the Figma 103px item width at RU');
assert.match(navbarSource, /<header[^>]+max-md:hidden/, 'Guest desktop navbar should remain hidden on mobile');
assert.match(navbarSource, /<div className="flex h-\[34px\] shrink-0 items-center gap-\[8px\]">[\s\S]*<LanguageSwitcher compact \/>/, 'Right actions should use the Figma 34px row and 8px group gap');
assert.doesNotMatch(navbarSource, /h-10 w-px|border-b|border-border/, 'Compact Figma header should not add a divider or border');
assert.match(navbarSource, /to="\/login"[\s\S]*h-\[34px\][\s\S]*w-\[72px\][\s\S]*px-\[16px\][\s\S]*py-\[8px\][\s\S]*text-\[14px\][\s\S]*text-\[#161519\]/, 'Guest login should match the compact Figma 72x34 dark-text control');
assert.match(navbarSource, /to="\/onboarding"[\s\S]*className="(?=[^"]*h-\[34px\])(?=[^"]*w-\[100px\])(?=[^"]*bg-\[#6a37c3\])(?=[^"]*rounded-\[8px\])(?=[^"]*px-\[16px\])(?=[^"]*py-\[8px\])(?=[^"]*gap-\[4px\])(?=[^"]*text-\[14px\])(?=[^"]*text-white)[^"]*"[\s\S]*ArrowRight02Icon/, 'Guest start should use the compact Figma 100x34 purple onboarding control and arrow-right-02 icon');
assert.match(navbarSource, /icon=\{ArrowRight02Icon\} size=\{18\}/, 'Start control should render the HugeIcons arrow at 18px');
assert.match(languageSource, /compact\?: boolean/, 'LanguageSwitcher should expose a compact desktop trigger variant');
assert.match(languageSource, /icon=\{InternetIcon\} size=\{18\}/, 'Compact language trigger should use the HugeIcons internet glyph at 18px');
assert.match(languageSource, /compact[\s\S]*h-\[34px\][\s\S]*w-\[70px\][\s\S]*gap-\[8px\][\s\S]*px-\[12px\][\s\S]*py-\[8px\][\s\S]*text-\[14px\]/, 'Compact language trigger should use the Figma 70x34 12px/8px/14px geometry');
assert.doesNotMatch(navbarSource, /SearchChoiceModal|searchModalOpen|SEARCH_NAV_PATHS/, 'Landing marketing navigation should not retain the superseded search modal action');
assert.match(navbarSource, /<a href="#tools"[^>]*>[\s\S]*nav-item__underline[\s\S]*<\/a>/, 'Each marketing anchor should own a dedicated underline element');
assert.match(navbarSource, /<a href="#featured-terms"[^>]*>[\s\S]*nav-item__underline[\s\S]*<\/a>/, 'Term-base anchor should own a dedicated underline element');
assert.match(navbarSource, /<a href="#desktop-analysis"[^>]*>[\s\S]*nav-item__underline[\s\S]*<\/a>/, 'Analyze anchor should own a dedicated underline element');
assert.match(navbarSource, /aria-current=\{activeSection === 'desktop-analysis' \? 'true' : undefined\}/, 'Active marketing link should expose aria-current true');
assert.doesNotMatch(navbarSource, /aria-current=.*location/, 'Marketing active state must not use location aria-current');
assert.match(navbarSource, /querySelectorAll<HTMLElement>\('\[data-nav-section\]'\)/, 'Scroll-spy should read semantic navigation sections');
assert.match(navbarSource, /getBoundingClientRect\(\)\.height/, 'Scroll-spy should measure the actual sticky header height');
assert.match(navbarSource, /const activationY = headerOffset \+ 24/, 'Scroll-spy activation line should be header height plus 24px');
assert.match(navbarSource, /let activeNavSection: HTMLElement \| null = null/, 'Scroll-spy should keep the default header neutral until a section crosses the activation line');
assert.match(navbarSource, /removeEventListener\('scroll', updateActiveSection\)/, 'Scroll-spy should clean up the scroll listener');
assert.match(navbarSource, /removeEventListener\('resize', updateActiveSection\)/, 'Scroll-spy should clean up the resize listener');
assert.doesNotMatch(navbarSource, /onClick=|onMouseDown=|onMouseUp=/, 'Native anchors must not intercept clicks for animation');
assert.match(indexCssSource, /html\s*\{[\s\S]*scroll-behavior:\s*smooth;/, 'Global native hash navigation should remain smooth');
assert.match(indexCssSource, /\[data-nav-section\]\s*\{[\s\S]*scroll-margin-top:\s*var\(--header-offset/, 'Sections should use the measured header offset for hash navigation');
assert.match(indexCssSource, /\.nav-item\s*\{[\s\S]*color:\s*#b1acb9;[\s\S]*font-family:\s*'Mabry Pro',\s*sans-serif;[\s\S]*font-size:\s*14px;[\s\S]*font-weight:\s*400;[\s\S]*line-height:\s*1;/, 'Marketing anchors should use the compact Figma default text paint and exact 14px line box');
assert.match(indexCssSource, /\.nav-item\[aria-current=['"]true['"]\],[\s\S]*\.nav-item:hover\s*\{[\s\S]*color:\s*#161519;/, 'Active and hovered marketing anchors should use the Figma dark text paint');
assert.match(indexCssSource, /\.nav-item__underline\s*\{[\s\S]*left:\s*12px;[\s\S]*right:\s*12px;[\s\S]*bottom:\s*-1px;[\s\S]*height:\s*2px;[\s\S]*border-radius:\s*2px;[\s\S]*background:\s*#6a37c3;[\s\S]*transform:\s*scaleX\(0\)[\s\S]*transform-origin:\s*center[\s\S]*transition:\s*transform\s+200ms\s+ease;/, 'Compact underlines should fit each tab and animate from the center over 200ms');
assert.match(indexCssSource, /\.nav-item:hover \.nav-item__underline,[\s\S]*\.nav-item\[aria-current=['"]true['"]\] \.nav-item__underline[\s\S]*transform:\s*scaleX\(1\)/, 'Hover and active states should reveal independent centered underlines');
assert.doesNotMatch(indexCssSource, /\.nav-item[^\n]*:active[\s\S]*transform|\.nav-item[^\n]*:active[\s\S]*background|\.nav-item[^\n]*:active[\s\S]*opacity/, 'Navigation must not add click/mousedown animation');
for (const id of ['tools', 'featured-terms', 'desktop-analysis']) {
  assert.match(landingSource, new RegExp(`id="${id}"[^>]*data-nav-section`), `Desktop section ${id} should expose data-nav-section`);
}
assert.doesNotMatch(navbarSource, /useAuthStore|FigmaProfileIcon|<NavLink/, 'Authenticated navigation belongs to DesktopSidebar');
assert.match(layoutSource, /resolveDesktopShell/, 'Layout should own authenticated desktop shell selection');
assert.match(layoutSource, /!authenticated && authHydrated && <Navbar \/>/, 'Navbar should render only for hydrated guests');

for (const key of ['features', 'termBase', 'analyze']) {
  assert.ok(ru.nav[key], `RU locale should define nav.${key}`);
  assert.ok(kk.nav[key], `KK locale should define nav.${key}`);
}
assert.equal(ru.nav.start, 'Начать', 'RU locale should preserve the Figma start copy');
assert.ok(kk.nav.start, 'KK locale should define a localized start copy');
