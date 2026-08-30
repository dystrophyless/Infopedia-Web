import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRobotsTxt, createSitemapXml, parseSiteOrigin } from './seo-build.mjs';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || ''];
}));
const profile = args.get('profile') || 'local';
const release = profile === 'release';
const origin = args.get('origin') ? parseSiteOrigin(args.get('origin'), { required: release, requireHttps: release }) : null;
const distDir = path.resolve(import.meta.dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
assert.ok(existsSync(indexPath), `release build must emit ${indexPath}`);
const indexHtml = readFileSync(indexPath, 'utf8');
assert.match(indexHtml, new RegExp(`<meta name="robots" content="${release ? 'index, follow' : 'noindex, nofollow'}" data-seo-default\\s*/>`), 'dist index must contain the profile robots default');
assert.doesNotMatch(indexHtml, /rel=["']canonical["']|hreflang|application\/ld\+json|og:url/i, 'dist index must not carry a static canonical/social/JSON-LD tag');

const robotsPath = path.join(distDir, 'robots.txt');
assert.ok(existsSync(robotsPath), 'every build must emit robots.txt');
assert.equal(readFileSync(robotsPath, 'utf8'), createRobotsTxt({ release, siteOrigin: origin }), 'dist robots.txt must match the validated profile');

const sitemapPath = path.join(distDir, 'sitemap.xml');
if (release) {
  assert.ok(existsSync(sitemapPath), 'release builds must emit sitemap.xml');
  const sitemap = readFileSync(sitemapPath, 'utf8');
  assert.equal(sitemap, createSitemapXml(origin), 'dist sitemap.xml must contain only the release root');
  assert.equal((sitemap.match(/<loc>[^<]+<\/loc>/g) ?? []).length, 1, 'sitemap must contain exactly one URL');
  assert.doesNotMatch(sitemap, /<lastmod>/, 'sitemap must not claim a last-modified timestamp');
} else {
  assert.equal(existsSync(sitemapPath), false, 'non-release builds must not emit sitemap.xml');
}

const manifestPath = path.join(distDir, '.vite', 'manifest.json');
assert.ok(existsSync(manifestPath), 'build must emit a Vite manifest for route chunk verification');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const mainEntry = manifest['index.html'];
assert.ok(mainEntry?.isEntry, 'manifest must identify index.html as the main entry');
assert.ok(typeof mainEntry.file === 'string' && mainEntry.file.length > 0, 'main entry must expose a built JS file');
const lazyPageKeys = [
  'src/pages/Login.tsx',
  'src/pages/Register.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
  'src/pages/GoogleCallback.tsx',
  'src/pages/Onboarding.tsx',
  'src/pages/TermSearch.tsx',
  'src/pages/SearchFilters.tsx',
  'src/pages/TermDetail.tsx',
  'src/pages/Tests.tsx',
  'src/pages/TestQuestionPage.tsx',
  'src/pages/PracticeByTopicPage.tsx',
  'src/pages/Analyze.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Favorites.tsx',
  'src/pages/Subscription.tsx',
  'src/pages/NotFound.tsx',
];
const mainDynamicImports = Array.isArray(mainEntry.dynamicImports) ? mainEntry.dynamicImports : [];
const mainStaticImports = Array.isArray(mainEntry.imports) ? mainEntry.imports : [];
for (const pageKey of lazyPageKeys) {
  const pageName = path.basename(pageKey, path.extname(pageKey));
  const pageEntry = manifest[pageKey] ?? Object.values(manifest).find(
    (entry) => entry?.isDynamicEntry === true && entry.name === pageName,
  );
  assert.ok(pageEntry, `manifest must include the lazy page module ${pageKey}`);
  assert.equal(pageEntry.isDynamicEntry, true, `${pageKey} must be emitted as a dynamic entry`);
  assert.ok(typeof pageEntry.file === 'string' && pageEntry.file.length > 0, `${pageKey} must expose a dynamic chunk file`);
  const reachesPageEntry = (reference) => reference === pageKey || manifest[reference]?.file === pageEntry.file;
  assert.ok(mainDynamicImports.some(reachesPageEntry), `${pageKey} must be reachable from the main entry's dynamic imports`);
  assert.equal(mainStaticImports.some(reachesPageEntry), false, `${pageKey} must not be statically imported by the main entry`);
}

function collectHtmlFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(path.join(directory, entry.name), relativePath);
    return entry.name.endsWith('.html') ? [relativePath] : [];
  });
}
assert.deepEqual(collectHtmlFiles(distDir).sort(), ['index.html'], 'release output must not emit route-specific HTML files');

console.log(`seo dist contract passed (${profile})`);
