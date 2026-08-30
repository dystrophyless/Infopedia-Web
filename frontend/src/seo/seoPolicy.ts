export type SeoLanguage = 'ru' | 'kk';

export interface SeoDescriptor {
  lang: SeoLanguage;
  title: string;
  robots: 'index, follow' | 'noindex, nofollow';
  description?: string;
  canonicalUrl?: string;
  openGraph?: {
    type: 'website';
    siteName: 'Infopedia';
    title: string;
    description: string;
    url: string;
  };
  twitter?: {
    card: 'summary';
    title: string;
    description: string;
  };
  websiteJsonLd?: {
    '@context': 'https://schema.org';
    '@type': 'WebSite';
    name: 'Infopedia';
    url: string;
    inLanguage: SeoLanguage;
  };
}

export function normalizeSeoLanguage(language: string | undefined): SeoLanguage {
  return language === 'kk' ? 'kk' : 'ru';
}

export function resolveSeoDescriptor(input: {
  pathname: string;
  language: string | undefined;
  siteOrigin: string | null;
  release: boolean;
  t: (key: 'seo.homeTitle' | 'seo.homeDescription' | 'seo.defaultTitle') => string;
}): SeoDescriptor {
  const lang = normalizeSeoLanguage(input.language);
  const isIndexableRoot = input.pathname === '/' && input.release && Boolean(input.siteOrigin);
  if (!isIndexableRoot) {
    return {
      lang,
      title: input.t('seo.defaultTitle'),
      robots: 'noindex, nofollow',
    };
  }

  const title = input.t('seo.homeTitle');
  const description = input.t('seo.homeDescription');
  const canonicalUrl = `${input.siteOrigin!.replace(/\/+$/, '')}/`;
  return {
    lang,
    title,
    robots: 'index, follow',
    description,
    canonicalUrl,
    openGraph: {
      type: 'website',
      siteName: 'Infopedia',
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    websiteJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Infopedia',
      url: canonicalUrl,
      inLanguage: lang,
    },
  };
}
