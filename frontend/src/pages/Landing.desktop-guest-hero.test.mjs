import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pagesDir = import.meta.dirname;
const srcDir = path.resolve(pagesDir, '..');

const landingSource = readFileSync(path.resolve(pagesDir, 'Landing.tsx'), 'utf8');
const ruLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/ru/translation.json'), 'utf8'),
);
const kkLocale = JSON.parse(
  readFileSync(path.resolve(srcDir, 'locales/kk/translation.json'), 'utf8'),
);

function sourceBetween(start, end) {
  const startIndex = landingSource.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = landingSource.indexOf(end, startIndex + start.length);
  return endIndex === -1 ? landingSource.slice(startIndex) : landingSource.slice(startIndex, endIndex);
}

const desktopAuthenticatedSource = sourceBetween(
  'function DesktopAuthenticatedLanding',
  'function DesktopGuestLanding',
);
const desktopGuestSource = sourceBetween('function DesktopGuestLanding', 'function DesktopGuestHero');
const desktopGuestBundleSource = sourceBetween('function DesktopGuestLanding', 'function MobileHome');
const desktopHeroSource = sourceBetween('function DesktopGuestHero', 'function DesktopGuestSections');
const desktopSectionsSource = sourceBetween('function DesktopGuestSections', 'function DesktopSourceProof');
const desktopSourceProofSource = sourceBetween('function DesktopSourceProof', 'function DesktopToolsFeature');
const desktopToolsSource = sourceBetween('function DesktopToolsFeature', 'function MobileHome');

assert.match(
  landingSource,
  /hidden md:block[\s\S]*isAuthenticated \? <DesktopAuthenticatedLanding \/> : <DesktopGuestLanding \/>/,
  'Desktop landing should split authenticated users from guest conversion landing',
);

assert.ok(desktopGuestSource, 'Landing should define a desktop guest landing');
assert.ok(desktopHeroSource, 'Landing should define a desktop guest hero');
assert.ok(desktopSectionsSource, 'Landing should define desktop guest proof sections');
assert.ok(desktopSourceProofSource, 'Landing should define a desktop source proof section');
assert.ok(desktopToolsSource, 'Landing should define a desktop tools feature section');
assert.ok(desktopAuthenticatedSource, 'Landing should keep the authenticated desktop landing fallback');

assert.match(
  desktopAuthenticatedSource,
  /<Hero \/>[\s\S]*<StatsBar \/>[\s\S]*<FeatureCard[\s\S]*id="books"/,
  'Authenticated desktop users should keep the current desktop landing branch',
);

assert.match(
  desktopGuestSource,
  /<DesktopGuestHero \/>[\s\S]*<DesktopGuestSections \/>/,
  'Desktop guest landing should compose the hero and guest proof sections',
);

assert.doesNotMatch(
  desktopGuestBundleSource,
  /<Hero \/>|<StatsBar \/>|<FeatureCard|id="books"/,
  'Desktop guest landing should not render the old desktop hero, stats, feature-card grid, or books section',
);

