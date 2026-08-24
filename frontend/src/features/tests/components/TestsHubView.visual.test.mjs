import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { classifyRasterRegion } from './TestsHubView.visual.mjs';

const runner = fs.readFileSync(path.join(import.meta.dirname, 'TestsHubView.visual.mjs'), 'utf8');
const story = fs.readFileSync(path.join(import.meta.dirname, 'TestsHubView.stories.tsx'), 'utf8');
const desktop = fs.readFileSync(path.join(import.meta.dirname, 'DesktopTestsHubView.tsx'), 'utf8');
const chapterStoryPath = path.join(import.meta.dirname, 'DesktopChapterTestCard.stories.tsx');
const chapterStory = fs.existsSync(chapterStoryPath) ? fs.readFileSync(chapterStoryPath, 'utf8') : '';

test('tests hub visual runner records the Figma desktop/mobile contract', () => {
  assert.match(runner, /727:3094/, 'runner must identify the Figma node under review');
  assert.match(runner, /width: 1440, height: 1080/, 'runner must capture 1440x1080');
  assert.match(runner, /width: 1440, height: 1293/, 'runner must capture 1440x1293');
  assert.match(runner, /\[320, 360, 390, 430\]/, 'runner must cover all required mobile widths');
  assert.match(runner, /features-tests-question--correct-feedback/);
  assert.match(runner, /features-tests-result--with-weak-topic/);
  assert.match(runner, /features-tests-hub--desktop-zero-bank/);
  assert.match(runner, /features-tests-hub--desktop-legacy-missing-counts/);
  assert.match(runner, /features-tests-hub--desktop-multiple-attempts/);
  assert.match(runner, /features-tests-desktop-test-option-card--weak-pre-analysis/);
  assert.match(runner, /features-tests-desktop-test-option-card--mock-inactive/);
  assert.match(runner, /weak-pre-analysis/);
  assert.match(runner, /mock-inactive/);
  assert.match(runner, /actionCount/);
  assert.match(runner, /statusBadge/);
  assert.match(runner, /320/);
  assert.match(runner, /196/);
  assert.match(runner, /655/);
  assert.match(runner, /180/);
  assert.match(runner, /data-chapter-card/);
  assert.match(runner, /chapterCards/);
  assert.match(runner, /zero-bank/);
  assert.match(runner, /chapterCards\.every/);
  assert.match(runner, /linkCount/);
  assert.match(runner, /getBoundingClientRect/);
  assert.match(runner, /getComputedStyle/);
  assert.match(runner, /waitForFunction/);
  assert.match(runner, /domcontentloaded/);
  assert.match(runner, /index\.json/);
  assert.match(runner, /reference-crop\.png/);
  assert.match(runner, /no resampling/);
  assert.match(runner, /differentPixelRatio/);
  assert.match(runner, /RASTER_SENSITIVITY/);
  assert.match(runner, /pixelsAboveThresholdRatio/);
  assert.match(runner, /negativeControls/);
  assert.match(runner, /referenceShiftX/);
  assert.match(runner, /referenceShiftY/);
  assert.match(runner, /APPROXIMATION/);
  assert.match(runner, /fontReadiness/);
  assert.match(runner, /contractTypography/);
  assert.match(runner, /document\.fonts\.check/);
  assert.match(runner, /font readiness timed out/);
  assert.match(runner, /waitForTooltipOpacity/);
  assert.match(runner, /requestAnimationFrame/);
  assert.match(runner, /VisualContractError/);
  assert.match(runner, /process\.exitCode = 1/);
  assert.doesNotMatch(runner, /status: 'READY'/);
  assert.match(runner, /referenceSummary/);
  assert.match(runner, /hitTargets/);
  assert.match(runner, /ariaDisabled/);
  assert.match(runner, /overlay/);
  assert.match(runner, /difference/);
  assert.match(runner, /fullPage: false/);
  assert.match(runner, /startY: 1080/);
  assert.match(runner, /NOT RUN/);
  assert.match(runner, /data-tests-mode-grid/);
  assert.match(runner, /data-tests-right-column/);
  assert.match(runner, /data-tests-mode-skeleton/);
  assert.match(runner, /data-tests-chapter-skeleton/);
  assert.match(runner, /modeSkeletons/);
  assert.match(runner, /chapterSkeletons/);
  assert.match(runner, /loading state must render exactly three mode skeletons at 196px, 196px, and 180px/);
  assert.match(runner, /loading state must render exactly six 196px chapter skeletons/);
  assert.match(runner, /loading state must not expose mock content or ready chapter cards/);
  assert.match(runner, /data-chapter-metric/);
  assert.match(runner, /data-testid|desktopWeakPrerequisite/);
  assert.match(runner, /desktop-analyze-loading-stale/);
  assert.match(runner, /desktop-analyze-error-stale/);
  assert.match(runner, /desktop-dashboard-error-stale/);
  assert.match(runner, /desktop-catalog-stale/);
  assert.match(runner, /weakAction/);
  assert.match(runner, /optionCardInteraction/);
  assert.match(runner, /transitionProperty/);
  assert.match(runner, /transitionDuration/);
  assert.match(runner, /transitionTimingFunction/);
  assert.match(runner, /interactiveDescendants/);
  assert.match(runner, /option-card root link or nested action contract failed/);
  assert.match(runner, /option-card hover\/focus transition parity failed/);
  assert.match(runner, /href !== '\/analyze'/);
  assert.match(runner, /contractIcon/);
  assert.match(runner, /contractGlyph/);
  for (const node of ['954:2976', '954:2962', '954:2947']) {
    assert.match(runner, new RegExp(node), `runner must identify Figma node ${node}`);
  }
  for (const storyId of [
    'features-tests-desktop-chapter-test-card--no-test',
    'features-tests-desktop-chapter-test-card--legacy-no-test',
    'features-tests-desktop-chapter-test-card--first-test',
    'features-tests-desktop-chapter-test-card--full',
    'features-tests-desktop-chapter-test-card--short-title',
    'features-tests-hub--desktop-zero-attempts',
  ]) {
    assert.match(runner, new RegExp(storyId), `runner must capture ${storyId}`);
  }
  assert.match(runner, /7da2bfdd-15fd-416a-a147-c9c806d28c37\.png/);
  assert.match(runner, /da19ffad-6f84-410e-ade5-556a164daf46\.png/);
  assert.match(runner, /532db32c-949f-4c05-b0c5-a39ee24ce725\.png/);
  assert.match(runner, /782a8ccf-e66b-4186-a834-f812ce72c70c\.png/);
  assert.match(runner, /4b1c3a15-be29-45f9-b08a-63d208576f2b\.png/);
  assert.match(runner, /data-chapter-question-count/);
  assert.match(runner, /data-chapter-navigation/);
  assert.match(runner, /navigationHitBox/);
  assert.match(runner, /interactiveDescendants/);
  assert.match(runner, /tabOrder/);
  assert.match(runner, /overlap/);
  assert.match(runner, /titleToQuestionGap/);
  assert.match(runner, /questionBottomInset/);
  assert.match(runner, /chapter-short-title/);
  assert.match(runner, /data-tests-statistics-spacer/);
  assert.match(runner, /dashboard-error state must not infer empty statistics without a ready dashboard/);
  assert.match(runner, /ready legacy payload must render only inferred empty statistics and chapter badges/);
  assert.match(runner, /data-tests-recent-empty/);
  for (const node of ['1325:2920', '1325:2867', '1325:2934']) {
    assert.match(runner, new RegExp(node), `runner must identify current Test history Figma node ${node}`);
  }
  assert.match(runner, /recent-default\.png/);
  assert.match(runner, /recent-hover\.png/);
  assert.match(runner, /recent-focus\.png/);
  assert.match(runner, /recent-active\.png/);
  assert.match(runner, /page\.mouse\.down\(\)/, 'trusted browser pointer-down must capture the native active state');
  assert.match(runner, /rgb\(246, 245, 247\)/, 'native active state must assert the exact clicked background');
  assert.match(runner, /data-location-url/, 'pointer release must prove native attempt navigation');
  assert.match(runner, /width: 1024, height: 768/, 'current history cards must be measured at deterministic 1024x768');
  assert.match(runner, /lineRects/);
  assert.match(runner, /pointerEvents/);
  assert.match(runner, /elementScreenshot/);
  assert.match(runner, /TESTS_VISUAL_SCOPE/);
  assert.match(runner, /figma-exact/);
  assert.match(runner, /test-history/);
  assert.match(runner, /history-mobile/);
  assert.match(runner, /weak-navigation/);
  assert.match(runner, /AbortSignal\.timeout/);
  assert.match(runner, /reference-self-shift/);
  assert.match(chapterStory, /w-\[320px\][\s\S]*h-\[196px\]/);
  assert.match(chapterStory, /export const LegacyNoTest/);
  assert.match(chapterStory, /noDataHint/);
  assert.match(runner, /noDataHover/);
  assert.match(runner, /Общая точность по разделу появится после первого теста/);
  assert.match(story, /export const DesktopLegacyMissingCounts/);
  assert.match(story, /DesktopLoading[\s\S]*data-tests-mode-skeleton[\s\S]*toHaveLength\(3\)/);
  assert.match(story, /DesktopLoading[\s\S]*toEqual\(\[196, 196, 180\]\)/);
  assert.match(story, /DesktopLoading[\s\S]*data-tests-chapter-skeleton[\s\S]*toHaveLength\(6\)/);
  assert.match(story, /export const DesktopWeakPrerequisiteMouse/);
});

