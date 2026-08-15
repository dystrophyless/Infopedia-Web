import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(path.join(frontendDir, relativePath), 'utf8');

const keptSvgPaths = [
  'public/figma/analyze-desktop/browser-controls.svg',
  'public/figma/onboarding/google-black-icon.svg',
  'public/logo.svg',
  'src/assets/figma-profile/ai-co-editing.svg',
  'src/assets/figma-profile/profile-1.svg',
  'src/assets/figma-subscription/timeline-today.svg',
  'src/assets/icons/profile.svg',
  'src/features/tests/figma/assets/result-score-ring.svg',
];

const removedSvgPaths = [
  'public/figma-document-attachment.svg',
  'public/figma-user-ai.svg',
  'public/figma/tests/lock-keyhole.svg',
  'public/figma/tests/target-03.svg',
  'public/figma/tests/trending-up.svg',
  'src/assets/figma-profile/languages.svg',
  'src/assets/figma-subscription/timeline-day-6.svg',
  'src/assets/figma-subscription/timeline-day-7.svg',
  'src/assets/icons/feature-analytics.svg',
  'src/assets/icons/feature-description.svg',
  'src/assets/icons/feature-search.svg',
  'src/assets/icons/stat-books.svg',
  'src/assets/icons/stat-terms.svg',
  'src/assets/icons/stat-topics.svg',
];

function collectSvgFiles(directory, relativeDirectory = '') {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.vite-build-check', 'storybook-static', 'coverage', 'test-results'].includes(entry.name)) continue;
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...collectSvgFiles(absolutePath, relativePath));
    else if (entry.isFile() && entry.name.endsWith('.svg')) found.push(relativePath);
  }
  return found;
}

function collectRuntimeSources(directory, relativeDirectory = '') {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...collectRuntimeSources(absolutePath, relativePath));
    else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|stories)\./.test(entry.name)) {
      found.push({ relativePath, source: readFileSync(absolutePath, 'utf8') });
    }
  }
  return found;
}

for (const relativePath of keptSvgPaths) {
  const absolutePath = path.join(frontendDir, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} must remain`);
  assert.ok(statSync(absolutePath).size > 0, `${relativePath} must remain non-empty`);
}
for (const relativePath of removedSvgPaths) {
  assert.ok(!existsSync(path.join(frontendDir, relativePath)), `${relativePath} must be removed`);
}

assert.deepEqual(collectSvgFiles(frontendDir).sort(), keptSvgPaths.slice().sort(), 'physical SVG inventory must contain exactly eight approved assets');

const runtimeSourceFiles = collectRuntimeSources(path.join(frontendDir, 'src'));
const inlineSvgFiles = runtimeSourceFiles.filter(({ source }) => /<svg\b/.test(source));
assert.deepEqual(inlineSvgFiles.map(({ relativePath }) => relativePath), ['features/analyze/components/AnalyzeDesktopProgress.tsx'], 'only the live Analyze progress ring may remain inline');
assert.equal((inlineSvgFiles[0].source.match(/<svg\b/g) ?? []).length, 1, 'the runtime must contain exactly one inline SVG entity');
const svgReactSources = runtimeSourceFiles.filter(({ source }) => /\.svg\?react/.test(source));
assert.deepEqual(svgReactSources.map(({ relativePath }) => relativePath), ['components/FigmaIcons.tsx'], 'only FigmaIcons may retain an SVGR query');

const analyze = read('src/features/analyze/components/AnalyzeDesktopUploadGuide.tsx');
assert.match(analyze, /UserAiIcon/);
assert.match(analyze, /icon=\{UserAiIcon\}[\s\S]*size=\{32\}[\s\S]*aria-hidden="true"/);
assert.doesNotMatch(analyze, /figma-user-ai\.svg/);

const optionCard = read('src/features/tests/components/DesktopTestOptionCard.tsx');
assert.match(optionCard, /LockKeyIcon[\s\S]*Target03Icon/);
assert.match(optionCard, /icon=\{Target03Icon\}[\s\S]*size=\{24\}/);
assert.match(optionCard, /icon=\{LockKeyIcon\}[\s\S]*size=\{24\}/);
assert.doesNotMatch(optionCard, /lock-keyhole\.svg|target-03\.svg/);

const chapterCard = read('src/features/tests/components/DesktopChapterTestCard.tsx');
assert.match(chapterCard, /ChartUpIcon/);
assert.match(chapterCard, /icon=\{ChartUpIcon\}[\s\S]*size=\{20\}/);
assert.match(chapterCard, /deltaPoints[^\n]+> 0 \? '-scale-x-100' : ''/);
assert.doesNotMatch(chapterCard, /trending-up\.svg|mask-image|MaskImage/);

const profile = read('src/pages/Profile.tsx');
assert.match(profile, /Languages as LanguagesIcon/);
assert.match(profile, /icon=\{LanguagesIcon\}[\s\S]*size=\{20\}/);
assert.doesNotMatch(profile, /languagesAsset|languages\.svg/);
assert.match(profile, /ai-co-editing\.svg/);
assert.match(profile, /profile-1\.svg/);

const subscription = read('src/pages/Subscription.tsx');
assert.match(subscription, /CreditCardIcon[\s\S]*Notification01Icon/);
assert.match(subscription, /icon=\{CreditCardIcon\}[\s\S]*size=\{14\}/);
assert.match(subscription, /icon=\{Notification01Icon\}[\s\S]*size=\{14\}/);
assert.doesNotMatch(subscription, /timelineDay6|timelineDay7|timeline-day-6\.svg|timeline-day-7\.svg/);
assert.match(subscription, /timeline-today\.svg/);
assert.match(subscription, /ai-co-editing\.svg/);

const figmaIcons = read('src/components/FigmaIcons.tsx');
assert.equal((figmaIcons.match(/\?react/g) ?? []).length, 1, 'only profile.svg may use the SVGR React query');
assert.match(figmaIcons, /^export \{ default as FigmaProfileIcon \}\s+from '\.\.\/assets\/icons\/profile\.svg\?react';\s*$/);

const runtimeMaskSources = runtimeSourceFiles.filter(({ source }) => /maskImage:|MaskImage:/.test(source));
assert.deepEqual(runtimeMaskSources.map(({ relativePath }) => relativePath).sort(), ['components/DesktopSidebar.tsx', 'pages/Profile.tsx'], 'only two approved runtime mask consumers may remain');
for (const { source } of runtimeMaskSources) {
  assert.match(source, /ai-co-editing\.svg/);
}

console.log('Custom SVG to HugeIcons contract passed');
