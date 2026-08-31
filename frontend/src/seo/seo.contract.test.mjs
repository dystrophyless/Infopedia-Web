import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(import.meta.dirname, '..');
const frontendRoot = path.resolve(srcDir, '..');
const read = (relativePath) => readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const appSource = read('src/App.tsx');
const indexHtml = read('index.html');
const seoRuntime = read('src/seo/DocumentSeo.tsx');
const seoPolicy = read('src/seo/seoPolicy.ts');
const seoBuild = read('scripts/seo-build.mjs');
const featuredCard = read('src/features/terms/components/FeaturedTermCard.tsx');
const termDetail = read('src/pages/TermDetail.tsx');
const vercel = JSON.parse(read('vercel.json'));
const ru = JSON.parse(read('src/locales/ru/translation.json'));
const kk = JSON.parse(read('src/locales/kk/translation.json'));

const knownRoutes = [
  '/', '/login', '/register', '/forgot-password', '/reset-password',
  '/auth/google/callback', '/onboarding', '/search', '/search/filters',
  '/terms/:termRef', '/tests', '/tests/:testMode', '/practice-by-topic',
  '/analyze', '/profile', '/favorites', '/subscription',
];
const nonRootRoutes = knownRoutes.filter((route) => route !== '/');
const appRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
const rewriteSources = rewrites.map((entry) => entry.source);
const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const headerSources = headers.map((entry) => entry.source);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const eagerImports = [
  ['RootEntry', './components/RootEntry'],
  ['Layout', './components/Layout'],
  ['ProtectedRoute', './components/ProtectedRoute'],
  ['DocumentSeo', './seo/DocumentSeo'],
];
for (const [name, modulePath] of eagerImports) {
  assert.match(
    appSource,
    new RegExp(`^import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+['"]${escapeRegExp(modulePath)}['"];?$`, 'm'),
    `${name} must remain a static import`,
  );
}

const lazyPages = [
  ['Login', './pages/Login'],
  ['Register', './pages/Register'],
  ['ForgotPassword', './pages/ForgotPassword'],
  ['ResetPassword', './pages/ResetPassword'],
  ['GoogleCallback', './pages/GoogleCallback'],
  ['Onboarding', './pages/Onboarding'],
  ['TermSearch', './pages/TermSearch'],
  ['SearchFilters', './pages/SearchFilters'],
  ['TermDetail', './pages/TermDetail'],
  ['Tests', './pages/Tests'],
  ['TestQuestionPage', './pages/TestQuestionPage'],
  ['PracticeByTopicPage', './pages/PracticeByTopicPage'],
  ['Analyze', './pages/Analyze'],
  ['Profile', './pages/Profile'],
  ['Favorites', './pages/Favorites'],
  ['Subscription', './pages/Subscription'],
  ['NotFound', './pages/NotFound'],
];
for (const [name, modulePath] of lazyPages) {
  assert.match(
    appSource,
    new RegExp(
      `const\\s+${name}\\s*=\\s*lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(['"]${escapeRegExp(modulePath)}['"]\\)\\.then\\(\\s*\\(module\\)\\s*=>\\s*\\(\\{\\s*default:\\s*module\\.${name}\\s*\\}\\)\\s*\\)\\s*\\)`,
    ),
    `${name} must be loaded through a named-export lazy adapter`,
  );
  assert.doesNotMatch(
    appSource,
    new RegExp(`^import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+['"]${escapeRegExp(modulePath)}['"];?$`, 'm'),
    `${name} must not remain an eager page import`,
  );
}

assert.match(appSource, /import \{ lazy, Suspense, useEffect \} from 'react';/, 'App must import lazy and Suspense from React');
assert.match(
  appSource,
  /function RouteLoading\(\)[\s\S]*role="status"[\s\S]*t\('common\.loading'\)/,
  'Route fallback must expose the localized loading copy through a status region',
);
const protectedShellSource = appSource.slice(appSource.indexOf('function Protected'), appSource.indexOf('function Public'));
const publicShellSource = appSource.slice(appSource.indexOf('function Public'), appSource.indexOf('export default function App'));
for (const [name, shellSource] of [['Protected', protectedShellSource], ['Public', publicShellSource]]) {
  assert.match(
    shellSource,
    /<Layout>[\s\S]*<Suspense fallback=\{<RouteLoading \/>\}>[\s\S]*\{children\}[\s\S]*<\/Suspense>[\s\S]*<\/Layout>/,
    `${name} shell must keep Layout eager while suspending only page children`,
  );
}

function routeSource(pathname) {
  const pathIndex = appSource.indexOf(`path="${pathname}"`);
  assert.notEqual(pathIndex, -1, `${pathname} route must remain declared`);
  const routeStart = appSource.lastIndexOf('<Route', pathIndex);
  const nextRoute = appSource.indexOf('\n        <Route', routeStart + 1);
  return appSource.slice(routeStart, nextRoute === -1 ? appSource.length : nextRoute);
}

const standaloneRoutes = [
  ['/login', 'Login'],
  ['/register', 'Register'],
  ['/forgot-password', 'ForgotPassword'],
  ['/reset-password', 'ResetPassword'],
  ['/auth/google/callback', 'GoogleCallback'],
  ['/onboarding', 'Onboarding'],
];
for (const [pathname, name] of standaloneRoutes) {
  const source = routeSource(pathname);
  assert.match(source, new RegExp(`<Suspense fallback=\\{<RouteLoading \/>\\}>[\\s\\S]*<${name} \/>[\\s\\S]*<\\/Suspense>`), `${pathname} must have a standalone route fallback`);
  assert.doesNotMatch(source, /<Public>|<Protected>/, `${pathname} must remain outside the app Layout shells`);
}