test('reference-derived raster sensitivity rejects a visible regression and accepts a materially better candidate', () => {
  const metric = (mean, ratio, differentPixels = 1) => ({
    differentPixels,
    meanAbsoluteChannelDifference: mean,
    pixelsAboveThresholdRatio: { 16: ratio },
  });
  const controls = { referenceShiftX: metric(10, 0.2), referenceShiftY: metric(12, 0.22) };
  assert.equal(classifyRasterRegion(metric(9, 0.19), controls).status, 'FAIL');
  assert.equal(classifyRasterRegion(metric(5, 0.05), controls).status, 'PASS');
  assert.equal(classifyRasterRegion(metric(0, 0, 1), controls, { exact: true }).status, 'FAIL');
  assert.equal(classifyRasterRegion(metric(0, 0, 0), controls, { exact: true }).status, 'PASS');
});

test('desktop Storybook state reserves the 320px shell before the 1px content frame', () => {
  assert.match(story, /md:ml-\[320px\]|<DesktopSidebar/);
  assert.equal((desktop.match(/role="alert"/g) ?? []).length, 2, 'desktop error/catalog states should each expose one shared alert');
  assert.equal((fs.readFileSync(path.join(import.meta.dirname, 'TestsHubView.tsx'), 'utf8').match(/aria-busy=/g) ?? []).length, 1, 'hub should expose one composed busy state');
});
