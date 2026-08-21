import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const rootDir = path.resolve(srcDir, '..');

const appSource = readFileSync(path.resolve(srcDir, 'App.tsx'), 'utf8');
const termSearchSource = readFileSync(
  path.resolve(srcDir, 'features/search/pages/TermSearchPage.tsx'),
  'utf8',
);
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
const searchFeatureDir = path.resolve(srcDir, 'features/search');
const searchStoreSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/searchStore.ts'),
  'utf8',
);
const filterOptionsSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/filterOptions.ts'),
  'utf8',
);
const filterCatalogHookSource = readFileSync(
  path.resolve(searchFeatureDir, 'hooks/useSearchFilterCatalog.ts'),
  'utf8',
);
const searchFiltersPath = path.resolve(
  srcDir,
  'features/search/pages/SearchFiltersPage.tsx',
);
const searchFiltersSource = existsSync(searchFiltersPath)
  ? readFileSync(searchFiltersPath, 'utf8')
  : '';
const searchViewsStorySource = readFileSync(
  path.resolve(srcDir, 'features/search/components/SearchViews.stories.tsx'),
  'utf8',
);
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

assert.ok(searchFiltersSource, 'Search filters page component should exist');

assert.match(
  searchViewsStorySource,
  /const EDITION_OPTIONS[\s\S]*Атамұра[\s\S]*Алматыкітап[\s\S]*Арман-ПВ[\s\S]*export const EditionOptionsGeometry/,
  'Edition options story should preserve the canonical publisher order',
);

assert.match(
  searchViewsStorySource,
  /export const LongSectionOptionsGeometry[\s\S]*filterId=\"section\"/,
  'Long section options story should exercise the wrapping row variant',
);

for (const [storyName, width] of [
  ['EditionOptionsGeometry320', 320],
  ['EditionOptionsGeometry360', 360],
  ['EditionOptionsGeometry390', 390],
  ['EditionOptionsGeometry430', 430],
]) {
  assert.match(
    searchViewsStorySource,
    new RegExp(`export const ${storyName}[\\s\\S]*makeEditionGeometryPlay\\(${width}\\)`),
    `${storyName} should assert its intended CSS viewport width`,
  );
}

assert.match(
  searchViewsStorySource,
  /await expect\(labels\)\.toEqual\(\['Атамұра', 'Алматыкітап', 'Арман-ПВ'\]\)/,
  'Edition geometry should assert exact publisher labels and order at runtime',
);

assert.match(
  searchViewsStorySource,
  /await expect\(list\.scrollHeight\)\.toBeGreaterThan\(list\.clientHeight\)/,
  'Long section geometry should prove overflow and separator round-trip',
);
assert.match(
  searchViewsStorySource,
  /borderBottomColor\)\.toBe\('rgb\(213, 211, 217\)'\)/,
  'Long section geometry should assert the active separator color',
);
assert.match(
  searchViewsStorySource,
  /header\.dataset\.scrolled\)\.toBe\('false'\)/,
  'Long section geometry should assert the separator resets at scrollTop zero',
);

assert.match(
  appSource,
  /import \{ SearchFilters \} from '\.\/pages\/SearchFilters';/,
  'App should import the dedicated search filters page',
);

assert.match(
  appSource,
  /path="\/search\/filters"[\s\S]*<Protected>[\s\S]*<SearchFilters \/>[\s\S]*<\/Protected>/,
  'Search filters should be a protected route at /search/filters',
);

assert.doesNotMatch(
  termSearchSource,
  /to="\/search\/filters"[\s\S]*search\.filterAria/,
  'Term search filter button should open its contextual overlay instead of navigating away',
);

assert.match(
  searchFiltersSource,
  /export function SearchFilters\(\{ overlay = false, initialFilter, onDismiss \}: SearchFiltersProps\)/,
  'Search filters page should export reusable standalone and overlay modes',
);

assert.match(searchFiltersSource, /initialFilter !== undefined/, 'Overlay should distinguish explicit full-filter null from route-query fallback');

assert.ok(
  searchFiltersSource.includes("? 'fixed inset-0 z-50 bg-transparent max-md:overflow-y-auto'"),
  'Filter overlay root should preserve the search page behind a transparent fixed layer',
);

