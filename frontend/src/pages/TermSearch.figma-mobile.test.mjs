import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');

const termSearchSource = readFileSync(path.resolve(pagesDir, 'TermSearch.tsx'), 'utf8');
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
const searchStoreSource = readFileSync(path.resolve(srcDir, 'stores/searchStore.ts'), 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

assert.match(
  termSearchSource,
  /max-md:bg-\[#efebf6\]/,
  'Term search mobile route should use the Figma pale purple page background',
);

assert.match(
  termSearchSource,
  /max-md:min-h-\[100dvh\][\s\S]*max-md:bg-\[#efebf6\]/,
  'Term search mobile route should keep the pale purple background through the full viewport',
);

assert.match(
  termSearchSource,
  /max-md:px-\[24px\][\s\S]*max-md:pt-\[max\(64px,calc\(24px\+env\(safe-area-inset-top,0px\)\)\)\]/,
  'Term search mobile route should reserve the Figma 24px rail and status-bar safe zone before content',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:px-\[22px\]/,
  'Term search browse screen should not keep the old 22px rail now that the Figma node uses 24px',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:pt-\[calc\(24px\+env\(safe-area-inset-top\)\)\]/,
  'Term search mobile route should not fall back to the old too-high 24px top padding',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*h-10 w-full rounded-\[8px\] bg-white/,
  'Typed/result search mobile input should match the compact white Figma search field',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*mt-2 mb-4 -mx-\[2px\] grid w-\[calc\(100%\+4px\)\] grid-cols-\[minmax\(0,1fr\)\][\s\S]*h-10 w-full rounded-\[8px\] bg-white/,
  'Typed/result search input should use the Figma 22px rail and 386px field inside the 24px browse shell',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*h-10 w-full rounded-\[8px\] bg-white py-2 pl-14 pr-4 text-\[16px\] leading-6 text-\[#161519\]/,
  'Typed/result search query text should use the updated dark Figma input color',
);

assert.match(
  termSearchSource,
  /function MobileSearchBrowseHeader[\s\S]*mb-8 grid grid-cols-\[minmax\(0,1fr\)_40px_40px\] gap-2[\s\S]*h-10 rounded-\[8px\] bg-white w-full/,
  'Browse search header should match the Figma 24px rail, 32px gap to pills, and white input',
);

assert.match(
  termSearchSource,
  /SEARCH_RESULT_LIMIT = 11/,
  'Typed/result search should request the updated Figma total of 11 terms',
);

assert.match(
  termSearchSource,
  /import \{[\s\S]*ArrowLeft01Icon[\s\S]*FilterHorizontalIcon[\s\S]*Search01Icon[\s\S]*\} from '@hugeicons\/core-free-icons';/,
  'Typed/result search app bar should use the Figma arrow-left icon',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultAppBar[\s\S]*h-14[\s\S]*-mx-\[24px\][\s\S]*w-\[calc\(100%\+48px\)\][\s\S]*px-4[\s\S]*ArrowLeft01Icon[\s\S]*search\.resultsTitle/,
  'Typed/result search should render the updated 56px full-width result app bar on the 24px rail',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader\(\{[\s\S]*resultCount[\s\S]*onBack[\s\S]*\}/,
  'Typed/result search header should receive result count and back behavior',
);

assert.match(
  termSearchSource,
  /<MobileSearchResultAppBar onBack=\{onBack\} \/>[\s\S]*mt-2 mb-4 -mx-\[2px\] grid w-\[calc\(100%\+4px\)\] grid-cols-\[minmax\(0,1fr\)\]/,
  'Typed/result search input should sit 8px below the app bar on the Figma 22px rail',
);

for (const mode of ['random', 'forYou', 'popular']) {
  assert.match(
    termSearchSource,
    new RegExp(`id: '${mode}'`),
    `Term search should render the ${mode} Figma search mode pill`,
  );
}

assert.match(
  termSearchSource,
  /data-search-mode-pill=\{mode\.id\}/,
  'Term search mode pills should expose a stable data hook',
);

assert.match(
  termSearchSource,
  /function MobileSearchModePills[\s\S]*overflow-x-auto[\s\S]*\[scrollbar-width:none\][\s\S]*\[\&::-webkit-scrollbar\]:hidden/,
  'Mobile search mode pills should remain horizontally scrollable without showing a browser scrollbar',
);

assert.match(
  termSearchSource,
  /function MobileSearchModePills[\s\S]*'bg-\[#ded2f1\] text-\[#a585db\]'/,
  'Inactive mobile search mode pills should use the updated Figma lavender treatment',
);

assert.match(
  termSearchSource,
  /to="\/search\/filters"[\s\S]*search\.filterAria/,
  'Term search filter control should route to the dedicated filters page',
);

assert.doesNotMatch(
  termSearchSource,
  /to="\/semantic-search"[\s\S]*search\.filterAria/,
  'Term search filter control should not route to semantic search',
);

assert.match(
  termSearchSource,
  /to="\/profile"[\s\S]*search\.favoritesAria/,
  'Term search bookmark control should route to the profile favorites area',
);

assert.match(
  termSearchSource,
  /className="rounded-\[16px\] bg-white px-6 py-8/,
  'Mobile term result cards should match the Figma rounded white card shell',
);

assert.match(
  termSearchSource,
  /className="hidden flex-col gap-4 max-md:-mx-\[2px\] max-md:flex max-md:w-\[calc\(100%\+4px\)\]"/,
  'Mobile term result cards should use the Figma 16px vertical stack gap on the 386px result rail',
);

assert.match(
  termSearchSource,
  /line-clamp-6[\s\S]*bg-gradient-to-t from-white/,
  'Mobile term cards should clamp long definitions and fade the last visible line',
);

assert.match(
  termSearchSource,
  /MOBILE_SEARCH_PAGE_SIZE = 4/,
  'Term search should initially show the four Figma result cards on mobile',
);

assert.match(
  termSearchSource,
  /search\.loadMore/,
  'Term search should expose a localized load-more control',
);

assert.match(
  termSearchSource,
  /max-md:-mx-\[2px\][^"]*max-md:w-\[calc\(100%\+4px\)\]/,
  'Mobile load-more button should match the Figma 386px centered button on a 382px rail',
);

assert.match(
  termSearchSource,
  /search\.detailsCta/,
  'Term search result cards should use the localized Figma details CTA',
);

assert.match(
  termSearchSource,
  /hasExpandedRandomResults/,
  'Term search should track when random browsing has moved into the expanded results state',
);

assert.match(
  termSearchSource,
  /const queryHasText = Boolean\(query\.trim\(\)\);[\s\S]*const searchResultViewActive = queryHasText \|\| hasExpandedRandomResults;/,
  'Term search should use the typed Figma result page after searching or expanding random results',
);

assert.match(
  termSearchSource,
  /searchResultViewActive \? <MobileSearchResultHeader[\s\S]*: <MobileSearchBrowseHeader/,
  'Term search should switch between the browse header and the typed/result header',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*grid-cols-\[minmax\(0,1fr\)\]/,
  'Typed/result search header should use the full-width Figma input',
);

assert.match(
  termSearchSource,
  /function getSearchResultFilterChips[\s\S]*search\.resultFilterSpecification[\s\S]*search\.resultFilterBook[\s\S]*search\.resultFilterGrade[\s\S]*search\.resultFilterTopic/,
  'Typed/result search header should match the full-width Figma input with ENT, book, grade, and topic filter chips',
);

assert.match(
  searchStoreSource,
  /export type SearchFilterSelectId = 'grade' \| 'book' \| 'section';[\s\S]*export type SearchFilterSelectionLabels = Record<SearchFilterSelectId, Record<string, string>>;[\s\S]*searchFilterSelections: SearchFilterSelections;[\s\S]*searchFilterSelectionLabels: SearchFilterSelectionLabels;[\s\S]*entOnlyFilterActive: boolean;/,
  'Search filter selections and labels should live in the shared search store so the result page can render selected public-ref filters after closing the filter page',
);

assert.match(
  searchStoreSource,
  /toggleSearchFilterOption: \([\s\S]*filterId: SearchFilterSelectId,[\s\S]*optionId: string,[\s\S]*optionLabel\?: string,[\s\S]*\) => void;[\s\S]*resetSearchFilters: \(\) => void;/,
  'Search store should expose shared filter mutation helpers for the filters page and result page',
);

assert.match(
  termSearchSource,
  /function getSearchResultFilterChips\([\s\S]*const usedFilters = filterChips\.filter\(\(filter\) => filter\.active\);[\s\S]*const unusedFilters = filterChips\.filter\(\(filter\) => !filter\.active\);[\s\S]*return \[filterCountChip, \.\.\.usedFilters, \.\.\.unusedFilters\];/,
  'Result-page filter chips should render the filter-count chip first, then selected/used filters before unused filters',
);

assert.match(
  termSearchSource,
  /function filterTermsBySearchFilters\([\s\S]*searchFilterSelections: SearchFilterSelections[\s\S]*terms\.filter\(\(term\) => termMatchesSearchFilters\(term, searchFilterSelections\)\)/,
  'Result-page term data should be filtered by the selected search filters before rendering cards',
);

assert.match(
  termSearchSource,
  /function definitionMatchesSearchFilters\([\s\S]*definition\.topic\?\.book[\s\S]*searchFilterSelections\.book[\s\S]*searchFilterSelections\.grade[\s\S]*searchFilterSelections\.section/,
  'Result-page filtering should inspect definition topic metadata for book, grade, and section filters',
);

assert.match(
  termSearchSource,
  /const matchesBook =[\s\S]*book\?\.public_id[\s\S]*book\?\.publisher[\s\S]*getBookFilterCandidates/,
  'Result-page book filtering should prefer book public refs while keeping fallback publisher slugs working',
);

assert.match(
  termSearchSource,
  /const matchesSection =[\s\S]*chapter\?\.public_id[\s\S]*chapter\?\.name/,
  'Result-page section filtering should match chapter public refs before falling back to chapter names',
);

assert.match(
  termSearchSource,
  /const unfilteredDisplayResults = showingSearchResults \? results : featuredTerms;[\s\S]*const displayResults = useMemo\(\s*\(\) => filterTermsBySearchFilters\(unfilteredDisplayResults, searchFilterSelections\),[\s\S]*\[unfilteredDisplayResults, searchFilterSelections\]/,
  'Term search should derive visible result data from filterTermsBySearchFilters rather than raw API results',
);

assert.match(
  termSearchSource,
  /useEffect\(\(\) => \{[\s\S]*setVisibleCount\(MOBILE_SEARCH_PAGE_SIZE\);[\s\S]*setHasExpandedRandomResults\(false\);[\s\S]*\}, \[debounced, searchFilterSelections\]\);/,
  'Changing selected filters should reset the visible mobile result slice before rendering updated results',
);

assert.match(
  termSearchSource,
  /function getSelectedResultFilterLabel\([\s\S]*selectionLabels: Record<string, string> \| undefined[\s\S]*if \(selectedIds\.length > 1\) \{[\s\S]*selectedCount: selectedIds\.length,[\s\S]*\}/,
  'Result-page multi-select filter chips should collapse one category into a label plus selected count',
);

assert.match(
  termSearchSource,
  /label:[\s\S]*selectionLabels\?\.\[selectedIds\[0\]\][\s\S]*getFallbackResultFilterOptionLabel/,
  'Result-page single-select chips should render the stored readable label for public-ref selections',
);

assert.match(
  termSearchSource,
  /searchFilterSelectionLabels,[\s\S]*getSearchResultFilterChips\(\{[\s\S]*searchFilterSelectionLabels,[\s\S]*\}\)/,
  'Result-page filter chip rendering should receive selection labels from the shared search store',
);

assert.match(
  termSearchSource,
  /data-search-result-filter-count=\{filter\.selectedCount\}[\s\S]*text-\[#f8f5fc\][\s\S]*\{filter\.label\}[\s\S]*text-\[#ded2f1\][\s\S]*\{filter\.selectedCount\}/,
  'Multi-select result filter chips should color the category label #F8F5FC and the count #DED2F1',
);

assert.match(
  termSearchSource,
  /activeFilterCount > 0[\s\S]*<span className="text-\[#ded2f1\]">\{activeFilterCount\}<\/span>/,
  'Result filter icon chip should show the active filter count in the Figma lavender number color',
);

assert.match(
  termSearchSource,
  /filter\.selectedCount && !filterIsIconOnly \?/,
  'Result filter icon chip should not render the readable filter label next to its active count',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*overflow-x-auto[\s\S]*\[scrollbar-width:none\][\s\S]*\[\&::-webkit-scrollbar\]:hidden/,
  'Typed/result search filters should stay horizontally scrollable without showing a browser scrollbar',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*-mx-\[24px\] mb-5 flex w-\[calc\(100%\+48px\)\] gap-2 overflow-x-auto px-\[22px\] pb-1 scroll-px-\[22px\]/,
  'Typed/result search filters should use a padded full-bleed scroller so the first chip is not clipped',
);

assert.doesNotMatch(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*-mx-\[2px\] mb-5 flex w-\[calc\(100%\+4px\)\] gap-2 overflow-x-auto pb-1 scroll-px-\[22px\]/,
  'Typed/result search filters should not clip the first chip at the 386px content rail',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*filter\.active \? 'bg-\[#44237d\] text-\[#f8f5fc\]' : 'bg-\[#ded2f1\] text-\[#a585db\]'/,
  'Typed/result filter chips should use the updated lavender Figma treatment',
);

assert.match(
  termSearchSource,
  /id: 'book'[\s\S]*to: '\/search\/filters\?select=book'[\s\S]*id: 'grade'[\s\S]*to: '\/search\/filters\?select=grade'/,
  'Book and grade result chips should deep-link to their corresponding filter popups',
);

assert.match(
  termSearchSource,
  /id: 'specification'[\s\S]*toggle: true[\s\S]*aria-pressed=\{filter\.active\}[\s\S]*onClick=\{filter\.onToggle\}/,
  'ENT specification chip should toggle inline instead of navigating to the filters page',
);

assert.match(
  termSearchSource,
  /filter\.id === 'filter'[\s\S]*<HugeiconsIcon icon=\{filter\.icon\} size=\{14\} strokeWidth=\{2\.3\} \/>/,
  'Result filter icon chip should use the bolder Figma stroke width',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*!filterIsIconOnly && <span>\{filter\.label\}<\/span>/,
  'Typed/result search filter labels should render at their natural chip width',
);

assert.doesNotMatch(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*max-w-\[172px\] truncate/,
  'Typed/result search filter labels should not be truncated inside the chip',
);

assert.match(
  termSearchSource,
  /onClick=\{\(\) => \{\s*if \(!showingSearchResults\) setHasExpandedRandomResults\(true\);/,
  'Random load-more should move the empty-query random tab into the result-page state',
);

assert.match(
  termSearchSource,
  /search\.resultsCount[\s\S]*count: resultCount[\s\S]*mb-4 text-\[16px\] font-normal leading-4 text-\[#6e6779\]/,
  'Typed/result search should render the Figma result count row 16px above the first card',
);

assert.match(
  termSearchSource,
  /search\.resultsCount[\s\S]*className="-mx-\[2px\] mb-4 text-\[16px\] font-normal leading-4 text-\[#6e6779\]"/,
  'Typed/result count should align to the Figma x=22 rail',
);

assert.match(
  termSearchSource,
  /function MobileSearchEmptyState\(\{[\s\S]*query[\s\S]*\}/,
  'Typed/result search should have a dedicated mobile empty-result component for the Figma zero-terms state',
);

assert.match(
  termSearchSource,
  /data-mobile-search-empty[\s\S]*max-md:mt-\[88px\][\s\S]*max-md:w-\[calc\(100%\+4px\)\]/,
  'Mobile zero-terms empty state should sit on the Figma 386px rail below the result count row',
);

assert.match(
  termSearchSource,
  /data-mobile-search-empty-icon[\s\S]*size-16[\s\S]*rounded-\[64px\][\s\S]*bg-\[#ded2f1\][\s\S]*<HugeiconsIcon icon=\{Search01Icon\} size=\{32\}/,
  'Mobile zero-terms empty state should render the Figma 64px lavender circle with a 32px search icon',
);

assert.match(
  termSearchSource,
  /function MobileSearchEmptyState[\s\S]*text-\[20px\] font-medium leading-5 text-\[#161519\][\s\S]*search\.emptyTitle/,
  'Mobile zero-terms empty state should render the Figma 20px title',
);

assert.match(
  termSearchSource,
  /function MobileSearchEmptyState[\s\S]*text-\[14px\] leading-\[14px\] text-\[#6e6779\][\s\S]*search\.emptyDescription[\s\S]*query/,
  'Mobile zero-terms empty state should render the Figma two-line query-aware description',
);

assert.match(
  termSearchSource,
  /to="\/search\/filters"[\s\S]*data-mobile-search-empty-action[\s\S]*h-10 w-full[\s\S]*rounded-\[8px\] bg-\[#6a37c3\][\s\S]*search\.emptyChangeParameters/,
  'Mobile zero-terms empty state should expose the Figma change-parameters CTA that opens filters',
);

assert.match(
  termSearchSource,
  /displayResults\.length === 0[\s\S]*<MobileSearchEmptyState query=\{debounced\.trim\(\)\} \/>/,
  'Zero search results should render the Figma mobile empty state with the current debounced query',
);

assert.match(
  termSearchSource,
  /className="hidden flex-col gap-4 max-md:-mx-\[2px\] max-md:flex max-md:w-\[calc\(100%\+4px\)\]"/,
  'Typed/result cards should render on the Figma 386px result rail',
);

assert.match(
  termSearchSource,
  /const hiddenResultsCount = Math\.max\(displayResults\.length - visibleResults\.length, 0\);/,
  'Load-more count should be based on the updated 11-result total and four visible cards',
);

assert.match(
  termSearchSource,
  /resultCount=\{displayResults\.length\}[\s\S]*onBack=\{handleMobileResultsBack\}/,
  'Typed/result search header should receive the current result total and clear back action',
);

assert.match(
  termSearchSource,
  /function handleMobileResultsBack\(\)[\s\S]*setQuery\(''\)[\s\S]*setHasExpandedRandomResults\(false\)[\s\S]*setVisibleCount\(MOBILE_SEARCH_PAGE_SIZE\)/,
  'Typed/result search back action should return to the browse search state',
);

assert.match(
  termSearchSource,
  /function MobileSearchInputSheet/,
  'Mobile search should render the Figma bottom sheet when the search input is active',
);

assert.match(
  termSearchSource,
  /import type \{[\s\S]*PointerEvent as ReactPointerEvent[\s\S]*TouchEvent as ReactTouchEvent[\s\S]*\} from 'react';/,
  'Mobile search bottom sheet should use explicit React pointer and touch event types for swipe dismissal',
);

assert.match(
  termSearchSource,
  /const DRAG_CLOSE_THRESHOLD = 72;[\s\S]*const DRAG_CLOSE_ANIMATION_MS = 180;[\s\S]*const DRAG_CLOSE_TRANSLATE_FALLBACK = 720;/,
  'Mobile search bottom sheet should share the established swipe-dismiss thresholds',
);

assert.match(
  termSearchSource,
  /function getSearchSheetDismissDragOffset\(\)[\s\S]*window\.innerHeight[\s\S]*DRAG_CLOSE_TRANSLATE_FALLBACK/,
  'Mobile search bottom sheet should dismiss by translating at least a full viewport height',
);

assert.match(
  termSearchSource,
  /function finishSearchSheetDrag\(shouldClose: boolean\)[\s\S]*setSearchSheetDragOffset\(getSearchSheetDismissDragOffset\(\)\);[\s\S]*window\.setTimeout\(onClose, DRAG_CLOSE_ANIMATION_MS\)/,
  'Mobile search bottom sheet should animate fully downward before closing',
);

assert.match(
  termSearchSource,
  /data-mobile-search-sheet[\s\S]*onPointerDown=\{handleSearchSheetDragStart\}[\s\S]*onPointerMove=\{handleSearchSheetDragMove\}[\s\S]*onPointerUp=\{handleSearchSheetDragEnd\}[\s\S]*onTouchStart=\{handleSearchSheetTouchStart\}[\s\S]*onTouchMove=\{handleSearchSheetTouchMove\}[\s\S]*onTouchEnd=\{handleSearchSheetTouchEnd\}/,
  'Mobile search bottom sheet should be draggable down from the full sheet surface',
);

assert.match(
  termSearchSource,
  /function handleSearchSheetTouchMove[\s\S]*event\.preventDefault\(\)[\s\S]*setSearchSheetDragOffset/,
  'Mobile search bottom sheet should own downward touch dragging instead of bouncing back',
);

assert.match(
  termSearchSource,
  /style=\{\{[\s\S]*transform:\s*searchSheetDragOffset > 0 \? `translateY\(\$\{searchSheetDragOffset\}px\)` : undefined,[\s\S]*transition: isSearchSheetDragging \? 'none' : undefined,/,
  'Mobile search bottom sheet should visually follow the downward drag',
);

assert.match(
  termSearchSource,
  /const \[mobileSearchSheetOpen, setMobileSearchSheetOpen\] = useState\(false\);/,
  'Term search should track whether the mobile search bottom sheet is open',
);

assert.match(
  termSearchSource,
  /onSearchInputFocus=\{\(\) => setMobileSearchSheetOpen\(true\)\}/,
  'Mobile search headers should open the bottom sheet when the input receives focus',
);

assert.match(
  termSearchSource,
  /role="dialog"[\s\S]*aria-modal="true"[\s\S]*rounded-t-\[32px\] bg-white[\s\S]*animate-\[mobile-search-sheet-in_180ms_ease-out\][\s\S]*motion-reduce:animate-none/,
  'Mobile search bottom sheet should match the active Figma sheet shell and pop in from the bottom',
);

assert.match(
  termSearchSource,
  /className="[^"]*absolute inset-x-0 bottom-0 top-\[62px\][^"]*rounded-t-\[32px\] bg-white/,
  'Mobile search bottom sheet should start at the updated Figma panel offset',
);

assert.doesNotMatch(
  termSearchSource,
  /MobileSearchInputSheet[\s\S]*top-\[calc\(8px\+env\(safe-area-inset-top\)\)\]/,
  'Mobile search bottom sheet should not keep the old too-high safe-area offset',
);

assert.doesNotMatch(
  termSearchSource,
  /MobileSearchInputSheet[\s\S]*min-h-\[534px\]/,
  'Mobile search bottom sheet should not keep the Figma fake-keyboard height when the web app uses the real keyboard',
);

assert.match(
  termSearchSource,
  /h-1 w-8 rounded-\[4px\] bg-\[#ded2f1\]/,
  'Mobile search bottom sheet should include the Figma drag handle',
);

assert.match(
  termSearchSource,
  /id="mobile-search-sheet-title"[\s\S]*text-\[#6a37c3\][\s\S]*search\.sheetTitle[\s\S]*mobile-search-sheet-field[\s\S]*h-12 w-full rounded-\[12px\] border border-\[#a585db\] bg-white[\s\S]*placeholder:text-\[#a585db\]/,
  'Mobile search bottom sheet should match the updated Figma title and focused input colors',
);

assert.match(
  indexCssSource,
  /\.mobile-search-sheet-field\s*\{[\s\S]*border-color: #a585db !important;/,
  'Mobile search bottom sheet input should preserve the Figma purple border despite the mobile border reset',
);

assert.match(
  indexCssSource,
  /@keyframes mobile-search-sheet-in[\s\S]*translateY\(100%\)[\s\S]*translateY\(0\)/,
  'Mobile search bottom sheet should define a bottom-entry animation',
);

assert.match(
  termSearchSource,
  /data-mobile-search-clear[\s\S]*text-\[#a585db\][\s\S]*<HugeiconsIcon icon=\{Cancel01Icon\} \/>/,
  'Mobile search bottom sheet clear button should use the requested default Cancel01Icon in the sheet palette',
);

assert.doesNotMatch(
  termSearchSource,
  /data-mobile-search-clear[\s\S]*<HugeiconsIcon icon=\{Cancel01Icon\} size=\{16\} strokeWidth=\{2\.2\} \/>/,
  'Mobile search bottom sheet clear icon should not keep the old small custom sizing',
);

assert.match(
  termSearchSource,
  /id="mobile-search-sheet-input"[\s\S]*type="text"[\s\S]*inputMode="search"/,
  'Mobile search bottom sheet input should avoid the native browser search cancel button',
);

assert.match(
  termSearchSource,
  /data-mobile-search-clear[\s\S]*search\.clearInput[\s\S]*onQueryChange\(''\)[\s\S]*inputRef\.current\?\.focus\(\)/,
  'Mobile search bottom sheet should render a custom clear button that clears the query and keeps focus',
);

assert.match(
  termSearchSource,
  /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\);\s*onClose\(\);/,
  'Mobile search bottom sheet should close when the mobile keyboard submits the search',
);

for (const translations of [ruLocale, kkLocale]) {
  for (const key of [
    'modeRandom',
    'modeForYou',
    'modePopular',
    'filterAria',
    'favoritesAria',
    'detailsCta',
    'loadMore',
    'resultsTitle',
    'resultsCount',
    'resultFilterSpecification',
    'resultFilterBook',
    'resultFilterGrade',
    'resultFilterTopic',
    'emptyTitle',
    'emptyDescription',
    'emptyChangeParameters',
    'sheetTitle',
    'sheetClose',
    'clearInput',
  ]) {
    assert.equal(
      typeof translations.search[key],
      'string',
      `Locale should define search.${key}`,
    );
  }
}