assert.match(
  desktopHeroSource,
  /bg-\[#efebf6\][\s\S]*landing\.mobileHeroScoreValue[\s\S]*landing\.mobileHeroScoreLabel[\s\S]*landing\.mobileHeroTitle[\s\S]*landing\.mobileHeroSubtitle/,
  'Desktop guest hero should adapt the mobile hero copy inside the lavender band',
);

assert.match(
  desktopHeroSource,
  /pb-16[\s\S]*pt-12/,
  'Desktop guest hero should sit closer to the navbar and fit the first viewport',
);

assert.match(
  desktopHeroSource,
  /gap-8/,
  'Desktop guest hero should use compact desktop rhythm between hero groups',
);

assert.match(
  desktopHeroSource,
  /text-\[190px\]/,
  'Desktop guest score should be closer to the reference scale without overflowing the first viewport',
);

assert.match(
  desktopHeroSource,
  /flex flex-col items-center gap-3[\s\S]*landing\.mobileHeroScoreValue[\s\S]*landing\.mobileHeroScoreLabel/,
  'Desktop guest score label should sit slightly farther from the score value',
);

assert.match(
  desktopHeroSource,
  /text-\[56px\]/,
  'Desktop guest headline should use compact desktop typography',
);

assert.match(
  desktopHeroSource,
  /max-w-\[820px\]/,
  'Desktop guest headline should keep a readable compact line measure',
);

assert.equal(
  ruLocale.landing.mobileHeroTitle,
  'Готовься к ЕНТ по информатике без догадок',
  'RU hero headline should preserve the original Infopedia copy',
);

assert.equal(
  ruLocale.landing.mobileHeroSubtitle,
  'Вопросы, слабые темы — в одном месте',
  'RU hero subtitle should preserve the original Infopedia copy',
);

assert.match(
  desktopHeroSource,
  /to="\/register"[\s\S]*href="#tools"/,
  'Desktop guest hero should send the primary CTA to registration and the secondary CTA to tools',
);

assert.match(
  desktopSectionsSource,
  /id="featured-terms"[\s\S]*landing\.termExamples[\s\S]*<TermCardCarousel variant="guestDesktop" \/>/,
  'Desktop guest proof sections should use enlarged desktop guest term cards',
);

assert.match(
  desktopSectionsSource,
  /className="scroll-mt-\[112px\] overflow-hidden bg-\[#efebf6\] pb-20 pt-12"/,
  'Desktop guest term examples should leave a generous gap before the source proof section',
);

assert.match(
  desktopSectionsSource,
  /<DesktopSourceProof \/>[\s\S]*<DesktopToolsFeature isAuthenticated=\{false\} \/>/,
  'Desktop guest sections should keep the order: term examples, source proof, then tools carousel',
);

assert.match(
  desktopSourceProofSource,
  /landing\.mobileSourceGuess[\s\S]*landing\.mobileSourceCite[\s\S]*landing\.mobileSourceBody/,
  'Desktop source proof should reuse the source-backed mobile proof copy',
);

assert.match(
  desktopSourceProofSource,
  /px-6[\s\S]*pb-16[\s\S]*pt-14[\s\S]*max-w-\[920px\][\s\S]*flex-col[\s\S]*items-start[\s\S]*gap-5[\s\S]*grid min-h-\[204px\][\s\S]*grid-cols-\[minmax\(0,1fr\)_10px_minmax\(220px,260px\)\]/,
  'Desktop source proof should be a smaller left-aligned plaque with an intentionally larger gap after the carousel',
);

assert.match(
  desktopSourceProofSource,
  /grid min-h-\[204px\][\s\S]*grid-cols-\[minmax\(0,1fr\)_10px_minmax\(220px,260px\)\][\s\S]*rounded-l-\[24px\] rounded-r-none[\s\S]*px-10[\s\S]*py-8[\s\S]*text-\[20px\][\s\S]*text-\[40px\][\s\S]*text-\[18px\]/,
  'Desktop source proof copy panel should be smaller than the previous desktop plaque',
);

assert.match(
  desktopSourceProofSource,
  /<div aria-hidden="true" \/>[\s\S]*w-2 self-stretch bg-\[#6a37c3\]/,
  'Desktop source proof should keep the lavender gap and render a real purple rail inside the metadata panel',
);

assert.match(
  desktopSourceProofSource,
  /rounded-l-none rounded-r-\[24px\][\s\S]*gap-4[\s\S]*py-8[\s\S]*pl-7[\s\S]*pr-8[\s\S]*size=\{22\}[\s\S]*text-\[#6a37c3\][\s\S]*text-\[20px\]/,
  'Desktop source proof metadata panel should shrink with the plaque and no longer own the CTA',
);

assert.match(
  desktopSourceProofSource,
  /<\/div>\s*<Link[\s\S]*to="\/register"[\s\S]*h-14[\s\S]*min-w-\[240px\][\s\S]*rounded-\[16px\][\s\S]*text-\[16px\][\s\S]*landing\.mobileHeroPrimaryCta/,
  'Desktop source proof CTA should sit below the plaque and align to the left edge',
);

assert.doesNotMatch(
  desktopSourceProofSource,
  /h-\[163px\]|rounded-\[54px\]|text-\[68px\]|text-\[42px\]|max-w-\[1120px\]|min-h-\[248px\]|grid-cols-\[minmax\(0,1fr\)_12px_minmax\(280px,320px\)\]|to="\/register"[\s\S]*<\/Link>[\s\S]*<\/div>[\s\S]*<\/div>[\s\S]*<\/section>/,
  'Desktop source proof should not keep the previous large plaque or place the CTA inside the metadata panel',
);

assert.match(
  desktopToolsSource,
  /id="tools"[\s\S]*landing\.mobileToolsTitle[\s\S]*landing\.mobileToolsSubtitle[\s\S]*<MobileFeatureCarousel isAuthenticated=\{isAuthenticated\} variant="desktop" \/>/,
  'Desktop tools section should render the feature carousel in desktop mode',
);

assert.match(
  desktopToolsSource,
  /pb-24[\s\S]*pt-16[\s\S]*max-w-\[980px\][\s\S]*flex-col[\s\S]*items-center[\s\S]*gap-12/,
  'Desktop tools section should center the copy above the carousel instead of using the old side-by-side grid',
);

for (const key of [
  'mobileHeroScoreValue',
  'mobileHeroScoreLabel',
  'mobileHeroTitle',
  'mobileHeroSubtitle',
  'mobileHeroPrimaryCta',
  'mobileHeroSecondaryCta',
  'termExamples',
  'mobileSourceGuess',
  'mobileSourceCite',
  'mobileSourceBody',
  'mobileSourceEdition',
  'mobileSourceTopic',
  'mobileSourcePage',
  'mobileToolsTitle',
  'mobileToolsSubtitle',
]) {
  assert.match(desktopGuestBundleSource, new RegExp(`landing\\.${key}`), `Desktop guest landing should render landing.${key}`);
  assert.ok(ruLocale.landing[key], `RU locale should define landing.${key}`);
  assert.ok(kkLocale.landing[key], `KK locale should define landing.${key}`);
}
