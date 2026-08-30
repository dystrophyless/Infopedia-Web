import { describe, expect, it } from 'vitest';
import { normalizeSeoLanguage, resolveSeoDescriptor } from './seoPolicy';

const translations = {
  'seo.homeTitle': 'Локальный заголовок',
  'seo.homeDescription': 'Локальное описание',
  'seo.defaultTitle': 'Локальный default',
} as const;

const t = (key: keyof typeof translations) => translations[key];

describe('normalizeSeoLanguage', () => {
  it('keeps kk and falls back to ru for unsupported values', () => {
    expect(normalizeSeoLanguage('kk')).toBe('kk');
    expect(normalizeSeoLanguage('ru')).toBe('ru');
    expect(normalizeSeoLanguage('en')).toBe('ru');
    expect(normalizeSeoLanguage(undefined)).toBe('ru');
  });
});

describe('resolveSeoDescriptor', () => {
  it('makes only the release root indexable and canonical', () => {
    const descriptor = resolveSeoDescriptor({
      pathname: '/',
      language: 'kk',
      siteOrigin: 'https://example.test',
      release: true,
      t,
    });

    expect(descriptor).toMatchObject({
      lang: 'kk',
      title: 'Локальный заголовок',
      robots: 'index, follow',
      description: 'Локальное описание',
      canonicalUrl: 'https://example.test/',
      openGraph: {
        type: 'website',
        siteName: 'Infopedia',
        title: 'Локальный заголовок',
        description: 'Локальное описание',
        url: 'https://example.test/',
      },
      twitter: {
        card: 'summary',
        title: 'Локальный заголовок',
        description: 'Локальное описание',
      },
    });
    expect(descriptor.websiteJsonLd).toBeDefined();
    expect(Object.keys(descriptor.websiteJsonLd ?? {}).sort()).toEqual([
      '@context', '@type', 'inLanguage', 'name', 'url',
    ].sort());
    expect(JSON.stringify(descriptor.websiteJsonLd)).not.toMatch(/Organization|SearchAction|rating|review|term/i);
  });

  it('keeps preview root safe-noindex without absolute metadata', () => {
    const descriptor = resolveSeoDescriptor({
      pathname: '/',
      language: 'ru',
      siteOrigin: null,
      release: false,
      t,
    });
    expect(descriptor).toEqual({
      lang: 'ru',
      title: 'Локальный default',
      robots: 'noindex, nofollow',
    });
  });

  it.each([
    '/terms/abc', '/login', '/register', '/forgot-password', '/reset-password',
    '/auth/google/callback', '/onboarding', '/search', '/search/filters',
    '/tests', '/tests/default', '/practice-by-topic', '/analyze', '/profile',
    '/favorites', '/subscription', '/unknown',
  ])('keeps %s noindex and free of canonical/social/JSON-LD metadata', (pathname) => {
    const descriptor = resolveSeoDescriptor({
      pathname,
      language: 'kk',
      siteOrigin: 'https://example.test',
      release: true,
      t,
    });
    expect(descriptor.lang).toBe('kk');
    expect(descriptor.title).toBe('Локальный default');
    expect(descriptor.robots).toBe('noindex, nofollow');
    expect(descriptor.canonicalUrl).toBeUndefined();
    expect(descriptor.description).toBeUndefined();
    expect(descriptor.openGraph).toBeUndefined();
    expect(descriptor.twitter).toBeUndefined();
    expect(descriptor.websiteJsonLd).toBeUndefined();
  });

  it('uses pathname only and always terminates the root canonical with a slash', () => {
    expect(resolveSeoDescriptor({ pathname: '/', language: 'ru', siteOrigin: 'https://example.test', release: true, t }).canonicalUrl)
      .toBe('https://example.test/');
  });
});
