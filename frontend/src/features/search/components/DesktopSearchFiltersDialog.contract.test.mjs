import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(import.meta.dirname, 'DesktopSearchFiltersDialog.tsx'),
  'utf8',
);

assert.match(source, /<Dialog[\s\S]*overlayClassName="!items-start !justify-end !bg-\[rgba\(22,21,25,0\.25\)\] p-6"/);
assert.match(source, /id="search-filter-page-sheet"/);
assert.match(source, /h-\[600px\][\s\S]*!w-\[480px\][\s\S]*!rounded-\[16px\][\s\S]*!p-8/);
assert.match(source, /text-\[24px\] font-medium leading-none text-\[#6a37c3\]/);
assert.match(source, /w-\[416px\][\s\S]*h-12[\s\S]*rounded-\[8px\][\s\S]*border-\[#a585db\]/);
assert.match(source, /filterId === 'book'[\s\S]*top-\[276px\] h-\[176px\]/);
assert.match(source, /filterId === 'grade'[\s\S]*top-\[72px\] h-\[238px\]/);
assert.match(source, /top-\[72px\] h-\[336px\]/);
assert.match(source, /data-desktop-filter-menu=\{filterId\}/);
assert.match(source, /id=\{\`desktop-search-filter-menu-\$\{filterId\}\`\}/);
assert.match(source, /aria-label=\{label\}/);
assert.match(source, /aria-controls=\{menuId\}/);
assert.match(source, /aria-labelledby=\{labelId\}/);
assert.match(source, /id=\{labelId\}/);
assert.match(source, /aria-expanded=\{active\}/);
assert.match(source, /event\.key === 'Enter' \|\| event\.key === ' '/);
assert.match(source, /onKeyboardOpen\(event\.key === 'ArrowUp' \|\| event\.key === 'End' \? 'last' : 'first'\)/);
assert.match(source, /role="alert"[\s\S]*onClick=\{onRetry\}[\s\S]*t\('common\.retry'\)/);
assert.match(source, /catalogError && !activeMenu[\s\S]*role="alert"[\s\S]*onClick=\{onRetryCatalog\}/);
assert.match(source, /overflow-x-hidden overflow-y-auto overscroll-contain/);
assert.match(source, /\[scrollbar-width:none\] \[&::\-webkit-scrollbar\]:hidden/);
assert.match(source, /onKeyDown=\{\(event\) => \{[\s\S]*ArrowDown[\s\S]*ArrowUp[\s\S]*Home[\s\S]*End/);
assert.match(source, /target\.scrollIntoView\(\{ block: 'nearest' \}\)/);
assert.match(source, /Cancel01Icon/);
assert.match(source, /ArrowUp01Icon/);
assert.match(source, /ArrowDown01Icon/);
assert.match(source, /CheckIcon/);
assert.doesNotMatch(source, /setEntOnlyFilterActive|toggleSearchFilterOption|resetSearchFilters/);

console.log('Desktop search filters dialog source contract passed');
