import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { createServer, loadEnv } from 'vite';
import { resolveSeoBuildConfig } from './seo-build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const { release, siteOrigin } = resolveSeoBuildConfig({ ...loadEnv('production', root, ''), ...process.env });
const indexPath = path.join(dist, 'index.html');
const shell = await readFile(indexPath, 'utf8');
assert.ok(shell.includes('<div id="root"></div>'), 'Prerender requires a fresh Vite build');
assert.ok(shell.includes(`content="${release ? 'index, follow' : 'noindex, nofollow'}" data-seo-default`), 'Prerender and Vite must use the same release profile');

// Account routes must never inherit the public landing content or canonical.
const privateShell = shell
  .replace(/(<meta name="robots" content=")[^"]+/, '$1noindex, nofollow')
  .replace(/<meta name="description"[^>]*>\s*/, '')
  .replace(/<title>[^<]*<\/title>/, '<title>Infopedia</title>');
await writeFile(path.join(dist, 'spa.html'), privateShell);

if (release) {
  // Render existing guest components without a browser, credentials, API calls,
  // or sample user data. React replaces this snapshot when the app mounts.
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
  let markup;
  try {
    const { Landing } = await server.ssrLoadModule('/src/pages/Landing.tsx');
    const { Navbar } = await server.ssrLoadModule('/src/components/Navbar.tsx');
    const { default: i18n } = await server.ssrLoadModule('/src/i18n.ts');
    await i18n.changeLanguage('ru');
    markup = renderToStaticMarkup(React.createElement(StaticRouter, { location: '/' },
      React.createElement('div', { className: 'min-h-dvh flex flex-col bg-bg md:min-h-screen' },
        React.createElement(Navbar),
        React.createElement('main', { className: 'min-w-0 flex-1 w-full' }, React.createElement(Landing)),
      ),
    ));
  } finally {
    await server.close();
  }
  assert.match(markup, /<h1\b/, 'Public prerender must contain the real landing headings');
  assert.match(markup, /href="\/onboarding"/, 'Public prerender must contain working preparation links');
  assert.doesNotMatch(markup, /\b(?:landing|nav)\.[A-Za-z]+/, 'Translations must finish loading before prerender');

  // Vite SSR in development returns source URLs. Use the release manifest for
  // emitted assets, and inline small assets that Vite did not emit separately.
  const manifest = JSON.parse(await readFile(path.join(dist, '.vite', 'manifest.json'), 'utf8'));
  const assetUrls = [...new Set([...markup.matchAll(/(?:src|href)="(\/src\/assets\/[^"?]+)(?:\?[^"<>]*)?"/g)].map((match) => match[1]))];
  const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
  for (const assetUrl of assetUrls) {
    const relative = assetUrl.slice(1);
    let url = manifest[relative]?.file ? `/${manifest[relative].file}` : null;
    if (!url) {
      const assetPath = path.resolve(root, relative);
      assert.ok(assetPath.startsWith(path.join(root, 'src', 'assets') + path.sep), 'Asset must stay in the source asset directory');
      const mime = mimeTypes[path.extname(assetPath)];
      assert.ok(mime, `Unsupported prerender asset: ${relative}`);
      url = `data:${mime};base64,${(await readFile(assetPath)).toString('base64')}`;
    }
    const escaped = assetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markup = markup.replace(new RegExp(`(src|href)="${escaped}(?:\\?[^"<>]*)?"`, 'g'), `$1="${url}"`);
  }
  assert.doesNotMatch(markup, /(?:src|href)="\/src\//, 'Prerender must not expose development asset URLs');

  const { seo } = JSON.parse(await readFile(path.join(root, 'src/locales/ru/translation.json'), 'utf8'));
  const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const canonical = `${siteOrigin}/`;
  const meta = (name, value, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escape(value)}" data-seo-owned="${name}" />`;
  const head = [
    `<link rel="canonical" href="${escape(canonical)}" data-seo-owned="canonical" />`,
    meta('og:type', 'website', true), meta('og:site_name', 'Infopedia', true),
    meta('og:title', seo.homeTitle, true), meta('og:description', seo.homeDescription, true),
    meta('og:url', canonical, true), meta('twitter:card', 'summary'),
    meta('twitter:title', seo.homeTitle), meta('twitter:description', seo.homeDescription),
    `<script type="application/ld+json" data-seo-owned="json-ld">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Infopedia', url: canonical, inLanguage: 'ru',
    }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(seo.homeTitle)}</title>`)
    .replace(/<meta name="description"[^>]*>/, meta('description', seo.homeDescription))
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  await writeFile(indexPath, html);
  console.log('SEO prerender: public landing, metadata and canonical generated; private SPA shell isolated.');
} else {
  console.log('SEO prerender: non-release build remains noindex.');
}
