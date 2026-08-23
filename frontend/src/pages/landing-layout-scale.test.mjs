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
assert.match(hero, /data-desktop-content-rail[^>]*max-w-\[1152px\][^\"]*px-\[24px\][^\"]*min-\[1440px\]:max-w-\[1120px\][^\"]*min-\[1440px\]:px-0/);
assert.doesNotMatch(hero, /px-\[160px\]/);
assert.match(hero, /Знания всех книг/);
assert.match(hero, /одном приложении/);
assert.match(hero, /text-\[72px\]/);
assert.match(hero, /text-\[24px\]/);
assert.match(hero, /h-\[48px\][\s\S]*rounded-\[16px\]/);
assert.match(hero, /landingCtaTarget\('\/search', isAuthenticated\)/);
assert.match(hero, /href="#desktop-analysis"/);

assert.match(features, /Всё, что нужно для подготовки/);
assert.match(features, /data-desktop-content-rail[^>]*max-w-\[1152px\][^\"]*px-\[24px\][^\"]*min-\[1440px\]:max-w-\[1120px\][^\"]*min-\[1440px\]:px-0/);
assert.doesNotMatch(features, /px-\[160px\]/);
assert.match(features, /className="grid h-full w-full min-w-0 grid-cols-3 gap-\[32px\]"/);
assert.match(features, /h-\[493px\][\s\S]*min-w-0[\s\S]*flex-col/);
assert.doesNotMatch(features, /ref=\{featureRailRef\}|overflow-x-auto|overflow-y-hidden|w-max|snap-x|snap-mandatory|snap-start|scroll-smooth/);
assert.match(features, /rounded-\[16px\]/);
for (const asset of [
  'mobile-feature-weak-topics.png',
  'mobile-feature-tests.png',
  'mobile-feature-term.png',
]) {
  assert.match(features, new RegExp('/' + asset), 'Desktop features should reuse ' + asset);
}
assert.equal((features.match(/image: '/g) ?? []).length, 3);
assert.doesNotMatch(features, /mobile-feature-semantic\.png|ArrowLeft01Icon|ArrowRight01Icon|scrollBy|onScroll|aria-roledescription|role="region"/);
assert.doesNotMatch(landing, /ArrowLeft01Icon|ArrowRight01Icon/);
assert.doesNotMatch(features, /desktop-landing\/feature-|figma\/desktop-landing/);
assert.match(features, /gap-\[32px\]/);
assert.match(features, /pb-\[64px\]/);

assert.match(sourceProof, /База из 5000\+ терминов/);
assert.match(sourceProof, /data-desktop-content-rail[^>]*max-w-\[1152px\][^\"]*px-\[24px\][^\"]*min-\[1440px\]:max-w-\[1120px\][^\"]*min-\[1440px\]:px-0/);
assert.doesNotMatch(sourceProof, /px-\[160px\]/);
assert.match(sourceProof, /Не просто объясняем\.[\s\S]*Показываем источник\./);
assert.match(sourceProof, /w-\[720px\][\s\S]*w-\[400px\]/);
const sourceProofCardClass = sourceProof.match(/data-source-proof-card\s+className="([^"]+)"/)?.[1] ?? '';
assert.match(sourceProofCardClass, /\bw-full\b/);
assert.doesNotMatch(sourceProofCardClass, /min-\[1440px\]:w-\[1120px\]|min-\[1440px\]:-ml-2/);
assert.match(sourceProof, /overflow-hidden/);
assert.match(sourceProof, /<TermCardCarousel variant="guestLanding" \/>/);
assert.match(sourceProof, /pb-\[88px\]/);
assert.match(termCard, /guestLanding[\s\S]*h-\[168px\][\s\S]*w-\[262px\]/);
assert.match(termCarousel, /guestLanding: 'gap-6 px-0'/);
assert.match(termCarousel, /variant === 'guestLanding'[\s\S]*overflow-x-auto[\s\S]*snap-x/);

assert.match(analyze, /Проанализируйте свой ЕНТ/);
assert.match(analyze, /data-desktop-content-rail[^>]*max-w-\[1152px\][^\"]*px-\[24px\][^\"]*min-\[1440px\]:max-w-\[1120px\][^\"]*min-\[1440px\]:px-0/);
assert.doesNotMatch(analyze, /px-\[160px\]/);
assert.match(analyze, /Регистрация/);
assert.match(analyze, /Загрузите файл/);
assert.match(analyze, /Данные готовы/);
assert.match(analyze, /data-analysis-snippet="registration"/);
assert.match(analyze, /data-analysis-snippet="upload"/);
assert.match(analyze, /data-analysis-snippet="result"/);
assert.match(analyze, /data-analysis-stage className="grid gap-6 md:grid-cols-2 xl:relative xl:block xl:h-\[327px\]"/);
assert.match(analyze, /<h2[^>]*md:col-span-2[^>]*xl:absolute xl:left-0 xl:top-0/);
assert.match(analyze, /data-analysis-snippet="result" className="rounded-\[8px\] bg-white p-6 md:col-start-2 md:row-start-2 md:w-\[292px\] md:justify-self-end xl:absolute xl:left-\[803px\] xl:top-0 xl:w-\[292px\][^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100/);
assert.match(analyze, /data-analysis-snippet="registration" className="grid w-full max-w-\[284px\] gap-2 md:col-start-1 md:row-start-2 md:self-end xl:absolute xl:left-\[29px\] xl:top-\[223px\] xl:h-\[88px\] xl:w-\[284px\] xl:max-w-none[^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100/);
assert.match(analyze, /data-analysis-snippet="upload" className="flex h-44 w-full max-w-\[300px\][^"]*md:col-span-2 md:mx-auto xl:absolute xl:left-\[410px\] xl:top-\[135px\] xl:m-0 xl:h-\[176px\] xl:w-\[300px\] xl:max-w-none[^"]*transition-transform[^"]*hover:scale-\[1\.01\][^"]*motion-reduce:transition-none[^"]*motion-reduce:hover:scale-100/);
assert.match(analyze, /data-analysis-snippet="result"[\s\S]*data-analysis-snippet="registration"[\s\S]*data-analysis-snippet="upload"/);
assert.match(analyze, /<ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 xl:mt-0 xl:gap-12">[\s\S]*<li key=\{step\.number\} className="flex flex-col items-center gap-4 px-6 py-8 text-center">/);
assert.doesNotMatch(analyze, /data-analysis-steps|data-analysis-step=|data-analysis-visual|lg:grid-cols-3|lg:items-end|lg:gap-\[clamp/);
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
