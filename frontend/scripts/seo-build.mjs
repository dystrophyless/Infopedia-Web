import { URL } from 'node:url';

const DEFAULT_ORIGIN_OPTIONS = { required: false, requireHttps: false };

/**
 * Validate and normalize the public site origin used by release-only SEO assets.
 * @param {string | undefined | null} rawValue
 * @param {{ required?: boolean, requireHttps?: boolean }} [options]
 * @returns {string | null}
 */
export function parseSiteOrigin(rawValue, options = DEFAULT_ORIGIN_OPTIONS) {
  const { required = false, requireHttps = false } = options;
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) {
    if (required) throw new Error('VITE_SITE_ORIGIN is required for a production SEO release');
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid VITE_SITE_ORIGIN: ${rawValue}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('VITE_SITE_ORIGIN must use http or https');
  }
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error('VITE_SITE_ORIGIN must use https in a production SEO release');
  }
  if (!parsed.hostname || parsed.username || parsed.password) {
    throw new Error('VITE_SITE_ORIGIN must be an origin without credentials');
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash || value.includes('?') || value.includes('#')) {
    throw new Error('VITE_SITE_ORIGIN must not include a path, query, or fragment');
  }

  return parsed.origin;
}

/**
 * Resolve release state and the optional validated origin from Vite's merged env.
 * @param {Record<string, string | undefined>} env
 */
export function resolveSeoBuildConfig(env = {}) {
  const vercelProduction = env.VERCEL_ENV === 'production';
  const release = vercelProduction || env.SEO_RELEASE === '1';
  const explicitOrigin = typeof env.VITE_SITE_ORIGIN === 'string' ? env.VITE_SITE_ORIGIN.trim() : '';
  const productionHost = typeof env.VERCEL_PROJECT_PRODUCTION_URL === 'string'
    ? env.VERCEL_PROJECT_PRODUCTION_URL.trim()
    : '';
  const rawOrigin = explicitOrigin
    ? env.VITE_SITE_ORIGIN
    : vercelProduction && productionHost
      ? `https://${productionHost}`
      : undefined;

  return {
    release,
    siteOrigin: parseSiteOrigin(rawOrigin, {
      required: release,
      requireHttps: release,
    }),
  };
}

export function createRobotsTxt({ release, siteOrigin }) {
  if (!release) return 'User-agent: *\nDisallow: /\n';
  if (!siteOrigin) throw new Error('A validated site origin is required for release robots.txt');
  return `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`;
}

export function createSitemapXml(siteOrigin) {
  if (!siteOrigin) throw new Error('A validated site origin is required for sitemap.xml');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteOrigin}/</loc>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

export function createSeoBuildPlugin({ release, siteOrigin }) {
  return {
    name: 'infopedia-seo-build',
    transformIndexHtml(html) {
      const replacement = `<meta name="robots" content="${release ? 'index, follow' : 'noindex, nofollow'}" data-seo-default />`;
      const marker = /<meta(?=[^>]*\bname=["']robots["'])(?=[^>]*\bdata-seo-default\b)[^>]*>/i;
      if (!marker.test(html)) return html;
      return html.replace(marker, replacement);
    },
    generateBundle(_options, bundle) {
      // Guard against a future plugin invocation accidentally emitting duplicate
      // crawl assets when Rollup has already added one with the same name.
      if (!bundle['robots.txt']) {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: createRobotsTxt({ release, siteOrigin }) });
      }
      if (release && !bundle['sitemap.xml']) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: createSitemapXml(siteOrigin) });
      }
    },
  };
}
