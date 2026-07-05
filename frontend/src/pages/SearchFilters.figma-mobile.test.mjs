import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');
const rootDir = path.resolve(srcDir, '..');

const appSource = readFileSync(path.resolve(srcDir, 'App.tsx'), 'utf8');
const termSearchSource = readFileSync(path.resolve(pagesDir, 'TermSearch.tsx'), 'utf8');
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
const searchStoreSource = readFileSync(path.resolve(srcDir, 'stores/searchStore.ts'), 'utf8');
const searchFiltersPath = path.resolve(pagesDir, 'SearchFilters.tsx');
const searchFiltersSource = existsSync(searchFiltersPath)
  ? readFileSync(searchFiltersPath, 'utf8')
  : '';
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

assert.ok(searchFiltersSource, 'Search filters page component should exist');

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

assert.match(
  termSearchSource,
  /to="\/search\/filters"[\s\S]*search\.filterAria/,
  'Term search filter button should route to the dedicated filters page',
);

assert.doesNotMatch(
  termSearchSource,
  /to="\/semantic-search"[\s\S]*search\.filterAria/,
  'Term search filter button should not open semantic search',
);

assert.match(
  searchFiltersSource,
  /export function SearchFilters\(\)/,
  'Search filters page should export SearchFilters',
);

assert.match(
  searchFiltersSource,
  /import \{ useNavigate, useSearchParams \} from 'react-router-dom';/,
  'Search filters page should read popup deep links and close its route-level sheet back to search',
);

assert.match(
  searchFiltersSource,
  /import \{ useSearchStore \} from '\.\.\/stores\/searchStore';/,
  'Search filters page should use the shared search store for persistent selected filters',
);

assert.match(
  searchFiltersSource,
  /const \{[\s\S]*entOnlyFilterActive: entOnly,[\s\S]*searchFilterSelections: selections,[\s\S]*setEntOnlyFilterActive,[\s\S]*toggleSearchFilterOption,[\s\S]*removeSearchFilterOption,[\s\S]*resetSearchFilterOptions,[\s\S]*resetSearchFilters,[\s\S]*\} = useSearchStore\(\);/,
  'Search filters page should read and mutate filter state through the shared search store',
);

assert.match(
  searchStoreSource,
  /const INITIAL_SEARCH_FILTER_SELECTIONS: SearchFilterSelections = \{[\s\S]*grade: \[\],[\s\S]*book: \[\],[\s\S]*section: \[\],[\s\S]*\};/,
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
  searchFiltersSource,
  /const quickSelectFilter = isFilterSelectId\(requestedFilter\) \? requestedFilter : null;/,
  'Search filters page should distinguish a result-chip quick filter from the regular all-filters page',
);

assert.match(
  searchFiltersSource,
  /function isFilterSelectId\(value: string \| null\): value is FilterSelectId[\s\S]*value === 'grade'[\s\S]*value === 'book'[\s\S]*value === 'section'/,
  'Search filters page should only accept known popup deep-link values',
);

assert.match(
  searchFiltersSource,
  /useEffect\(\(\) => \{[\s\S]*if \(isFilterSelectId\(requestedFilter\)\) \{[\s\S]*setActiveFilter\(requestedFilter\);[\s\S]*\}[\s\S]*\}, \[requestedFilter\]\);/,
  'Search filters page should open the corresponding options popup from /search/filters?select=...',
);

