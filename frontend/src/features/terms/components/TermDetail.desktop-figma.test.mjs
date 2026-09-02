import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const view = readFileSync(path.resolve(import.meta.dirname, 'TermDetailView.tsx'), 'utf8');
const story = readFileSync(path.resolve(import.meta.dirname, 'TermDetailView.stories.tsx'), 'utf8');
const favorite = readFileSync(path.resolve(import.meta.dirname, 'DesktopTermFavoriteButton.tsx'), 'utf8');

assert.match(view, /data-term-detail-desktop[^>]*className="(?=[^"]*hidden)(?=[^"]*md:block)(?=[^"]*px-\[64px\])(?=[^"]*py-8)[^"]*"/, 'desktop node 1388:5656 must use the 64x32 content rail');
assert.match(view, /data-term-detail-desktop-header[\s\S]*text-\[24px\][\s\S]*h-12[\s\S]*px-8/, 'desktop header must preserve the 24px title and 48px back control');
assert.match(view, /data-term-detail-desktop-grid[^>]*className="[^"]*grid-cols-\[minmax\(0,642px\)_minmax\(0,1fr\)\][^"]*gap-4/, 'desktop content must use the 642px plus flexible two-column grid');
assert.match(view, /data-term-detail-definition-card[^>]*className="[^"]*min-h-\[319px\][^"]*rounded-\[16px\][^"]*p-6/, 'definition card must match the Figma surface geometry');
assert.match(view, /Flag02Icon[\s\S]*DesktopTermFavoriteButton/, 'detail header actions must keep the Figma flag and dedicated bookmark order');
assert.doesNotMatch(view.match(/function DesktopDefinitionCard[\s\S]*?function DesktopMasteryPanel/)?.[0] ?? '', /FavoriteToggle/, 'desktop definition card must not reuse the shared favorite component');
assert.match(view, /data-term-detail-header-actions[^>]*className="[^"]*gap-4[^"]*"[\s\S]*data-term-detail-flag[^>]*className="[^"]*size-10[^"]*"/, 'desktop header actions must use two 40px controls separated by 16px');
assert.match(favorite, /data-term-detail-favorite[\s\S]*size-10[\s\S]*border-0 bg-transparent[\s\S]*Bookmark02Icon[\s\S]*size=\{24\}/, 'desktop favorite must match the transparent 40px Figma control with a 24px bookmark');
assert.match(favorite, /aria-pressed=\{favorite\}[\s\S]*aria-busy=\{pending\}[\s\S]*disabled=\{pending\}/, 'desktop favorite must preserve accessible async toggle state');
assert.match(view, /desktopBookMeta[\s\S]*desktopPageMeta[\s\S]*desktopRelatedTerms/, 'desktop copy must use the updated Figma-specific book, page, and related-term labels');
assert.match(view, /data-term-detail-source-row[\s\S]*BookOpen02Icon[\s\S]*data-term-detail-definition-nav/, 'definition card footer must contain source metadata and definition navigation');
assert.match(view, /data-term-detail-mastery[^>]*className="[^"]*rounded-\[16px\][^"]*p-6[\s\S]*w-\[74\.92%\]/, 'mastery bar must preserve the updated Figma fill independently from its 87 percent label');
assert.match(view, /data-term-detail-test-card[^>]*className="[^"]*h-\[187px\][^"]*bg-\[#6a37c3\]/, 'desktop topic-test card must match the Figma height and primary fill');
assert.match(view, /data-term-detail-related-panel[\s\S]*NotebookText[\s\S]*ArrowRight02Icon/, 'related terms must render the Figma list anatomy');
assert.match(view, /NotebookText/, 'related terms must use the exact NotebookText icon export');
assert.match(view, /data-term-detail-desktop[^>]*className="[^"]*md:ml-\[2px\]/, 'desktop subtree must include the 2px Figma x offset');
assert.match(view, /data-term-detail-definition-card[\s\S]*items-center/, 'definition header must vertically center title and actions');
assert.match(view, /data-term-detail-flag[\s\S]*strokeWidth=\{2\}/, 'flag icon must use 2px stroke');
assert.match(view, /data-term-detail-definition-nav[\s\S]*strokeWidth=\{1\.5\}/, 'desktop pager icons must use 1.5px stroke');
assert.match(view, /data-term-detail-source-row[\s\S]*strokeWidth=\{1\.5\}/, 'desktop source icon must use 1.5px stroke');
assert.match(view, /data-term-detail-test-card[\s\S]*strokeWidth=\{1\.5\}/, 'desktop test arrow must use 1.5px stroke');
assert.match(view, /data-term-detail-related-arrow[^>]*className="(?=[^"]*rounded-\[8px\])(?=[^"]*size-\[34px\])(?=[^"]*p-2)[^"]*"[\s\S]*ArrowRight02Icon/, 'related arrows must have 34px white containers');
assert.match(view, /data-term-detail-mastery[^>]*className="[^\"]*h-\[120px\]/, 'mastery panel must be fixed at 120px height');
assert.match(view, /data-term-detail-mastery-meta[^>]*className="[^\"]*mt-4/, 'mastery metadata must use 16px top margin');
assert.match(view, /data-term-detail-test-card[\s\S]*className="[^\"]*h-\[187px\][^\"]*[\s\S]*h-8/, 'desktop test CTA must be 32px tall');
assert.match(story, /name: 'Компьютер'[\s\S]*Офистік компьютер[\s\S]*Дербес компьютер[\s\S]*Жүйелік блок/, 'desktop Storybook fixture must reproduce node 1388:5656 content');

console.log('Desktop TermDetail Figma contract passed');
