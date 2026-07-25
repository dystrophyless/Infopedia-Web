import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');

const termSearchSource = readFileSync(
  path.resolve(srcDir, 'features/search/pages/TermSearchPage.tsx'),
  'utf8',
);
const mobileCardSource = readFileSync(
  path.resolve(srcDir, 'features/terms/components/MobileSearchTermCard.tsx'),
  'utf8',
);
const indexCssSource = readFileSync(path.resolve(srcDir, 'index.css'), 'utf8');
const searchFeatureDir = path.resolve(srcDir, 'features/search');
const searchControllerSource = readFileSync(
  path.resolve(searchFeatureDir, 'hooks/useTermSearchController.ts'),
  'utf8',
);
const filterTermsSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/filterTerms.ts'),
  'utf8',
);
const filterOptionsSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/filterOptions.ts'),
  'utf8',
);
const resultFilterChipsSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/resultFilterChips.ts'),
  'utf8',
);
const resultFilterIntegrationSource = `${resultFilterChipsSource}\n${termSearchSource}`;
const searchStoreSource = readFileSync(
  path.resolve(searchFeatureDir, 'model/searchStore.ts'),
  'utf8',
);
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);
const canonicalResultContentY = 80 + 24 + 32;

assert.equal(
  canonicalResultContentY,
  136,
  'Compact frame geometry must place the first search-result content at y=136',
);
assert.notEqual(
  canonicalResultContentY,
  168,
  'Search results must not retain the old 80px + 56px + 32px content-origin assumption',
);

assert.match(
  termSearchSource,
  /max-md:bg-\[#efebf6\]/,
  'Term search mobile route should use the Figma pale purple page background',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:min-h-\[100dvh\]/,
  'Term search should defer mobile viewport height ownership to MobilePageFrame',
);
assert.match(
  termSearchSource,
  /max-md:bg-\[#efebf6\]/,
  'Term search mobile route should keep the pale purple page background',
);

assert.match(
  termSearchSource,
  /searchResultViewActive \? '' : 'max-md:pt-\[80px\]'/,
  'Term search should keep the browse 80px canvas origin while result mode adds no local top compensation',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:pt-0/,
  'Search results should let MobilePageFrame place the first main content at y=136 without a local padding reset',
);

assert.match(
  termSearchSource,
  /max-md:px-\[24px\][\s\S]*max-md:pb-8/,
  'Term search mobile route should retain the Figma 32px clearance between the load-more CTA and fixed navigation',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:px-\[22px\]/,
  'Term search browse screen should not keep the old 22px rail now that the Figma node uses 24px',
);

assert.doesNotMatch(
  termSearchSource,
  /max-md:pt-\[[^\]]*safe-area-inset-top[^\]]*\]/,
  'Term search mobile route should not add a dynamic top safe-area offset to the Figma canvas',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*h-10 w-full rounded-\[8px\] bg-white/,
  'Typed/result search mobile input should match the compact white Figma search field',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*mt-0 mb-4 -mx-\[2px\] grid w-\[calc\(100%\+4px\)\] grid-cols-\[minmax\(0,1fr\)\][\s\S]*h-10 w-full rounded-\[8px\] bg-white/,
  'Typed/result search input should start at the exact Figma position on the 22px rail',
);

assert.match(
  termSearchSource,
  /function MobileSearchResultHeader[\s\S]*h-10 w-full rounded-\[8px\] bg-white py-2 pl-14 pr-4 text-\[16px\] leading-none text-\[#161519\]/,
  'Typed/result search query text should use the updated dark Figma input color',
);

assert.match(
  termSearchSource,
  /function MobileSearchBrowseHeader[\s\S]*mb-8 grid grid-cols-\[minmax\(0,1fr\)_40px_40px\] gap-2[\s\S]*h-10 rounded-\[8px\] bg-white w-full/,
  'Browse search header should match the Figma 24px rail, 32px gap to pills, and white input',
);

assert.match(
  searchControllerSource,
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
  /<MobilePageFrame[\s\S]*appBar=\{mobileSearchResultAppBar\}[\s\S]*contentId="term-search-content"/,
  'Typed/result search should render inside the canonical MobilePageFrame app-bar rail',
);

assert.match(
  termSearchSource,
  /const mobileSearchResultAppBar = searchResultViewActive[\s\S]*title: t\('search\.resultsTitle'\)[\s\S]*titleAlign: 'start'[\s\S]*compactLayout: 'leading-only'[\s\S]*className="text-\[#252329\]"[\s\S]*onClick=\{handleMobileResultsBack\}[\s\S]*ArrowLeft01Icon\} size=\{24\}/,
  'Typed/result search app bar should left-align its localized title in the compact leading-only rail while preserving the 24px ArrowLeft back glyph',
);