assert.match(
  searchFiltersSource,
  /function closeActiveFilterDialog\(\) \{[\s\S]*if \(quickSelectFilter\) \{[\s\S]*closeFiltersPage\(\);[\s\S]*return;[\s\S]*\}[\s\S]*setActiveFilter\(null\);[\s\S]*\}/,
  'Saving a result-chip quick filter should return directly to the search results instead of the all-filters page',
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
  indexCssSource,
  /\.search-filter-control\s*\{[\s\S]*border-color: #a585db !important;/,
  'Search filters controls should preserve the Figma purple border despite the mobile border reset',
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
  searchFiltersSource,
  /type FilterSelectId = 'grade' \| 'book' \| 'section';/,
  'Search filters should model the three selectable fields explicitly',
);

assert.match(
  searchFiltersSource,
  /const SEARCH_FILTER_GRADES[\s\S]*'7'[\s\S]*'8'[\s\S]*'9'[\s\S]*'10'[\s\S]*'11'/,
  'Grade popup should keep the Figma grade options from 7 through 11',
);

assert.match(
  searchFiltersSource,
  /getTopicBooks[\s\S]*mapBookOptions\(books, t\)/,
  'Book popup should derive visible book names from the catalog API response',
);

assert.match(
  searchFiltersSource,
  /function mapBookOptions\(books: BookCatalogItem\[\], t: TFunction\)[\s\S]*id: book\.public_id[\s\S]*metadata\.bookWithGrade/,
  'Book popup options should keep book public refs as canonical ids while rendering readable labels',
);

assert.match(
  searchFiltersSource,
  /getTopicChapters[\s\S]*setChapterOptions/,
  'Chapter popup should derive visible chapter names from the catalog API response',
);

assert.match(
  searchFiltersSource,
  /function mapChapterOptions\(chapters: ChapterCatalogItem\[\]\)[\s\S]*id: chapter\.public_id[\s\S]*label: chapter\.name\.trim\(\)/,
  'Chapter popup options should keep chapter public refs as canonical ids while rendering chapter names',
);

assert.match(
  searchFiltersSource,
  /activeFilter[\s\S]*<SearchFilterOptionsDialog[\s\S]*onToggleOption=\{toggleSearchFilterOption\}/,
  'Clicking a filter select should open the reusable Figma-style options dialog',
);

assert.match(
  searchFiltersSource,
  /function resetFiltersPage\(\) \{[\s\S]*resetSearchFilters\(\);[\s\S]*setActiveFilter\(null\);[\s\S]*\}/,
  'Search filters page reset action should restore shared ENT and selectable filter state',
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
  /data-search-filter-page-action="search"[\s\S]*onClick=\{closeFiltersPage\}[\s\S]*searchFilters\.search/,
  'Main search filters sheet should expose a Search action that returns to search',
);

assert.match(
  searchFiltersSource,
  /onResetOptions=\{resetSearchFilterOptions\}/,
  'Options dialog should receive a reset handler for the active filter',
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
  searchFiltersSource,
  /function getSelectedFilterOptions\([\s\S]*selectedIds\.map[\s\S]*resolveOptionLabel/,
  'Search filter fields should resolve every selected option into an individual visible chip',
);

assert.match(
  searchFiltersSource,
  /onRemove=\{\(optionId\) => removeSearchFilterOption\('book', optionId\)\}/,
  'Search filter chips should remove only the clicked selected variant through the shared store',
);

assert.match(
  searchFiltersSource,
  /function SelectedFilterControl\([\s\S]*data-search-filter-select=\{filterId\}[\s\S]*role="button"[\s\S]*tabIndex=\{0\}[\s\S]*onClick=\{onOpen\}/,
  'Selected filter field should keep the whole control area clickable to reopen the options popup',
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
  /data-search-filter-option=\{option\.id\}[\s\S]*className=\{`[^`]*h-12[^`]*rounded-\[8px\][^`]*border[^`]*border-\[#a585db\][^`]*bg-white[^`]*px-4/,
  'Options dialog rows should keep the Figma 48px rounded purple stroke',
);

assert.match(
  searchFiltersSource,
  /className=\{`search-filter-option [^`]*border-\[#a585db\][^`]*\$\{\s*selected \? 'search-filter-option-active border-\[#6a37c3\]' : ''[\s\S]*?\}`\}/,
  'Options dialog rows should use a named class so the mobile border reset cannot hide the Figma stroke',
);

assert.match(
  searchFiltersSource,
  /search-filter-checkbox-visual[^`]*rounded-\[4px\][^`]*border-\[1\.5px\][^`]*border-\[#a585db\]/,
  'Options dialog checkbox square should keep the Figma 1.5px purple stroke and 4px radius',
);

assert.match(
  indexCssSource,
  /\.search-filter-option,\s*[\r\n]+\s*\.search-filter-checkbox-visual\s*\{[\s\S]*border-color: #a585db !important;/,
  'Mobile CSS should exempt popup option rows and checkbox squares from the global transparent border reset',
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
  /\.search-filter-option\.search-filter-option-active\s*\{[\s\S]*border-color: #6a37c3 !important;[\s\S]*box-shadow: inset 0 0 0 1px #6a37c3;/,
  'Options dialog selected rows should thicken the border inward so the scroll container cannot clip the active stroke',
);

assert.match(
  indexCssSource,
  /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*\.search-filter-option:not\(\.search-filter-option-active\):hover\s*\{[\s\S]*background-color: #f8f5fc;[\s\S]*border-color: #a585db !important;[\s\S]*transform: translateY\(-1px\);[\s\S]*\.search-filter-option:not\(\.search-filter-option-active\):hover \.search-filter-checkbox-visual\s*\{[\s\S]*box-shadow: 0 0 0 1px #a585db;[\s\S]*transform: scale\(1\.04\);/,
  'Options dialog hover animation should stay lighter than the selected active state',
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
  /\.search-filter-checkbox-visual\.search-filter-checkbox-visual-active\s*\{[\s\S]*border-color: #6a37c3 !important;/,
  'Selected checkbox border should override the mobile border reset with active purple',
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
  /data-search-filter-action="save"[\s\S]*onClick=\{onClose\}[\s\S]*searchFilters\.save/,
  'Options dialog should use the injected close handler so quick filters can return straight to results',
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
