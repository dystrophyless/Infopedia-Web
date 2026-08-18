import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const navbarSource = readFileSync(path.resolve(import.meta.dirname, 'Navbar.tsx'), 'utf8');
const languageSource = readFileSync(path.resolve(import.meta.dirname, 'LanguageSwitcher.tsx'), 'utf8');
const compactTriggerClass = languageSource.match(/className=\{compact\s*\n\s*\? '([^']+)'/)?.[1] ?? '';
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
  /<div[^>]*data-desktop-content-rail[^>]*className="mx-auto flex h-\[34px\] w-full max-w-\[1152px\] items-center justify-between px-\[24px\] min-\[1440px\]:max-w-\[1120px\] min-\[1440px\]:px-0">/,
  'Landing guest navbar should use the centered responsive content rail',
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
assert.match(navbarSource, /<div className="flex h-\[32px\] shrink-0 items-center gap-\[8px\]">[\s\S]*<LanguageSwitcher compact \/>/, 'Right actions should use the Figma 32px row and 8px group gap');
assert.doesNotMatch(navbarSource, /h-10 w-px|border-b|border-border/, 'Compact Figma header should not add a divider or border');
assert.match(navbarSource, /to="\/login"[\s\S]*className="(?=[^"]*h-\[32px\])(?=[^"]*rounded-\[8px\])(?=[^"]*bg-white)(?=[^"]*hover:bg-\[#f6f5f7\])(?=[^"]*active:bg-\[#d5d3d9\])(?=[^"]*px-\[16px\])(?=[^"]*py-\[8px\])(?=[^"]*text-\[12px\])(?=[^"]*font-normal)(?=[^"]*leading-\[normal\])(?=[^"]*text-\[#161519\])[^"\n]*"/, 'Guest login should use the Hug-width 32px Figma control with exact typography, default, hover, and native active paint');
assert.match(navbarSource, /to="\/onboarding"[\s\S]*className="(?=[^"]*h-\[32px\])(?=[^"]*rounded-\[8px\])(?=[^"]*bg-\[#6a37c3\])(?=[^"]*hover:bg-\[#865bcf\])(?=[^"]*active:bg-\[#a585db\])(?=[^"]*px-\[16px\])(?=[^"]*py-\[8px\])(?=[^"]*gap-\[4px\])(?=[^"]*text-\[12px\])(?=[^"]*font-normal)(?=[^"]*leading-\[normal\])(?=[^"]*text-white)[^"\n]*"[\s\S]*ArrowRight02Icon/, 'Guest start should use the Hug-width 32px Figma onboarding control with exact typography, default, hover, and native active paint');
assert.doesNotMatch(navbarSource, /to="\/(?:login|onboarding)"[\s\S]{0,250}\bw-\[/, 'Compact guest links should remain content-sized instead of using fixed widths');
assert.match(navbarSource, /icon=\{ArrowRight02Icon\} size=\{16\} strokeWidth=\{1\.5\}/, 'Start control should render the confirmed HugeIcons arrow-right-02 glyph at 16px with source stroke');
assert.match(languageSource, /compact\?: boolean/, 'LanguageSwitcher should expose a compact desktop trigger variant');
assert.match(languageSource, /icon=\{InternetIcon\} size=\{16\} strokeWidth=\{1\.5\}/, 'Compact language trigger should use the confirmed HugeIcons internet glyph at 16px with source stroke');
assert.match(languageSource, /compact[\s\S]*\? '(?=[^'\n]*h-\[32px\])(?=[^'\n]*rounded-\[8px\])(?=[^'\n]*gap-\[8px\])(?=[^'\n]*px-\[12px\])(?=[^'\n]*py-\[8px\])(?=[^'\n]*text-\[12px\])(?=[^'\n]*leading-\[normal\])(?=[^'\n]*text-\[#b1acb9\])(?=[^'\n]*hover:text-\[#161519\])(?=[^'\n]*aria-expanded:text-\[#161519\])(?=[^'\n]*hover:bg-\[#f6f5f7\])(?=[^'\n]*aria-expanded:bg-\[#d5d3d9\])[^'\n]*'/, 'Compact language trigger should inherit exact default, hover, and open foreground paint alongside the existing geometry and backgrounds');
assert.doesNotMatch(compactTriggerClass, /\bw-\[/, 'Compact language trigger should not clip localized content with a fixed width');
assert.doesNotMatch(languageSource, /icon=\{InternetIcon\}[^>]*(?:color=|text-\[)/, 'Compact language icon should inherit currentColor instead of declaring its own foreground paint');
assert.match(
  languageSource,
  /className=\{compact \? 'relative flex flex-col items-end gap-\[16px\]' : 'relative'\}/,
  'Compact language wrapper should expose the Figma right-aligned 16px stack without changing noncompact semantics',
);
assert.match(
  languageSource,
  /className=\{compact\s*\n\s*\? 'absolute right-0 top-full z-50 mt-\[8px\] flex w-\[160px\] flex-col overflow-hidden rounded-\[8px\] border border-\[#eae9ec\] bg-white p-\[4px\] shadow-none'\s*\n\s*:\s*'absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-\[10px\] border border-border bg-surface'\}/,
  'Compact language popup should overlay below the trigger with the exact 160px white bordered Figma surface while preserving the noncompact popup branch',
);
assert.match(
  languageSource,
  /compact\s*\n\s*\? [`']flex h-\[28px\] w-full items-center justify-between rounded-\[4px\] px-\[8px\] py-\[6px\] text-left text-\[14px\] font-normal leading-\[normal\] text-\[#161519\] hover:bg-\[#f8f5fc\] focus:outline-none/,
  'Compact language rows should be 28px, 14px regular, and transparent dark-text controls with 8px/6px padding',
);
assert.match(
  languageSource,
  /compact\s*\n\s*\? [`']flex h-\[28px\][^`']*rounded-\[4px\]/,
  'Compact language option rows should use the exact 4px Figma corner radius',
);
assert.match(
  languageSource,
  /focus-visible:outline-2 focus-visible:outline-\[#6a37c3\] focus-visible:outline-offset-\[-2px\]/,
  'Compact language rows should expose a keyboard-only 2px purple focus indicator inside the popup without changing pointer paint',
);
assert.match(languageSource, /const keyboardOpenRef = useRef\(false\)/, 'Compact language focus paint should track keyboard versus pointer opening modality');
assert.match(languageSource, /const \[keyboardModality, setKeyboardModality\] = useState\(false\)/, 'Compact language focus paint should rerender on modality transitions');
assert.match(languageSource, /onPointerDown=\{\(\) => \{ keyboardOpenRef\.current = false; setKeyboardModality\(false\); \}\}/, 'Pointer opening should suppress the keyboard-only focus outline');
assert.match(languageSource, /onKeyDown=\{handleTriggerKeyDown\}/, 'Keyboard opening should retain the compact row focus indicator');
assert.match(languageSource, /'focus-visible:outline-none'/, 'Pointer-open compact rows should remain outline-free');
assert.match(languageSource, /if \(e\.key === 'ArrowDown'\) \{[\s\S]*keyboardOpenRef\.current = true;[\s\S]*setKeyboardModality\(true\);[\s\S]*optionRefs\.current\[Math\.min\(index \+ 1, LANGS\.length - 1\)\]\?\.focus\(\)/, 'ArrowDown should switch to keyboard modality before moving focus to the next compact row');
assert.match(languageSource, /else if \(e\.key === 'ArrowUp'\) \{[\s\S]*keyboardOpenRef\.current = true;[\s\S]*setKeyboardModality\(true\);[\s\S]*optionRefs\.current\[Math\.max\(index - 1, 0\)\]\?\.focus\(\)/, 'ArrowUp should switch to keyboard modality before moving focus to the previous compact row');
assert.match(languageSource, /compact && lang === l \? <HugeiconsIcon icon=\{Tick02Icon\} size=\{16\} strokeWidth=\{1\.5\} className="text-\[#6a37c3\]" \/> :/, 'Compact language popup should paint the selected 16px/1.5px check in the exact accent color');
assert.match(languageSource, /hover:bg-\[#f8f5fc\]/, 'Compact language rows should use the exact Figma hover surface');
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
assert.match(
  indexCssSource,
  /body\s*\{[\s\S]*?overflow-x:\s*clip;[\s\S]*?overscroll-behavior-y:\s*none;/,
  'Body should clip horizontal overflow without becoming an implicit vertical scroll container',
);
assert.doesNotMatch(
  indexCssSource,
  /body\s*\{[\s\S]*?overflow-x:\s*hidden;/,
  'Body must not use overflow-x:hidden because it can create an implicit scroll container',
);
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