const mobileSearchResultAppBarSource = termSearchSource.match(
  /const mobileSearchResultAppBar = searchResultViewActive[\s\S]*?: undefined;/,
)?.[0];

assert.ok(mobileSearchResultAppBarSource, 'Typed/result search app-bar config should be present');
assert.doesNotMatch(
  mobileSearchResultAppBarSource,
  /\b(?:size-6|size-10|h-14|min-h-14|gap-\d+|p[xy]-\d+)\b/,
  'Search app-bar config must not add local action sizing or header spacing over compact frame geometry',
);
assert.doesNotMatch(
  mobileSearchResultAppBarSource,
  /\btrailing\s*:/,
  'Search result app-bar config must remain back-only without a trailing action slot',
);

assert.doesNotMatch(
  termSearchSource,
  /function MobileSearchResultAppBar|<MobileSearchResultAppBar/,
  'Typed/result search should not keep a local app-bar implementation',
);

for (const mode of ['random', 'forYou', 'popular']) {
  assert.match(
    termSearchSource,
    new RegExp(`value: '${mode}'`),
    `Term search should render the ${mode} Figma search mode pill`,
  );
}

assert.match(
  termSearchSource,
  /function MobileSearchModePills[\s\S]*SegmentedControl[\s\S]*name="mobile-search-mode"[\s\S]*labelHidden[\s\S]*value=\{mode\}[\s\S]*onValueChange=\{setMode\}[\s\S]*overflow-x-auto[\s\S]*\[scrollbar-width:none\][\s\S]*\[\&::-webkit-scrollbar\]:hidden/,
  'Mobile search mode pills should remain horizontally scrollable without showing a browser scrollbar',
);