assert.ok(
  searchFiltersSource.includes("? 'mt-[80px] min-h-[calc(100dvh-80px)] max-w-none rounded-b-none rounded-t-[32px] bg-white flex flex-col overflow-hidden px-6 pb-0 pt-2'"),
  'Filter overlay sheet should match the Figma 80px top offset and 32px sheet shell',
);

assert.match(
  searchFiltersSource,
  /function closeFiltersPage\(\) \{[\s\S]*if \(overlay\) \{[\s\S]*onDismiss\?\.\(\);/,
  'Overlay dismissal should close locally so the underlying search page stays mounted',
);

assert.match(
  searchFiltersSource,
  /import \{ useNavigate, useSearchParams \} from 'react-router-dom';/,
  'Search filters page should read popup deep links and close its route-level sheet back to search',
);

assert.match(
  searchFiltersSource,
  /from '\.\.\/model';/,
  'Search filters page should consume its persistent store and option model from the search feature',
);

assert.match(
  searchFiltersSource,
  /const \{[\s\S]*entOnlyFilterActive,[\s\S]*searchFilterSelections,[\s\S]*searchFilterSelectionLabels,[\s\S]*applySearchFilters,[\s\S]*\} = useSearchStore\(\);/,
  'Search filters page should read committed filters and expose one atomic apply action',
);

assert.match(
  searchStoreSource,
  /export const INITIAL_SEARCH_FILTER_SELECTIONS: SearchFilterSelections = \{[\s\S]*grade: \[\],[\s\S]*book: \[\],[\s\S]*section: \[\],[\s\S]*\};/,
  'Search store should own the reusable empty filter selection shape',
);

assert.match(
  searchFiltersSource,
  /const navigate = useNavigate\(\);[\s\S]*function closeFiltersPage\(\) \{[\s\S]*navigate\('\/search'\);[\s\S]*\}/,
  'Search filters page swipe dismissal should return to the search page',
);

assert.match(
  searchFiltersSource,
  /const \[searchParams\] = useSearchParams\(\);[\s\S]*const requestedFilter = searchParams\.get\('select'\);/,
  'Search filters page should read the requested popup filter from the URL',
);

assert.match(
  filterOptionsSource,
  /function isFilterSelectId\(value: string \| null\): value is FilterSelectId[\s\S]*value === 'grade'[\s\S]*value === 'book'[\s\S]*value === 'section'/,
  'Search filters page should only accept known popup deep-link values',
);

assert.match(
  searchFiltersSource,
  /useEffect\(\(\) => \{[\s\S]*if \(initialFilter !== undefined\)[\s\S]*if \(isFilterSelectId\(requestedFilter\)\)[\s\S]*setActiveFilter\(requestedFilter\);[\s\S]*\}, \[initialFilter, requestedFilter\]\);/,
  'Search filters page should open the corresponding options popup from /search/filters?select=...',
);

assert.match(
  searchFiltersSource,
  /function closeActiveFilterDialog\(\) \{[\s\S]*setActiveFilter\(null\);[\s\S]*\}/,
  'Saving a deep-linked option menu should return to the local draft so only the main Search action commits it',
);

assert.match(
  searchFiltersSource,
  /max-md:fixed max-md:inset-0 max-md:z-50[\s\S]*max-md:bg-\[#efebf6\]/,
  'Search filters mobile page should cover the app chrome with the Figma pale purple backdrop',
);

assert.match(
  searchFiltersSource,
  /max-md:rounded-t-\[32px\][^"]*max-md:bg-white[^"]*max-md:min-h-\[calc\(100dvh-62px\)\]/,
  'Search filters mobile page should render the Figma white rounded sheet from the status-bar edge',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-page-scroll[\s\S]*ref=\{filterPageScrollRef\}/,
  'Search filters route sheet should track its page scroll container before stealing downward swipes',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-page-sheet[\s\S]*onPointerDown=\{handlePageDragStart\}[\s\S]*onPointerMove=\{handlePageDragMove\}[\s\S]*onPointerUp=\{handlePageDragEnd\}[\s\S]*onTouchStart=\{handlePageTouchStart\}[\s\S]*onTouchMove=\{handlePageTouchMove\}[\s\S]*onTouchEnd=\{handlePageTouchEnd\}/,
  'Search filters route sheet should support the same full-surface pointer and touch swipe dismissal',
);

assert.match(
  searchFiltersSource,
  /style=\{\{\s*transform: pageDragOffset > 0 \? `translateY\(\$\{pageDragOffset\}px\)` : undefined,[\s\S]*transition: isPageDragging \? 'none' : undefined,/,
  'Search filters route sheet should visually follow the downward swipe',
);

assert.match(
  searchFiltersSource,
  /function finishPageDrag\(shouldClose: boolean\)[\s\S]*setPageDragOffset\(getPageDismissDragOffset\(\)\);[\s\S]*window\.setTimeout\(closeFiltersPage, DRAG_CLOSE_ANIMATION_MS\)/,
  'Search filters route sheet should animate fully downward before navigating back to search',
);

assert.match(
  searchFiltersSource,
  /h-1 w-8 rounded-\[4px\] bg-\[#ded2f1\]/,
  'Search filters page should include the Figma drag handle',
);

assert.match(
  searchFiltersSource,
  /searchFilters\.title/,
  'Search filters page should render a localized title',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-toggle="ent"[\s\S]*aria-pressed=\{entOnly\}/,
  'Search filters page should expose the ENT specification toggle',
);

for (const field of ['grade', 'book', 'section']) {
  assert.match(
    searchFiltersSource,
    new RegExp(`<SelectedFilterControl[\\s\\S]*filterId="${field}"[\\s\\S]*onOpen=\\{\\(\\) => setActiveFilter\\('${field}'\\)\\}`),
    `Search filters page should render the ${field} dropdown row`,
  );
}

assert.match(
  searchStoreSource,
  /export type SearchFilterSelectId = 'grade' \| 'book' \| 'section';/,
  'Search filters should model the three selectable fields explicitly',
);

assert.match(
  filterOptionsSource,
  /export type FilterSelectId = SearchFilterSelectId;/,
  'Search filter option models should reuse the canonical store filter ids',
);

assert.match(
  filterOptionsSource,
  /const SEARCH_FILTER_GRADES[\s\S]*'7'[\s\S]*'8'[\s\S]*'9'[\s\S]*'10'[\s\S]*'11'/,
  'Grade popup should keep the Figma grade options from 7 through 11',
);

assert.match(
  filterCatalogHookSource,
  /getSearchFilterBooks[\s\S]*updateBookCatalogSnapshot\(previous, books\)[\s\S]*mapBookOptions\(update\.snapshot\?\.books \?\? \[\], t\)/,
  'Book popup should derive visible publishers from the validated authoritative catalog snapshot',
);

assert.match(
  filterOptionsSource,
  /function mapBookOptions\(books: readonly BookCatalogItem\[\],[\s\S]*canonicalPublisherId\(book\.publisher\)[\s\S]*SEARCH_FILTER_BOOKS\.filter/,
  'Book popup options should canonicalize publisher ids and preserve fallback labels',
);

assert.match(
  filterOptionsSource,
  /SEARCH_FILTER_BOOKS[\s\S]*atamura[\s\S]*almatykitap[\s\S]*armanPv/,
  'Publisher fallback options should use the canonical order and ids',
);

assert.doesNotMatch(
  filterOptionsSource,
  /metadata\.bookWithGrade|id: 'mektep'/,
  'Publisher filter options should not expose grade-specific book labels or Mektep',
);

assert.match(
  filterCatalogHookSource,
  /getSearchFilterChapters[\s\S]*setChapterOptions/,
  'Chapter popup should derive visible chapter names from the catalog API response',
);

assert.match(
  filterOptionsSource,
  /function mapChapterOptions\(chapters: ChapterCatalogItem\[\]\)[\s\S]*id: chapter\.public_id[\s\S]*label/,
  'Chapter popup options should keep chapter public refs as canonical ids while rendering chapter names',
);

assert.match(
  searchFiltersSource,
  /activeFilter[\s\S]*<SearchFilterOptionsDialog[\s\S]*onToggleOption=\{toggleSearchFilterOptionDraft\}/,
  'Clicking a filter select should open the reusable Figma-style options dialog',
);

assert.match(
  searchFiltersSource,
  /function resetFiltersPage\(\) \{[\s\S]*setDraft\(\(current\) => resetSearchFilterDraft\(current\)\);[\s\S]*setActiveFilter\(null\);[\s\S]*\}/,
  'Search filters page reset action should only reset the local draft',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-page-actions[\s\S]*className="search-filter-actions [^"]*sticky[^"]*bottom-0/,
  'Main search filters sheet should keep Reset/Search actions fixed at the bottom',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-page-action="reset"[\s\S]*onClick=\{resetFiltersPage\}[\s\S]*searchFilters\.reset/,
  'Main search filters sheet should expose a Reset action',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-page-action="search"[\s\S]*onClick=\{applyFiltersPage\}[\s\S]*searchFilters\.search/,
  'Main Search action should validate and atomically apply the complete local draft',
);

assert.match(
  searchFiltersSource,
  /onResetOptions=\{resetSearchFilterOptionsDraft\}/,
  'Options dialog reset should remain local to the active draft filter',
);

assert.match(
  searchFiltersSource,
  /onClose=\{closeActiveFilterDialog\}/,
  'Options dialog save should use the quick-filter-aware close handler',
);

assert.match(
  searchFiltersSource,
  /role="dialog"[\s\S]*aria-modal="true"[\s\S]*data-search-filter-dialog/,
  'Options dialog should be exposed as a modal dialog for assistive tech and tests',
);

assert.match(
  searchFiltersSource,
  /type="checkbox"[\s\S]*checked=\{selectedIds\.includes\(option\.id\)\}/,
  'Options dialog rows should use real checkboxes and support multiple selection',
);

assert.match(
  searchFiltersSource,
  /onToggleOption: \(filterId: FilterSelectId, optionId: string, optionLabel: string\) => void;[\s\S]*onChange=\{\(\) =>[\s\S]*onToggleOption\(filterId, option\.id, resolveOptionLabel\(option, t\)\)/,
  'Options dialog should persist the readable option label alongside the canonical public ref id',
);

assert.match(
  searchFiltersSource,
  /import \{ ArrowDown01Icon, Cancel01Icon, CheckIcon \} from '@hugeicons\/core-free-icons';/,
  'Search filters should import Hugeicons check and cancel icons for selected states',
);

assert.match(
  searchFiltersSource,
  /<HugeiconsIcon icon=\{CheckIcon\} \/>/,
  'Options dialog selected checkbox marker should use the Hugeicons CheckIcon',
);

assert.match(
  filterOptionsSource,
  /function getSelectedFilterOptions\([\s\S]*selectedIds\.map[\s\S]*resolveOptionLabel/,
  'Search filter fields should resolve every selected option into an individual visible chip',
);

assert.match(
  searchFiltersSource,
  /onRemove=\{\(optionId\) => removeSearchFilterOptionDraft\('book', optionId\)\}/,
  'Search filter chips should remove only the clicked selected variant from the local draft',
);

assert.match(
  searchFiltersSource,
  /function SelectedFilterControl\([\s\S]*data-search-filter-select=\{filterId\}[\s\S]*selectedOptions\.length > 0[\s\S]*<button[\s\S]*aria-label=\{t\('searchFilters\.openFilterAria', \{ label \}\)\}[\s\S]*onClick=\{onOpen\}[\s\S]*data-search-filter-chip-remove/,
  'Selected filter field should expose a dedicated keyboard-accessible open button beside each remove button',
);

assert.doesNotMatch(
  searchFiltersSource,
  /data-search-filter-select=\{filterId\}[\s\S]*role="button"[\s\S]*data-search-filter-chip-remove/,
  'Selected filter controls should not nest remove buttons inside an element with button semantics',
);

assert.match(
  searchFiltersSource,
  /selectedOptions\.length > 0[\s\S]*data-search-filter-chip=\{option\.id\}[\s\S]*rounded-\[16px\][\s\S]*bg-\[#6a37c3\][\s\S]*text-\[#f8f5fc\]/,
  'Selected filter field should render Figma purple pill chips for each chosen variant',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-chip-remove=\{option\.id\}[\s\S]*event\.stopPropagation\(\);[\s\S]*onRemove\(option\.id\);[\s\S]*<HugeiconsIcon icon=\{Cancel01Icon\} size=\{14\}/,
  'Selected filter chip X should deselect that variant without opening the options popup',
);

assert.match(
  searchFiltersSource,
  /selectedOptions\.length > 0[\s\S]*:\s*\([\s\S]*searchFilters\.selectPlaceholder[\s\S]*ArrowDown01Icon/,
  'Empty filter fields should keep the Figma placeholder and dropdown arrow',
);

assert.doesNotMatch(
  searchFiltersSource,
  /getSelectionSummary\(selections\./,
  'Filter fields should not collapse selections into a single value or selected-count string',
);

assert.doesNotMatch(
  searchFiltersSource,
  /accent-\[#a585db\]/,
  'Options dialog checkbox marker should not rely on native checkbox accent styling',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-option=\{option\.id\}[\s\S]*className=\{`[^`]*shrink-0[^`]*rounded-\[8px\][^`]*border[^`]*border-\[#a585db\][^`]*bg-white[^`]*px-4/,
  'Options dialog rows should not shrink below their content height',
);

assert.match(
  searchFiltersSource,
  /filterId === 'section'[\s\S]*:[\s\S]*'h-12 items-center'/,
  'Non-section options should keep their fixed 48px centered row',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-options-list[\s\S]*overflow-y-auto[\s\S]*\[scrollbar-width:none\][\s\S]*\[&::-webkit-scrollbar\]:hidden/,
  'Options list should preserve scrolling semantics while visually hiding its scrollbar',
);

assert.match(
  searchFiltersSource,
  /filterId === 'section'[\s\S]*min-h-12 items-center py-3/,
  'Long section options should wrap with a 48px minimum row, vertical centering, and padding',
);

assert.match(
  searchFiltersSource,
  /<span\s+className=\{`min-w-0[^>]*filterId === 'section'[^>]*'flex-1 whitespace-normal break-words'[^>]*>/,
  'Long section labels should own the wrapping flex span instead of a neighboring control wrapper',
);

assert.match(
  searchFiltersSource,
  /filterId === 'section'[\s\S]*data-search-filter-chip=\{option\.id\}[\s\S]*min-h-8[\s\S]*w-full[\s\S]*whitespace-normal[\s\S]*break-words/,
  'Selected section chips should use the available width and wrap across lines',
);

assert.match(
  searchFiltersSource,
  /className=\{`search-filter-option [^`]*border-\[#a585db\][^`]*\$\{\s*selected \? 'search-filter-option-active border-\[#6a37c3\]' : ''[\s\S]*?\}`\}/,
  'Options dialog rows should use a named class while preserving the Figma stroke in their source contract',
);

assert.match(
  searchFiltersSource,
  /search-filter-checkbox-visual[^`]*rounded-\[4px\][^`]*border-\[1\.5px\][^`]*border-\[#a585db\]/,
  'Options dialog checkbox square should keep the Figma 1.5px purple stroke and 4px radius',
);

assert.doesNotMatch(
  searchFiltersSource,
  /hover:bg-\[#f8f5fc\]|hover:opacity-90/,
  'Search filter dialog should not use sticky Tailwind hover utilities on touch-sized UI',
);

assert.match(
  indexCssSource,
  /\.search-filter-option\s*\{[\s\S]*transition:[\s\S]*background-color 140ms ease[\s\S]*transform 140ms ease;/,
  'Options dialog rows should have a smooth base transition for UX polish',
);

assert.match(
  indexCssSource,
  /\.search-filter-option:active\s*\{[\s\S]*transform: scale\(0\.99\);/,
  'Options dialog rows should use press-only tap feedback instead of sticky hover on touch',
);

assert.match(
  indexCssSource,
  /\.search-filter-option\.search-filter-option-active\s*\{[\s\S]*border-color: #6a37c3;/,
  'Options dialog selected rows should use a flat active border',
);

assert.match(
  indexCssSource,
  /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*\.search-filter-option:not\(\.search-filter-option-active\):hover\s*\{[\s\S]*background-color: #f8f5fc;[\s\S]*border-color: #a585db;[\s\S]*transform: translateY\(-1px\);[\s\S]*\.search-filter-option:not\(\.search-filter-option-active\):hover \.search-filter-checkbox-visual\s*\{[\s\S]*transform: scale\(1\.04\);/,
  'Options dialog hover animation should stay flat while preserving light transform feedback',
);

assert.match(
  indexCssSource,
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.search-filter-option,[\s\S]*\.search-filter-checkbox-visual,[\s\S]*\.search-filter-action-button,[\s\S]*\.search-filter-sheet,[\s\S]*\.mobile-search-sheet\s*\{[\s\S]*transition: none;/,
  'Search filter dialog animations should respect reduced motion preferences',
);

assert.match(
  searchFiltersSource,
  /selected \? 'search-filter-checkbox-visual-active border-\[#6a37c3\] bg-\[#6a37c3\] text-white'/,
  'Options dialog selected checkbox should fill with the active purple color',
);

assert.match(
  indexCssSource,
  /\.search-filter-checkbox-visual\.search-filter-checkbox-visual-active\s*\{[\s\S]*border-color: #6a37c3;/,
  'Selected checkbox border should remain active purple',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-option=\{option\.id\}/,
  'Options dialog rows should expose a stable data hook per option',
);

assert.match(
  searchFiltersSource,
  /className="search-filter-sheet [^"]*flex[^"]*flex-col[^"]*overflow-hidden/,
  'Options dialog sheet should be a fixed-height flex column so actions stay visible',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-options-list[\s\S]*className="[^"]*flex-1[^"]*overflow-y-auto/,
  'Options dialog list should own scrolling when there are many options',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-actions[\s\S]*className="search-filter-actions [^"]*sticky[^"]*bottom-0/,
  'Options dialog save/reset actions should stay fixed at the bottom of the sheet',
);

assert.match(
  searchFiltersSource,
  /const \[isOptionsListScrolled, setIsOptionsListScrolled\] = useState\(false\);/,
  'Options dialog should start with an unscrolled list state',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-options-list[\s\S]*onScroll=\{\(event\) => setIsOptionsListScrolled\(event\.currentTarget\.scrollTop > 0\)\}/,
  'Options list should derive the scrolled state from currentTarget scrollTop',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-options-header[\s\S]*data-scrolled=\{isOptionsListScrolled\}[\s\S]*className="relative z-10[^\"]*shrink-0[^\"]*border-b border-solid border-transparent[^\"]*pb-\[31px\][^\"]*data-\[scrolled=true\]:border-\[rgb\(213_211_217\)\][\s\S]*search-filter-dialog-title/,
  'Options dialog header should reveal the canonical separator while owning the handle and title',
);

assert.doesNotMatch(
  searchFiltersSource,
  /data-search-filter-options-header[\s\S]*-mb-px/,
  'Options header should not overlap the first option row with a negative margin',
);

assert.doesNotMatch(
  searchFiltersSource,
  /data-search-filter-actions[\s\S]*data-scrolled=\{isOptionsListScrolled\}|data-search-filter-actions[\s\S]*data-\[scrolled=true\]:border-/,
  'Options footer should not own scroll-dependent separator state',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-actions[\s\S]*className="search-filter-actions [^"]*sticky[^"]*bottom-0[^"]*border-t border-\[#efeaf8\][^"]*pb-\[calc\(16px\+env\(safe-area-inset-bottom\)\)\]/,
  'Options footer should retain its original sticky safe-area action styling',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-action="save"[\s\S]*onClick=\{onClose\}[\s\S]*searchFilters\.save/,
  'Options dialog should use the injected close handler and return to the uncommitted draft',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-action="reset"[\s\S]*onClick=\{\(\) => onResetOptions\(filterId\)\}[\s\S]*searchFilters\.reset/,
  'Options dialog should expose a Reset action for the current filter',
);

assert.doesNotMatch(
  searchFiltersSource,
  /searchFilters\.done/,
  'Options dialog should no longer render the old Done action',
);

assert.match(
  searchFiltersSource,
  /const DRAG_CLOSE_THRESHOLD = 72;/,
  'Options dialog should define a clear downward drag threshold for dismissal',
);

assert.match(
  searchFiltersSource,
  /const DRAG_CLOSE_ANIMATION_MS = 180;/,
  'Options dialog should keep the swipe-away close animation duration explicit',
);

assert.doesNotMatch(
  searchFiltersSource,
  /MAX_DRAG_OFFSET/,
  'Options dialog should not clamp downward dragging halfway through the screen',
);

assert.match(
  searchFiltersSource,
  /function getDismissDragOffset\(\)[\s\S]*window\.innerHeight[\s\S]*DRAG_CLOSE_TRANSLATE_FALLBACK/,
  'Options dialog should dismiss by translating at least a full viewport height',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-dialog[\s\S]*onPointerDown=\{handleDragStart\}[\s\S]*onPointerMove=\{handleDragMove\}[\s\S]*onPointerUp=\{handleDragEnd\}[\s\S]*<button[\s\S]*searchFilters\.dragCloseAria/,
  'Options dialog sheet should be draggable from the full popup surface, not only the handle',
);

assert.match(
  searchFiltersSource,
  /import type \{[\s\S]*PointerEvent as ReactPointerEvent[\s\S]*TouchEvent as ReactTouchEvent[\s\S]*\} from 'react';/,
  'Options dialog should use explicit React touch event types for mobile swipe dismissal',
);

assert.match(
  searchFiltersSource,
  /optionsListRef[\s\S]*touchDragIntentRef[\s\S]*function handleTouchStart[\s\S]*function handleTouchMove[\s\S]*event\.preventDefault\(\)[\s\S]*function handleTouchEnd/,
  'Options dialog should own mobile touch dragging instead of relying on browser-cancelled pointer gestures',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-dialog[\s\S]*onTouchStart=\{handleTouchStart\}[\s\S]*onTouchMove=\{handleTouchMove\}[\s\S]*onTouchEnd=\{handleTouchEnd\}[\s\S]*onTouchCancel=\{handleTouchEnd\}/,
  'Options dialog sheet should wire mobile touch handlers across the full popup surface',
);

assert.match(
  searchFiltersSource,
  /data-search-filter-options-list[\s\S]*ref=\{optionsListRef\}/,
  'Options dialog should know when the inner list can scroll before stealing a downward swipe',
);

assert.match(
  searchFiltersSource,
  /dragStartYRef[\s\S]*dragOffsetRef[\s\S]*setPointerCapture[\s\S]*onPointerDown=\{handleDragStart\}[\s\S]*onPointerMove=\{handleDragMove\}[\s\S]*onPointerUp=\{handleDragEnd\}/,
  'Options dialog sheet should close via pointer drag gestures',
);

assert.match(
  searchFiltersSource,
  /style=\{\{\s*transform: dragOffset > 0 \? `translateY\(\$\{dragOffset\}px\)` : undefined,/,
  'Options dialog sheet should visually follow the downward drag',
);

assert.match(
  searchFiltersSource,
  /if \(shouldClose\) \{[\s\S]*setSheetDragOffset\(getDismissDragOffset\(\)\);[\s\S]*window\.setTimeout\(onClose, DRAG_CLOSE_ANIMATION_MS\)/,
  'Options dialog should animate fully downward before unmounting on swipe close',
);

for (const key of [
  'title',
  'entLabel',
  'entToggleLabel',
  'gradeLabel',
  'bookLabel',
  'sectionLabel',
  'selectPlaceholder',
  'selectedCount',
  'search',
  'save',
  'reset',
  'emptyOptions',
  'loadOptionsFailed',
  'toggleEntAria',
  'openFilterAria',
  'removeSelectionAria',
  'dragCloseAria',
]) {
  assert.equal(
    typeof ruLocale.searchFilters[key],
    'string',
    `RU locale should define searchFilters.${key}`,
  );
  assert.equal(
    typeof kkLocale.searchFilters[key],
    'string',
    `KK locale should define searchFilters.${key}`,
  );
}

assert.equal(ruLocale.searchFilters.bookLabel, 'Издание');
assert.equal(kkLocale.searchFilters.bookLabel, 'Басылым');
