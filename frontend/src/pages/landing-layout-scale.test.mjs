import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const landing = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const termCard = readFileSync(path.resolve(pagesDir, '../features/terms/components/FeaturedTermCard.tsx'), 'utf8');
const termCarousel = readFileSync(path.resolve(pagesDir, '../features/terms/components/TermCardCarouselView.tsx'), 'utf8');
const ru = JSON.parse(readFileSync(path.resolve(pagesDir, '../locales/ru/translation.json'), 'utf8'));
const kk = JSON.parse(readFileSync(path.resolve(pagesDir, '../locales/kk/translation.json'), 'utf8'));
function section(name, nextName) {
  const start = landing.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should be defined`);
  const end = nextName ? landing.indexOf(`function ${nextName}`, start + 1) : landing.length;
  return landing.slice(start, end === -1 ? landing.length : end);
}

const hero = section('DesktopGuestHero', 'DesktopGuestSections');
const features = section('DesktopFeatureCards', 'DesktopSourceProof');
const sourceProof = section('DesktopSourceProof', 'DesktopEntAnalysis');
const analyze = section('DesktopEntAnalysis', 'MobileHome');

assert.match(hero, /ЕДИНЫЙ ИСТОЧНИК ДЛЯ ПОДГОТОВКИ|landing\.desktopEyebrow/);
assert.match(hero, /Знания всех книг/);
assert.match(hero, /одном приложении/);
assert.match(hero, /text-\[72px\]/);
assert.match(hero, /text-\[24px\]/);
assert.match(hero, /h-\[48px\][\s\S]*rounded-\[16px\]/);
assert.match(hero, /landingCtaTarget\('\/search', isAuthenticated\)/);
assert.match(hero, /href="#desktop-analysis"/);

assert.match(features, /Всё, что нужно для подготовки/);
assert.match(features, /h-\[493px\][\s\S]*w-\[366px\]/);
for (const asset of [
  'mobile-feature-weak-topics.png',
  'mobile-feature-tests.png',
  'mobile-feature-term.png',
  'mobile-feature-semantic.png',
]) {
  assert.match(features, new RegExp(`/${asset}`), `Desktop features should reuse ${asset}`);
}
assert.doesNotMatch(features, /desktop-landing\/feature-|figma\/desktop-landing/);
assert.match(features, /gap-\[32px\]/);
assert.match(features, /pb-\[64px\]/);

assert.match(sourceProof, /База из 5000\+ терминов/);
assert.match(sourceProof, /Не просто объясняем\.[\s\S]*Показываем источник\./);
assert.match(sourceProof, /w-\[720px\][\s\S]*w-\[400px\]/);
assert.match(sourceProof, /overflow-hidden/);
assert.match(sourceProof, /<TermCardCarousel variant="guestLanding" \/>/);
assert.match(sourceProof, /pb-\[88px\]/);
assert.match(termCard, /guestLanding[\s\S]*h-\[168px\][\s\S]*w-\[262px\]/);
assert.match(termCarousel, /guestLanding: 'gap-6 px-0'/);
assert.match(termCarousel, /variant === 'guestLanding'[\s\S]*overflow-x-auto[\s\S]*snap-x/);

assert.match(analyze, /Проанализируйте свой ЕНТ/);
assert.match(analyze, /Регистрация/);
assert.match(analyze, /Загрузите файл/);
assert.match(analyze, /Данные готовы/);
assert.match(analyze, /data-analysis-snippet="registration"/);
assert.match(analyze, /data-analysis-snippet="upload"/);
assert.match(analyze, /data-analysis-snippet="result"/);
assert.match(analyze, /desktopAnalyzeResultGrade/);
assert.match(analyze, /desktopAnalyzeResultItem4/);
assert.match(analyze, /desktopAnalyzeResultCta/);
assert.doesNotMatch(analyze, /image [123]\.png|<img/);

assert.doesNotMatch(landing, /https:\/\/www\.figma\.com\/api\/mcp\/asset|desktop-landing\/feature-/);

for (const key of [
  'desktopEyebrow',
  'desktopHeroLine1',
  'desktopHeroLine2Lead',
  'desktopHeroLine2Accent',
  'desktopHeroSubtitle',
  'desktopToolsTitleLead',
  'desktopToolsTitleAccent',
  'desktopTermsTitleLead',
  'desktopTermsTitleAccent',
  'desktopSourceTitleLead',
  'desktopSourceTitleAccent',
  'desktopSourceBody',
  'desktopTermsCta',
  'desktopSourcePanelTitle',
  'desktopAnalyzeTitleLead',
  'desktopAnalyzeTitleAccent',
  'desktopAnalyzeStep1Title',
  'desktopAnalyzeStep1Body',
  'desktopAnalyzeStep2Title',
  'desktopAnalyzeStep2Body',
  'desktopAnalyzeStep3Title',
  'desktopAnalyzeStep3Body',
  'desktopFeaturesPrevious',
  'desktopFeaturesNext',
  'desktopFeaturesCarouselRole',
  'desktopAnalyzeResultGrade',
  'desktopAnalyzeResultItem4',
  'desktopAnalyzeResultCta',
]) {
  assert.ok(ru.landing[key], `RU locale should define landing.${key}`);
  assert.ok(kk.landing[key], `KK locale should define landing.${key}`);
}

for (const locale of [ru, kk]) {
  assert.ok(locale.terms?.noFeatured, 'Featured-term empty state should be localized');
  assert.ok(locale.terms?.featuredError, 'Featured-term error state should be localized');
}

console.log('Landing desktop layout contract passed');