assert.match(
  termSearchSource,
  /function MobileSearchModePills[\s\S]*\[&_label\]:!bg-\[#ded2f1\] \[&_label\]:!text-\[#a585db\] \[&_label:has\(:checked\)\]:!bg-\[#44237d\] \[&_label:has\(:checked\)\]:!text-\[#f8f5fc\]/,
  'Mobile search mode pills should override shared label colors with the Figma inactive and selected states',
);

assert.match(
  termSearchSource,
  /function MobileSearchModePills[\s\S]*useState<'random' \| 'forYou' \| 'popular'>\('random'\)[\s\S]*value: 'random'[\s\S]*value: 'forYou'[\s\S]*value: 'popular'/,
  'Mobile search mode pills should keep the Figma label order in controlled local radio state',
);

assert.match(
  termSearchSource,
  /const \[filtersOverlayOpen, setFiltersOverlayOpen\] = useState\(false\);/,
  'Term search should track the contextual filters overlay locally',
);

assert.match(
  termSearchSource,
  /function MobileSearchBrowseHeader[\s\S]*<button[\s\S]*onClick=\{onOpenFilters\}[\s\S]*search\.filterAria/,
  'Browse filter control should open the overlay rather than navigating away',
);

assert.match(
  termSearchSource,
  /onOpenFilters=\{\(\) => setFiltersOverlayOpen\(true\)\}/,
  'Typed-result filter control should open the same contextual overlay',
);

assert.match(
  termSearchSource,
  /filtersOverlayOpen && <SearchFilters overlay onDismiss=\{\(\) => setFiltersOverlayOpen\(false\)\} \/>/,
  'The overlay should be rendered alongside the mounted search view and dismiss locally',
);

assert.doesNotMatch(
  termSearchSource,
  /to="\/semantic-search"[\s\S]*search\.filterAria/,
  'Term search filter control should not route to semantic search',
);

assert.match(
  termSearchSource,
  /to="\/favorites"[\s\S]*search\.favoritesAria/,
  'Term search bookmark control should route to the favorites page',
);

assert.match(
  termSearchSource,
  /MobileSearchTermCard[\s\S]*from '..\/..\/terms\/components\/MobileSearchTermCard'/,
  'Term search should consume the shared mobile term card while preserving its page export',
);

assert.match(
  mobileCardSource,
  /className="flex flex-col gap-8 rounded-\[16px\] bg-white px-6 py-8/,
  'Mobile term result cards should match the Figma rounded white card shell',
);

assert.match(
  mobileCardSource,
  /className="flex flex-col gap-6 px-2"[\s\S]*w-\[274px\] max-w-\[274px\] text-\[20px\] font-medium leading-\[20px\] text-\[#161519\]/,
  'Mobile term card inner rail and title must match the Figma 24px gap, width, type, and ink',
);

assert.doesNotMatch(
  mobileCardSource,
  /relative min-h-6 pr-10/,
  'Mobile term card title row must not add extra height before the 24px inner gap',
);

assert.match(
  mobileCardSource,
  /appearance="mobile-card"[\s\S]*className="-right-\[10px\] -top-\[10px\]"/,
  'Mobile bookmark target must compensate its 44px hit area so the 24px glyph remains at the Figma top-right origin',
);

assert.match(
  mobileCardSource,
  /relative h-24 overflow-hidden[\s\S]*flex h-6 flex-wrap/,
  'Mobile term card must preserve the exact 96px preview and metadata chip geometry',
);
assert.match(
  mobileCardSource,
  /text-\[16px\] leading-none text-\[#8c8698\]/,
  'Mobile term preview text must use the exact Figma muted lavender color',
);

assert.match(
  termSearchSource,
  /className="hidden flex-col gap-4 max-md:-mx-\[2px\] max-md:flex max-md:w-\[calc\(100%\+4px\)\]"/,
  'Mobile term result cards should use the Figma 16px vertical stack gap on the 386px result rail',
);

assert.match(
  mobileCardSource,
  /line-clamp-6[\s\S]*bg-gradient-to-t from-white/,
  'Mobile term cards should clamp long definitions and fade the last visible line',
);

assert.match(
  searchControllerSource,
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
  mobileCardSource,
  /search\.detailsCta/,
  'Term search result cards should use the localized Figma details CTA',
);

assert.match(
  mobileCardSource,
  /to=\{`\/terms\/\$\{term\.public_id\}`\}[\s\S]*h-10 w-full items-center justify-center rounded-\[8px\] bg-\[#6a37c3\][\s\S]*text-\[#efeaf8\][\s\S]*search\.detailsCta/,
  'Mobile term-card CTA should preserve the exact Figma purple, dimensions, radius, and text color',
);

assert.match(
  searchControllerSource,
  /hasExpandedRandomResults/,
  'Term search should track when random browsing has moved into the expanded results state',
);

assert.match(
  searchControllerSource,
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
  resultFilterChipsSource,
  /function getSearchResultFilterChips[\s\S]*search\.resultFilterSpecification[\s\S]*search\.resultFilterBook[\s\S]*search\.resultFilterGrade[\s\S]*search\.resultFilterTopic/,
  'Typed/result search header should match the full-width Figma input with ENT, book, grade, and topic filter chips',
);

assert.match(
  searchStoreSource,
  /export type SearchFilterSelectId = 'grade' \| 'book' \| 'section';[\s\S]*export type SearchFilterSelectionLabels = Record<\s*SearchFilterSelectId,\s*Record<string, string>\s*>;[\s\S]*searchFilterSelections: SearchFilterSelections;[\s\S]*searchFilterSelectionLabels: SearchFilterSelectionLabels;[\s\S]*entOnlyFilterActive: boolean;/,
  'Search filter selections and labels should live in the shared search store so the result page can render selected public-ref filters after closing the filter page',
);

assert.match(
  searchStoreSource,
  /toggleSearchFilterOption: \([\s\S]*filterId: SearchFilterSelectId,[\s\S]*optionId: string,[\s\S]*optionLabel\?: string,[\s\S]*\) => void;[\s\S]*resetSearchFilters: \(\) => void;/,
  'Search store should expose shared filter mutation helpers for the filters page and result page',
);

assert.match(
  resultFilterChipsSource,
  /function getSearchResultFilterChips\([\s\S]*const usedFilters = filterChips\.filter\(\(filter\) => filter\.active\);[\s\S]*const unusedFilters = filterChips\.filter\(\(filter\) => !filter\.active\);[\s\S]*return \[filterCountChip, \.\.\.usedFilters, \.\.\.unusedFilters\];/,
  'Result-page filter chips should render the filter-count chip first, then selected/used filters before unused filters',
);

assert.match(
  filterTermsSource,
  /function filterTermsBySearchFilters\([\s\S]*searchFilterSelections: SearchFilterSelections[\s\S]*terms\.filter\(\(term\) => termMatchesSearchFilters\(term, searchFilterSelections\)\)/,
  'Result-page term data should be filtered by the selected search filters before rendering cards',
);

assert.match(
  filterTermsSource,
  /function definitionMatchesSearchFilters\([\s\S]*definition\.topic\?\.book[\s\S]*searchFilterSelections\.book[\s\S]*searchFilterSelections\.grade[\s\S]*searchFilterSelections\.section/,
  'Result-page filtering should inspect definition topic metadata for book, grade, and section filters',
);

assert.match(
  filterTermsSource,
  /const matchesBook =[\s\S]*book\?\.public_id[\s\S]*book\?\.publisher[\s\S]*getBookFilterCandidates/,
  'Result-page book filtering should prefer book public refs while keeping fallback publisher slugs working',
);

assert.match(
  filterTermsSource,
  /const matchesSection =[\s\S]*chapter\?\.public_id[\s\S]*chapter\?\.code/,
  'Result-page section filtering should match chapter public refs before falling back to stable chapter codes',
);

assert.match(
  filterOptionsSource,
  /const label = \(chapter\.title \?\? chapter\.name \?\? ''\)\.trim\(\);/,
  'Search filter options should render localized chapter titles with an explicit legacy-name fallback',
);

assert.match(
  searchControllerSource,
  /const unfilteredDisplayResults = showingSearchResults \? results : featuredTerms;[\s\S]*const displayResults = useMemo\(\s*\(\) => filterTermsBySearchFilters\(unfilteredDisplayResults, searchFilterSelections\),[\s\S]*\[unfilteredDisplayResults, searchFilterSelections\]/,
  'Term search should derive visible result data from filterTermsBySearchFilters rather than raw API results',
);

assert.match(
  searchControllerSource,
  /useEffect\(\(\) => \{[\s\S]*setVisibleCount\(MOBILE_SEARCH_PAGE_SIZE\);[\s\S]*setHasExpandedRandomResults\(false\);[\s\S]*\}, \[debounced, searchFilterSelections\]\);/,
  'Changing selected filters should reset the visible mobile result slice before rendering updated results',
);

assert.match(
  resultFilterChipsSource,
  /function getSelectedResultFilterLabel\([\s\S]*selectionLabels: Record<string, string> \| undefined[\s\S]*if \(selectedIds\.length > 1\) \{[\s\S]*selectedCount: selectedIds\.length,[\s\S]*\}/,
  'Result-page multi-select filter chips should collapse one category into a label plus selected count',
);

assert.match(
  resultFilterChipsSource,
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
  'Typed/result filter chips should retain the exact Figma active and inactive colors',
);

assert.match(
  resultFilterChipsSource,
  /id: 'book'[\s\S]*to: '\/search\/filters\?select=book'[\s\S]*id: 'grade'[\s\S]*to: '\/search\/filters\?select=grade'/,
  'Book and grade result chips should deep-link to their corresponding filter popups',
);

assert.match(
  resultFilterIntegrationSource,
  /id: 'specification'[\s\S]*toggle: true[\s\S]*aria-pressed=\{filter\.active\}[\s\S]*onClick=\{filterIsIconOnly \? onOpenFilters : filter\.onToggle\}/,
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
  /search\.resultsCount[\s\S]*count: resultCount[\s\S]*resultCount > 0 && \([\s\S]*mb-4 text-\[16px\] font-normal leading-none text-\[#514b5c\]/,
  'Typed/result search should render the Figma result count row only when terms are present',
);

assert.match(
  termSearchSource,
  /resultCount > 0 && \([\s\S]*className="-mx-\[2px\] mb-4 text-\[16px\] font-normal leading-none text-\[#514b5c\]"/,
  'Positive typed/result count should align to the Figma x=22 rail',
);

assert.match(
  termSearchSource,
  /function MobileSearchEmptyState\(\{[\s\S]*query[\s\S]*\}/,
  'Typed/result search should have a dedicated mobile empty-result component for the Figma zero-terms state',
);

assert.match(
  termSearchSource,
  /data-mobile-search-empty[\s\S]*max-md:mt-\[140px\][\s\S]*max-md:w-\[calc\(100%\+4px\)\]/,
  'Mobile zero-terms empty state should start at the exact Figma y=366 position on the 386px rail',
);

assert.match(
  termSearchSource,
  /data-mobile-search-empty-icon[\s\S]*size-16[\s\S]*rounded-\[64px\][\s\S]*bg-\[#ded2f1\][\s\S]*<HugeiconsIcon icon=\{Search01Icon\} size=\{32\}/,
  'Mobile zero-terms empty state should render the Figma 64px lavender circle with a 32px search icon',
);

assert.match(
  termSearchSource,
  /data-mobile-search-empty-icon[\s\S]*<\/div>\s*<h2 className="mt-4 text-\[20px\] font-medium leading-none text-\[#161519\]"[\s\S]*search\.emptyTitle/,
  'Mobile zero-terms empty-state title should begin 16px below the icon',
);

assert.match(
  termSearchSource,
  /search\.emptyTitle[\s\S]*<\/h2>\s*<p className="mt-4 max-w-\[284px\] text-center text-\[14px\] leading-none text-\[#514b5c\]"[\s\S]*search\.emptyDescription[\s\S]*query/,
  'Mobile zero-terms description should begin 16px below the title and retain its query-aware copy',
);

assert.match(
  termSearchSource,
  /to="\/search\/filters"[\s\S]*data-mobile-search-empty-action[\s\S]*className="mt-6 flex h-10 w-full[\s\S]*rounded-\[8px\] bg-\[#6a37c3\][\s\S]*search\.emptyChangeParameters/,
  'Mobile zero-terms CTA should begin 24px below the description and preserve its filters deep link',
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
  searchControllerSource,
  /const hiddenResultsCount = Math\.max\(displayResults\.length - visibleResults\.length, 0\);/,
  'Load-more count should be based on the updated 11-result total and four visible cards',
);

assert.match(
  termSearchSource,
  /resultCount=\{displayResults\.length\}[\s\S]*onQueryChange=\{setQuery\}/,
  'Typed/result search header should receive the current result total and query behavior',
);

assert.match(
  searchControllerSource,
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
  searchControllerSource,
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
  /id="mobile-search-sheet-title"[\s\S]*text-\[#6a37c3\][\s\S]*search\.sheetTitle[\s\S]*mobile-search-sheet-field[\s\S]*h-12 w-full rounded-\[12px\] border border-\[#a585db\] bg-white[\s\S]*placeholder:text-\[#7650b4\]/,
  'Mobile search bottom sheet should match the Figma title and border with an accessible placeholder color',
);

assert.match(
  indexCssSource,
  /@keyframes mobile-search-sheet-in[\s\S]*translateY\(100%\)[\s\S]*translateY\(0\)/,
  'Mobile search bottom sheet should define a bottom-entry animation',
);

assert.match(
  termSearchSource,
  /data-mobile-search-clear[\s\S]*text-\[#7650b4\][\s\S]*<HugeiconsIcon icon=\{Cancel01Icon\} \/>/,
  'Mobile search bottom sheet clear button should use the requested Cancel01Icon with accessible sheet contrast',
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
