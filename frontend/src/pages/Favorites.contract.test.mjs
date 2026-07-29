import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';
import escapeClassNameModule from 'tailwindcss/lib/util/escapeClassName.js';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const frontendRoot = path.resolve(srcDir, '..');
const escapeClassName = escapeClassNameModule.default ?? escapeClassNameModule;
const app = readFileSync(path.resolve(srcDir, 'App.tsx'), 'utf8');
const appSource = app;
const protectedRoute = readFileSync(path.resolve(srcDir, 'components/ProtectedRoute.tsx'), 'utf8');
const page = readFileSync(path.resolve(srcDir, 'features/favorites/pages/FavoritesPage.tsx'), 'utf8');
const story = readFileSync(path.resolve(srcDir, 'features/favorites/pages/FavoritesPage.stories.tsx'), 'utf8');
const mobileCard = readFileSync(path.resolve(srcDir, 'features/terms/components/TermCard.tsx'), 'utf8');
const mobilePageFrame = readFileSync(path.resolve(srcDir, 'ui/patterns/MobilePageFrame.tsx'), 'utf8');
const mobilePinnedAppBar = readFileSync(path.resolve(srcDir, 'ui/patterns/MobilePinnedAppBar.tsx'), 'utf8');
const toggle = readFileSync(path.resolve(srcDir, 'features/favorites/components/FavoriteToggle.tsx'), 'utf8');
const search = readFileSync(path.resolve(srcDir, 'features/search/pages/TermSearchPage.tsx'), 'utf8');
const detail = readFileSync(path.resolve(srcDir, 'features/terms/components/TermDetailView.tsx'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'));
assert.ok(
  appSource.indexOf('if (!ownerReady) return null;') < appSource.indexOf('<BrowserRouter>'),
  'The root ownership barrier must run before BrowserRouter can mount any route'
);
assert.ok(
  appSource.indexOf('if (!ownerReady) return null;') < appSource.indexOf('path="/terms/:termRef"'),
  'The root ownership barrier must precede public term-detail routes'
);
assert.match(protectedRoute, /Navigate to=\{`\/login\?next=\$\{next\}`\}/, 'Protected route must preserve the requested path in login redirect');
assert.match(page, /appBar=\{\{[\s\S]*title: t\('favorites\.title'[\s\S]*tone: 'canvas'[\s\S]*titleAlign: 'start'[\s\S]*compactLayout: 'leading-only'[\s\S]*leading:[\s\S]*navigate\('\/profile'\)/, 'Favorites must provide a leading-only canonical app-bar config with title and profile back navigation');
const appBarStart = page.indexOf('appBar={{');
const appBarEnd = page.indexOf('contentId=', appBarStart);
const appBarSource = page.slice(appBarStart, appBarEnd);
assert.match(page, /text-text hover:text-text/, 'Favorites back arrow must share the title ink color');
assert.match(appBarSource, /<HugeiconsIcon icon=\{ArrowLeft01Icon\} size=\{24\}/, 'Favorites back arrow must render at the exact 24px compact-row visual size');
assert.doesNotMatch(appBarSource, /<IconButton[^>]*(?:\bsize=|className="[^"]*(?:\bsize-|\bh-|\bw-|\bmin-h-|\bmin-w-))/, 'Favorites must let the compact frame provide the back action target without local IconButton geometry');
assert.match(mobilePageFrame, /<MobilePinnedAppBar[\s\S]*scrollRootRef=\{scrollMode === 'content' \? scrollViewportRef : undefined\}/, 'Favorites canonical frame must delegate to the pinned app-bar pattern with the content scroll root');
assert.match(mobilePinnedAppBar, /MobileAppBar \{\.\.\.appBarProps\} tone="transparent" size="compact" safeArea=\{false\} sticky=\{false\}/, 'Pinned app-bar pattern must force the shared compact 24px app-bar row');
assert.match(mobilePinnedAppBar, /IntersectionObserver/, 'Pinned app-bar pattern must own observer pinning behavior');
assert.equal(80 + 24 + 32, 136, 'Favorites first content child must use the canonical 80px offset, 24px row, and 32px gap');
assert.match(mobilePageFrame, /\{legacyAppBar\}[\s\S]*<main/, 'MobilePageFrame must place legacy app-bar nodes before the main content during migration');
assert.doesNotMatch(page, /MobileAppBar|pt-\[80px\]|safeArea=|min-h-\[calc\(100vh-80px\)\]|(?:min-)?h-14|56px|168px/, 'Favorites must delegate canonical compact header geometry and reject legacy 56px/168px assumptions');
for (const key of ['title', 'subtitle', 'loading', 'emptyTitle', 'emptyBody', 'searchCta', 'loadError', 'retry', 'loadMore', 'listLabel', 'count', 'addAria', 'removeAria', 'saveTermAria', 'removeTermAria', 'pending', 'actionError', 'updateFailed']) {
  assert.equal(typeof ru.favorites?.[key], 'string', `RU must define favorites.${key}`);
  assert.equal(typeof kk.favorites?.[key], 'string', `KK must define favorites.${key}`);
}
assert.match(page, /function FavoritesEmptyAlert[\s\S]*size-16 shrink-0[\s\S]*bg-\[#ded2f1\][\s\S]*flex size-8 items-center justify-center \[&>svg\]:size-full[\s\S]*AllBookmarkIcon[\s\S]*className="size-full"/, 'Favorites must define the local Figma empty alert with the exact bookmark icon geometry');
assert.match(page, /aria-labelledby=\{titleId\}[\s\S]*aria-describedby=\{descriptionId\}/, 'Favorites empty alert must associate its title and description for assistive technology');
assert.match(page, /text-\[20px\][\s\S]*leading-\[20px\][\s\S]*text-\[#161519\][\s\S]*text-\[14px\][\s\S]*leading-\[14px\][\s\S]*text-\[#6e6779\]/, 'Favorites empty alert must use the approved title and helper typography');
assert.match(page, /showEmptyState[\s\S]*fixed inset-x-6 top-\[366px\] md:static md:inset-auto md:top-auto md:flex md:flex-1 md:items-center md:justify-center md:px-6[\s\S]*FavoritesEmptyAlert/, 'Favorites empty alert must use fixed mobile geometry and reset to desktop flex centering');
assert.doesNotMatch(page, /showEmptyState[\s\S]*(?:pt-\[230px\]|max-md:justify-start|max-md:-translate-y-5)/, 'Favorites empty alert must not use padding, mobile justification, or transform offsets');
const emptyLayoutClasses = [
  'fixed',
  'inset-x-6',
  'top-[366px]',
  'md:static',
  'md:inset-auto',
  'md:top-auto',
  'md:flex',
  'md:flex-1',
  'md:items-center',
  'md:justify-center',
  'md:px-6',
];
const emptyLayoutCss = await postcss([
  tailwindcss({
    ...loadConfig(path.join(frontendRoot, 'tailwind.config.ts')),
    content: [{ raw: `<div class="${emptyLayoutClasses.join(' ')}"></div>`, extension: 'html' }],
  }),
]).process('@tailwind utilities;', { from: undefined });

function assertGeneratedDeclaration(className, property, value) {
  const selector = `.${escapeClassName(className)}`;
  let matchingRule;
  emptyLayoutCss.root.walkRules((rule) => {
    if (rule.selector === selector) matchingRule = rule;
  });
  assert.ok(matchingRule, `Tailwind must generate ${selector}`);
  assert.ok(
    matchingRule.nodes.some((node) => node.type === 'decl' && node.prop === property && node.value === value),
    `${className} must emit ${property}: ${value}; received: ${matchingRule.toString()}`,
  );
}

assertGeneratedDeclaration('fixed', 'position', 'fixed');
assertGeneratedDeclaration('inset-x-6', 'left', '1.5rem');
assertGeneratedDeclaration('inset-x-6', 'right', '1.5rem');
assertGeneratedDeclaration('top-[366px]', 'top', '366px');
assertGeneratedDeclaration('md:static', 'position', 'static');
assertGeneratedDeclaration('md:inset-auto', 'inset', 'auto');
assertGeneratedDeclaration('md:top-auto', 'top', 'auto');
assertGeneratedDeclaration('md:flex', 'display', 'flex');
assertGeneratedDeclaration('md:flex-1', 'flex', '1 1 0%');
assertGeneratedDeclaration('md:items-center', 'align-items', 'center');
assertGeneratedDeclaration('md:justify-center', 'justify-content', 'center');
assertGeneratedDeclaration('md:px-6', 'padding-left', '1.5rem');
assertGeneratedDeclaration('md:px-6', 'padding-right', '1.5rem');
assert.match(page, /size="sm"[\s\S]*fullWidth[\s\S]*h-10 min-h-10[\s\S]*bg-\[#6a37c3\][\s\S]*text-\[16px\][\s\S]*leading-\[16px\][\s\S]*→/, 'Favorites empty CTA must match the Figma control geometry and use a literal arrow');
assert.doesNotMatch(page, /\bEmptyState\b|Search01Icon|ArrowRight01Icon/, 'Favorites empty alert must not reuse the white EmptyState rectangle or an arrow SVG');
assert.match(page, /size="sm"[\s\S]*fullWidth[\s\S]*!bg-\[#6a37c3\][\s\S]*!text-white[\s\S]*!opacity-100[\s\S]*hover:!bg-\[#6a37c3\][\s\S]*hover:!opacity-100[\s\S]*focus:!bg-\[#6a37c3\][\s\S]*focus:!opacity-100[\s\S]*focus-visible:!bg-\[#6a37c3\][\s\S]*focus-visible:!opacity-100[\s\S]*active:!bg-\[#6a37c3\][\s\S]*active:!opacity-100/, 'Favorites empty CTA must keep the Search purple and full opacity in every interactive state');
const emptyAlertSource = page.slice(page.indexOf('function FavoritesEmptyAlert'), page.indexOf('export function FavoritesPage'));
assert.doesNotMatch(emptyAlertSource, /<svg|ArrowRight01Icon/, 'Favorites empty CTA must not render an arrow SVG');
assert.match(page, /favorites\.emptyTitle[\s\S]*favorites\.emptyBody/, 'Favorites must expose localized empty state');
assert.match(page, /onAction=\{\(\) => navigate\('\/search'\)\}/, 'Favorites empty CTA must navigate to term search');
assert.doesNotMatch(page, /max-md:!min-h-\[calc\(100dvh-var\(--shell-mobile-bottom-nav-height\)\)\]/, 'Favorites must not double-subtract the authenticated mobile bottom navigation from the shared frame height');
assert.match(page, /contentClassName="flex flex-col bg-\[#efebf6\]"/, 'Favorites must make the frame content a flex column on the lavender canvas');
assert.match(page, /favorites\.loadError[\s\S]*common\.retry[\s\S]*favorites\.loadMore/, 'Favorites must expose localized load/retry/more states');
assert.match(page, /serverConsumed/, 'Favorites load-more must use the server-consumed cursor');
assert.doesNotMatch(page, /skip \+ limit/, 'Favorites load-more must not derive its cursor from the mutable visible-page offset');
assert.match(page, /state=\{\{ backTo: '\/favorites'/, 'Favorite term detail links must return to favorites');
assert.match(page, /<TermCard[\s\S]*backTo="\/favorites"/, 'Mobile favorites must use the canonical responsive term card');
assert.match(mobileCard, /max-md:rounded-\[16px\][\s\S]*max-md:border-0[\s\S]*max-md:p-2/, 'Favorites mobile cards must use the canonical responsive outer geometry');
assert.match(mobileCard, /max-md:rounded-\[12px\][\s\S]*max-md:bg-white[\s\S]*max-md:p-4/, 'Favorites mobile cards must use the canonical responsive inner geometry');
assert.match(mobileCard, /text-text-body[\s\S]*max-md:text-\[16px\][\s\S]*max-md:leading-4/, 'Favorites mobile previews must use the canonical responsive typography');
assert.match(page, /favorites\.count[\s\S]*count: total/, 'Favorites must render a localized total count matching the search result count');
assert.doesNotMatch(page, /total > 0 && <p className="mt-4 text-center text-\[13px\] text-muted">\{total\}/, 'Favorites must not render a raw total footer');
assert.equal((page.match(/<TermCard\b/g) ?? []).length, 1, 'Favorites must render one canonical responsive list');
assert.match(toggle, /FavoriteToggle[\s\S]*favorites\.removeTermAria[\s\S]*favorites\.saveTermAria/, 'Toggle must expose localized add/remove aria labels');
assert.match(toggle, /aria-busy=\{pending\}[\s\S]*disabled=\{pending\}/, 'Toggle must expose pending state');
assert.match(toggle, /favorites\.updateFailed/, 'Toggle must expose localized mutation error');
assert.match(toggle, /appearance\?: 'default' \| 'mobile-card' \| 'mobile-header'/, 'Bookmark appearances must expose default, mobile-card, and mobile-header modes');
assert.match(toggle, /size-11[\s\S]*compactMobileAppearance[\s\S]*border-0 bg-transparent/, 'Bookmark appearances must expose shared borderless 44px targets');
assert.match(toggle, /size=\{compactMobileAppearance \? 24[\s\S]*strokeWidth=\{compactMobileAppearance \? 1\.6/, 'Compact bookmark appearances must use the 24px glyph and 1.6 stroke');
assert.match(toggle, /positionClass = mobileCardAppearance \? 'absolute' :[\s\S]*'relative'/, 'Favorite toggle wrapper must use absolute positioning only for mobile cards and relative anchoring by default');
assert.match(toggle, /positionClass = mobileCardAppearance \? 'absolute' : mobileHeaderAppearance \? 'relative'/, 'Mobile-header favorite wrapper must remain flow-safe and relative');
assert.doesNotMatch(toggle, /className=\{`relative inline-flex \$\{className\}`\}/, 'Favorite toggle must not leave an unconditional relative class alongside caller positioning');
assert.match(toggle, /isFavorite[\s\S]*text-\[#6a37c3\]/, 'Favorite bookmark must use exact active purple ink');
assert.match(toggle, /className=\{isFavorite \? 'fill-current'/, 'Favorite bookmark must fill its active glyph');
assert.match(toggle, /text-\[#161519\]/, 'Favorite bookmark must keep inactive ink outline');
assert.match(search, /to="\/favorites"[\s\S]*search\.favoritesAria/, 'Search header CTA must navigate to favorites');
assert.match(mobileCard, /<FavoriteToggle[\s\S]*termRef=\{term\.public_id\}[\s\S]*className="absolute right-6 top-6 max-md:right-4 max-md:top-4"/, 'Canonical responsive term cards must keep the favorite toggle anchored to the card corner');
assert.match(detail, /<FavoriteToggle[\s\S]*termRef/, 'Term detail must use FavoriteToggle');
assert.match(detail, /appearance="mobile-header"/, 'Term detail header must use the mobile-header favorite appearance');
assert.doesNotMatch(detail, /appearance="mobile-header"[^>]*className=/, 'Term detail mobile-header favorite must not receive caller positioning');
assert.match(toggle, /if \(!isAuthenticated\) return null;/, 'Guest users must omit the favorite control');
assert.match(mobileCard, /backTo\?: string[\s\S]*backTo = '\/search'/, 'Shared mobile term card must support a reusable backTo destination');
assert.doesNotMatch(page, /<button[^>]*>.*Bookmark/, 'Favorites page must not nest interactive bookmark controls in links');
assert.match(story, /<Layout>[\s\S]*<FavoritesPage \/>[\s\S]*<\/Layout>/, 'Favorites stories must exercise the real full-screen layout and page');
assert.match(story, /MemoryRouter initialEntries=\{\['\/favorites'\]\}/, 'Favorites stories must start from the real favorites route');
assert.match(story, /useAuthStore\.setState\(\{ isAuthenticated: true[\s\S]*user: storyUser \}\)/, 'Favorites stories must seed an authenticated deterministic user state');
assert.match(story, /useFavoritesStore\.setState\(\{[\s\S]*ownerUserId: storyUser\.id[\s\S]*list: \[\][\s\S]*error: null[\s\S]*loadFavorites: async \(\) => undefined/, 'Favorites stories must seed an empty successful no-network favorites store');
assert.match(story, /rect\.x\)\.toBe\(24\)[\s\S]*rect\.y\)\.toBe\(366\)[\s\S]*rect\.width\)\.toBe\(382\)[\s\S]*rect\.height\)\.toBe\(208\)/, 'Favorites stories must assert the approved 430px frame geometry');
assert.match(story, /wrapperStyle\.position\)\.toBe\('fixed'\)[\s\S]*wrapperStyle\.top\)\.toBe\('366px'\)[\s\S]*wrapperStyle\.left\)\.toBe\('24px'\)[\s\S]*wrapperStyle\.right\)\.toBe\('24px'\)[\s\S]*wrapperStyle\.paddingTop\)\.toBe\('0px'\)[\s\S]*wrapperStyle\.transform\)\.toBe\('none'\)/, 'Favorites mobile story must assert fixed geometry without padding or transforms');
assert.match(story, /export const Desktop[\s\S]*desktop1440[\s\S]*wrapperStyle\.position\)\.toBe\('static'\)[\s\S]*wrapperStyle\.top\)\.toBe\('auto'\)[\s\S]*wrapperStyle\.display\)\.toBe\('flex'\)[\s\S]*wrapperStyle\.flexGrow\)\.toBe\('1'\)[\s\S]*wrapperStyle\.alignItems\)\.toBe\('center'\)[\s\S]*wrapperStyle\.justifyContent\)\.toBe\('center'\)[\s\S]*wrapperStyle\.paddingLeft\)\.toBe\('24px'\)[\s\S]*wrapperStyle\.paddingRight\)\.toBe\('24px'\)/, 'Favorites desktop story must assert static centered flex resets');
assert.match(story, /getBoundingClientRect\(\)\.width\)\.toBe\(32\)/, 'Favorites stories must assert a 32px bookmark glyph');
assert.match(story, /button\.querySelector\('svg'\)\)\.toBeNull\(\)/, 'Favorites stories must assert the CTA has no arrow SVG');
assert.match(story, /favorites-story-location[\s\S]*\/search/, 'Favorites stories must assert CTA navigation to search');
