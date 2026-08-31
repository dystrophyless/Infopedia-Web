import assert from 'node:assert/strict';
import { parseSiteOrigin, resolveSeoBuildConfig, createRobotsTxt, createSitemapXml, createSeoBuildPlugin } from './seo-build.mjs';

const assertThrows = (fn, message) => {
  assert.throws(fn, message);
};

assert.equal(parseSiteOrigin('https://example.test/', { required: true, requireHttps: true }), 'https://example.test');

for (const value of [undefined, '', 'ftp://example.test', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?q=1', 'https://example.test/?', 'https://example.test/#section', 'https://example.test/#', 'http://example.test']) {
  assertThrows(
    () => parseSiteOrigin(value, { required: true, requireHttps: true }),
    `release origin should reject ${String(value)}`,
  );
}

assert.equal(parseSiteOrigin('http://127.0.0.1:5173/', { required: false, requireHttps: false }), 'http://127.0.0.1:5173');
assert.equal(parseSiteOrigin(undefined, { required: false, requireHttps: false }), null);

assert.deepEqual(resolveSeoBuildConfig({ VERCEL_ENV: 'production', VITE_SITE_ORIGIN: 'https://example.test/' }), {
  release: true,
  siteOrigin: 'https://example.test',
});
assert.deepEqual(resolveSeoBuildConfig({ VERCEL_ENV: 'preview' }), { release: false, siteOrigin: null });
assert.deepEqual(resolveSeoBuildConfig({ SEO_RELEASE: '0', VITE_SITE_ORIGIN: 'http://127.0.0.1:5173' }), {
  release: false,
  siteOrigin: 'http://127.0.0.1:5173',
});

assert.equal(
  createRobotsTxt({ release: true, siteOrigin: 'https://example.test' }),
  'User-agent: *\nAllow: /\nSitemap: https://example.test/sitemap.xml\n',
);
assert.equal(createRobotsTxt({ release: false, siteOrigin: null }), 'User-agent: *\nDisallow: /\n');

const sitemap = createSitemapXml('https://example.test');
assert.equal((sitemap.match(/<loc>https:\/\/example\.test<\/loc>/g) ?? []).length, 0);
assert.equal((sitemap.match(/<loc>https:\/\/example\.test\/<\/loc>/g) ?? []).length, 1);
assert.doesNotMatch(sitemap, /<loc>[^<]*\/(?:terms|login|register|search)/);
assert.doesNotMatch(sitemap, /<lastmod>/);

const releasePlugin = createSeoBuildPlugin({ release: true, siteOrigin: 'https://example.test' });
assert.equal(
  releasePlugin.transformIndexHtml('<meta data-seo-default name="robots" content="noindex, nofollow" />'),
  '<meta name="robots" content="index, follow" data-seo-default />',
);
assert.equal(
  releasePlugin.transformIndexHtml('<meta name="robots" content="noindex, nofollow" />'),
  '<meta name="robots" content="noindex, nofollow" />',
);

console.log('seo-build tests passed');