for (const [pathname, name] of [
  ['/search', 'TermSearch'],
  ['/search/filters', 'SearchFilters'],
  ['/tests/:testMode', 'TestQuestionPage'],
  ['/practice-by-topic', 'PracticeByTopicPage'],
  ['/tests', 'Tests'],
  ['/analyze', 'Analyze'],
  ['/profile', 'Profile'],
  ['/favorites', 'Favorites'],
  ['/subscription', 'Subscription'],
]) {
  const source = routeSource(pathname);
  assert.match(source, new RegExp(`<Protected>[\\s\\S]*<${name} \/>[\\s\\S]*<\\/Protected>`), `${pathname} must remain protected and preserve its page element`);
  assert.doesNotMatch(source, /<Public>/, `${pathname} must not change to a public route`);
}
assert.match(routeSource('/'), /<Public>[\s\S]*<RootEntry \/>[\s\S]*<\/Public>/, 'Root must remain the eager public route');
assert.match(routeSource('/terms/:termRef'), /<Public>[\s\S]*<TermDetail \/>[\s\S]*<\/Public>/, 'Term detail must remain a public route');
const wildcardRoute = routeSource('*');
assert.match(wildcardRoute, /<Suspense fallback=\{<RouteLoading \/>\}>[\s\S]*<NotFound \/>[\s\S]*<\/Suspense>/, 'NotFound must have a standalone route fallback');

assert.deepEqual([...appRoutes].filter((route) => knownRoutes.includes(route)).sort(), [...knownRoutes].sort(), 'App route matrix must cover every known route');
assert.deepEqual([...rewriteSources].sort(), [...nonRootRoutes].sort(), 'Vercel rewrites must cover every non-root SPA route exactly');
assert.deepEqual([...headerSources].sort(), [...nonRootRoutes].sort(), 'Vercel headers must cover every non-root SPA route exactly');
assert.equal(rewrites.some((entry) => /\*|\(\.\*\)|:\w+\*/.test(entry.source)), false, 'Vercel must not retain a catch-all rewrite');
assert.equal(headerSources.includes('/'), false, 'Root must not receive a noindex header rule');
for (const entry of headers) {
  assert.deepEqual(entry.headers, [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }], `${entry.source} must send the exact noindex header`);
}

assert.ok(appSource.indexOf('<BrowserRouter>') < appSource.indexOf('<DocumentSeo />'), 'DocumentSeo must be mounted inside BrowserRouter');
assert.match(indexHtml, /<meta name="robots" content="noindex, nofollow" data-seo-default\s*\/>/, 'index.html must default to noindex');
assert.doesNotMatch(indexHtml, /rel=["']canonical["']|hreflang|application\/ld\+json|og:url/i, 'index.html must not own absolute SEO metadata');
assert.match(seoRuntime, /JSON\.stringify\(value\)/, 'JSON-LD must be serialized with JSON.stringify');
assert.match(seoRuntime, /data-seo-owned/, 'Runtime SEO nodes must use stable ownership selectors');

assert.match(featuredCard, /to=\{`\/terms\/\$\{term\.public_id\}`\}/, 'Featured cards must link to the term public ID');
assert.match(featuredCard, /state=\{\{ backTo: '\/', term, selectedDefinitionPublicId: definition\.public_id \}\}/, 'Featured term links must preserve matching route state');
assert.ok(termDetail.indexOf("routeAccess === 'guest-denied'") < termDetail.indexOf('getTerm(termRef)'), 'Guest denial must be evaluated before authenticated API fetch');
assert.match(termDetail, /<Navigate to="\/" replace \/>/, 'Guest-denied term routes must navigate home');

const expectedLocales = {
  ru: {
    seo: {
      defaultTitle: 'Infopedia',
      homeTitle: 'Infopedia — подготовка к ЕНТ по информатике',
      homeDescription: 'Термины и определения из 15 учебников по информатике с указанием книги, темы и страницы для подготовки к ЕНТ.',
    },
    notFound: {
      title: 'Страница не найдена',
      description: 'Похоже, такой страницы не существует.',
      homeCta: 'На главную',
    },
  },
  kk: {
    seo: {
      defaultTitle: 'Infopedia',
      homeTitle: 'Infopedia — информатикадан ҰБТ-ға дайындық',
      homeDescription: 'ҰБТ-ға дайындалуға арналған 15 информатика оқулығындағы терминдер мен анықтамалар, кітап, тақырып және бет деректерімен.',
    },
    notFound: {
      title: 'Бет табылмады',
      description: 'Мұндай бет жоқ сияқты.',
      homeCta: 'Басты бетке',
    },
  },
};
assert.deepEqual(ru.seo, expectedLocales.ru.seo, 'RU SEO copy must remain exact');
assert.deepEqual(kk.seo, expectedLocales.kk.seo, 'KK SEO copy must remain exact');
assert.deepEqual(ru.notFound, expectedLocales.ru.notFound, 'RU NotFound copy must remain exact');
assert.deepEqual(kk.notFound, expectedLocales.kk.notFound, 'KK NotFound copy must remain exact');

for (const moduleSource of [seoRuntime, seoPolicy, seoBuild]) {
  for (const forbiddenToken of ['Organization', 'SearchAction', 'og:image', 'rating', 'review']) {
    assert.doesNotMatch(moduleSource, new RegExp(forbiddenToken, 'i'), `SEO module must not invent forbidden metadata: ${forbiddenToken}`);
  }
}

console.log('seo source contract passed');
