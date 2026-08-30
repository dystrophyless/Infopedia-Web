import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveSeoDescriptor } from './seoPolicy';

type MetaAttributes = Record<string, string>;

const buildSiteOrigin = typeof __INFOPEDIA_SITE_ORIGIN__ === 'undefined' ? null : __INFOPEDIA_SITE_ORIGIN__;
const buildRelease = typeof __INFOPEDIA_SEO_RELEASE__ === 'undefined' ? false : __INFOPEDIA_SEO_RELEASE__;

function removeOwned(selector: string) {
  document.head.querySelectorAll(selector).forEach((node) => node.remove());
}

function upsertMeta(name: string, attributes: MetaAttributes, content: string) {
  const selector = `meta[data-seo-owned="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector) ?? document.createElement('meta');
  existing.setAttribute('data-seo-owned', name);
  Object.entries(attributes).forEach(([key, value]) => existing.setAttribute(key, value));
  existing.setAttribute('content', content);
  if (!existing.parentElement) document.head.append(existing);
  return existing;
}

function setOptionalMeta(name: string, attributes: MetaAttributes, content: string | undefined) {
  removeOwned(`meta[data-seo-owned="${name}"]`);
  if (content !== undefined) upsertMeta(name, attributes, content);
}

function setOptionalLink(name: string, href: string | undefined) {
  removeOwned(`link[data-seo-owned="${name}"]`);
  if (href === undefined) return;
  const link = document.createElement('link');
  link.setAttribute('data-seo-owned', name);
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  document.head.append(link);
}

function setOptionalJsonLd(value: object | undefined) {
  removeOwned('script[data-seo-owned="json-ld"]');
  if (value === undefined) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo-owned', 'json-ld');
  script.textContent = JSON.stringify(value);
  document.head.append(script);
}

export function DocumentSeo() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const descriptor = resolveSeoDescriptor({
      pathname: location.pathname,
      language: i18n.language,
      siteOrigin: buildSiteOrigin,
      release: buildRelease,
      t: (key) => t(key),
    });

    document.documentElement.lang = descriptor.lang;
    document.title = descriptor.title;

    const defaultRobots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"][data-seo-default]');
    const ownedRobots = document.head.querySelectorAll<HTMLMetaElement>('meta[data-seo-owned="robots"]');
    ownedRobots.forEach((node, index) => { if (index > 0) node.remove(); });
    const robots = ownedRobots[0] ?? defaultRobots ?? document.createElement('meta');
    robots.setAttribute('data-seo-owned', 'robots');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', descriptor.robots);
    if (!robots.parentElement) document.head.append(robots);

    setOptionalMeta('description', { name: 'description' }, descriptor.description);
    setOptionalLink('canonical', descriptor.canonicalUrl);

    const openGraph = descriptor.openGraph;
    setOptionalMeta('og:type', { property: 'og:type' }, openGraph?.type);
    setOptionalMeta('og:site_name', { property: 'og:site_name' }, openGraph?.siteName);
    setOptionalMeta('og:title', { property: 'og:title' }, openGraph?.title);
    setOptionalMeta('og:description', { property: 'og:description' }, openGraph?.description);
    setOptionalMeta('og:url', { property: 'og:url' }, openGraph?.url);

    const twitter = descriptor.twitter;
    setOptionalMeta('twitter:card', { name: 'twitter:card' }, twitter?.card);
    setOptionalMeta('twitter:title', { name: 'twitter:title' }, twitter?.title);
    setOptionalMeta('twitter:description', { name: 'twitter:description' }, twitter?.description);

    setOptionalJsonLd(descriptor.websiteJsonLd);
  }, [i18n.language, location.pathname, t]);

  return null;
}
