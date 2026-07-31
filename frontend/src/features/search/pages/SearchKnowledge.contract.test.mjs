import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(import.meta.dirname, '../../../');
const semantic = fs.readFileSync(path.join(src, 'pages/SemanticSearch.tsx'), 'utf8');
const termCard = fs.readFileSync(path.join(src, 'features/terms/components/TermCard.tsx'), 'utf8');
const mobileTermCard = fs.readFileSync(path.join(src, 'features/terms/components/MobileSearchTermCard.tsx'), 'utf8');
const semanticCard = fs.readFileSync(path.join(src, 'features/terms/components/SemanticResultCard.tsx'), 'utf8');
const termRoute = fs.readFileSync(path.join(src, 'pages/TermSearch.tsx'), 'utf8');
const filtersRoute = fs.readFileSync(path.join(src, 'pages/SearchFilters.tsx'), 'utf8');
const detailRoute = fs.readFileSync(path.join(src, 'pages/TermDetail.tsx'), 'utf8');
const favoritesRoute = fs.readFileSync(path.join(src, 'pages/Favorites.tsx'), 'utf8');
const searchPage = fs.readFileSync(path.join(src, 'features/search/pages/TermSearchPage.tsx'), 'utf8');
const favoritesPage = fs.readFileSync(path.join(src, 'features/favorites/pages/FavoritesPage.tsx'), 'utf8');
const detailView = fs.readFileSync(path.join(src, 'features/terms/components/TermDetailView.tsx'), 'utf8');
const featured = fs.readFileSync(path.join(src, 'features/terms/components/FeaturedTermCard.tsx'), 'utf8');
const toggle = fs.readFileSync(path.join(src, 'features/favorites/components/FavoriteToggle.tsx'), 'utf8');
const choice = fs.readFileSync(path.join(src, 'features/search/components/SearchChoiceModal.tsx'), 'utf8');

assert.match(semantic, /MobilePageFrame/, 'semantic search must use the canonical responsive page frame');
assert.match(semantic, /desktopHeader:\s*\{/, 'semantic search desktop heading must be supplied by the frame');
assert.match(semantic, /<SemanticResultCard definition=\{successResult\}/, 'semantic results must use the feature card');
assert.doesNotMatch(termCard, /shadow-(?:feature|card)|hover:shadow/, 'term cards must not use decorative elevation');
assert.doesNotMatch(mobileTermCard, /shadow-(?:feature|card)|hover:shadow/, 'mobile term cards must not use decorative elevation');
assert.doesNotMatch(semanticCard, /shadow-(?:feature|card)|hover:shadow/, 'semantic result cards must not use decorative elevation');
assert.match(searchPage, /terms\/components\/TermCard/);
assert.match(searchPage, /terms\/components\/MobileSearchTermCard/);
assert.match(searchPage, /hidden flex-col gap-4 md:flex[\s\S]*<TermCard[\s\S]*hidden flex-col gap-4 max-md:[^"\n]*max-md:flex[\s\S]*<MobileSearchTermCard/, 'search must keep breakpoint-exclusive desktop and mobile card lists');
assert.match(favoritesPage, /terms\/components\/TermCard/);
assert.match(favoritesPage, /terms\/components\/MobileSearchTermCard/);
assert.match(favoritesPage, /hidden flex-col gap-4 md:flex[\s\S]*<TermCard[\s\S]*hidden flex-col gap-4 max-md:[^"\n]*max-md:flex[\s\S]*<MobileSearchTermCard/, 'favorites must keep breakpoint-exclusive desktop and mobile card lists');
assert.equal((favoritesPage.match(/<TermCard\b/g) ?? []).length, 1, 'Favorites must render one desktop TermCard branch');
assert.equal((favoritesPage.match(/<MobileSearchTermCard\b/g) ?? []).length, 1, 'Favorites must render one mobile term-card branch');
assert.doesNotMatch(detailView, /<div className="hidden">/);
assert.match(detailView, /max-md:fixed[\s\S]*md:hidden/, 'Detail test CTA must be mobile-only');
for (const [name, source] of [['search', searchPage], ['favorites', favoritesPage], ['mobile-term-card', mobileTermCard], ['detail', detailView], ['featured', featured], ['toggle', toggle], ['choice', choice]]) {
  assert.doesNotMatch(source, /shadow-(?:feature|card)|hover:shadow/, `${name} must not add decorative elevation`);
}
assert.match(termRoute, /features\/search\/pages\/TermSearchPage/);
assert.match(filtersRoute, /features\/search\/pages\/SearchFiltersPage/);
assert.match(detailRoute, /features\/terms\/components\/TermDetailView/);
assert.match(favoritesRoute, /features\/favorites\/pages\/FavoritesPage/);

console.log('Search/knowledge route and responsive card contracts passed');
