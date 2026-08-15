import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const artifactDir = path.resolve('test-results/subscription-desktop');
const sourceProvenance = {
  reference: 'aa8qReawBBhHIXDAbS18OP node1112:2530',
  planList: 'aa8qReawBBhHIXDAbS18OP node1112:2569',
  monthly: 'aa8qReawBBhHIXDAbS18OP node1112:2570',
  annual: 'aa8qReawBBhHIXDAbS18OP node1112:2579',
};
mkdirSync(artifactDir, { recursive: true });

function near(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function compareReference(referencePath, actualPath) {
  const reference = PNG.sync.read(readFileSync(referencePath));
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (reference.width !== 1440 || reference.height !== 1080 || actual.width !== reference.width || actual.height !== reference.height) {
    throw new Error(`reference/actual dimensions mismatch: reference ${reference.width}x${reference.height}, actual ${actual.width}x${actual.height}`);
  }
  const overlay = new PNG({ width: reference.width, height: reference.height });
  const diff = new PNG({ width: reference.width, height: reference.height });
  let differingPixels = 0;
  for (let i = 0; i < reference.data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % reference.width;
    const y = Math.floor(pixel / reference.width);
    // The supplied reference has no back control. Mask only the 24px icon paint
    // at x=44..68, y=44..68, plus a one-pixel antialias fringe; the 48px hit
    // area and its background remain part of the honest page diff.
    const isBackMask = x >= 43 && x < 69 && y >= 43 && y < 69;
    const delta = Math.max(
      Math.abs(reference.data[i] - actual.data[i]),
      Math.abs(reference.data[i + 1] - actual.data[i + 1]),
      Math.abs(reference.data[i + 2] - actual.data[i + 2]),
    );
    const differs = delta > 24;
    if (!isBackMask) {
      if (differs) differingPixels += 1;
    }
    overlay.data[i] = Math.round((reference.data[i] + actual.data[i]) / 2);
    overlay.data[i + 1] = Math.round((reference.data[i + 1] + actual.data[i + 1]) / 2);
    overlay.data[i + 2] = Math.round((reference.data[i + 2] + actual.data[i + 2]) / 2);
    overlay.data[i + 3] = 255;
    diff.data[i] = differs && !isBackMask ? 220 : 255;
    diff.data[i + 1] = differs && !isBackMask ? 40 : 255;
    diff.data[i + 2] = differs && !isBackMask ? 40 : 255;
    diff.data[i + 3] = differs && !isBackMask ? 255 : 0;
  }
  writeFileSync(path.join(artifactDir, 'overlay.png'), PNG.sync.write(overlay));
  writeFileSync(path.join(artifactDir, 'diff.png'), PNG.sync.write(diff));
  const ratio = differingPixels / (reference.width * reference.height);
  if (ratio > 0.020913 || differingPixels > 32524) throw new Error(`reference visual diff exceeds threshold: ${(ratio * 100).toFixed(2)}% pixels differ (${differingPixels})`);
  return { differingPixels, ratio };
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const url = `${storybook}/iframe.html?id=pages-subscription--desktop-1440-x-1080-annual-selected&viewMode=story`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.locator('[data-subscription-desktop]').waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => document.querySelector('[data-subscription-desktop] input[type="radio"][value="annual"]')?.checked === true, null, { timeout: 15_000 });
  } catch (error) {
    console.log(`NOT RUN: Storybook/browser prerequisite unavailable at ${url}: ${error.message}`);
    process.exitCode = 2;
  }

  if (!process.exitCode) {
    await page.evaluate(async () => { await document.fonts.ready; });
    const backBefore = await page.evaluate(() => { const rect = (selector) => { const node = document.querySelector(selector); const value = node?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; }; return { back: rect('[data-subscription-desktop-back]'), row: rect('[data-subscription-desktop-row]'), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }) }; });
    await page.locator('[data-subscription-desktop-back]').hover(); await page.waitForTimeout(140);
    const backHover = await page.evaluate(() => { const back = document.querySelector('[data-subscription-desktop-back]'); const icon = back?.querySelector('svg'); return { backgroundColor: back ? getComputedStyle(back).backgroundColor : '', color: icon ? getComputedStyle(icon).color : '', cursor: back ? getComputedStyle(back).cursor : '' }; });
    if (backHover.backgroundColor !== 'rgb(248, 245, 252)' || backHover.color !== 'rgb(106, 55, 195)' || backHover.cursor !== 'pointer') throw new Error(`back hover paint contract failed: ${JSON.stringify(backHover)}`);
    await page.mouse.move(200, 200); await page.locator('[data-subscription-desktop-back]').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(40);
    const backFocus = await page.evaluate(() => { const back = document.querySelector('[data-subscription-desktop-back]'); const icon = back?.querySelector('svg'); return { active: document.activeElement === back, backgroundColor: back ? getComputedStyle(back).backgroundColor : '', color: icon ? getComputedStyle(icon).color : '', boxShadow: back ? getComputedStyle(back).boxShadow : '' }; });
    if (!backFocus.active || backFocus.backgroundColor !== 'rgb(248, 245, 252)' || backFocus.color !== 'rgb(106, 55, 195)' || !backFocus.boxShadow.includes('106, 55, 195')) throw new Error(`back focus paint contract failed: ${JSON.stringify(backFocus)}`);
    const backAfter = await page.evaluate(() => { const node = document.querySelector('[data-subscription-desktop-back]'); const value = node?.getBoundingClientRect(); return { back: value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null, row: (() => { const v = document.querySelector('[data-subscription-desktop-row]')?.getBoundingClientRect(); return v ? { x: v.x, y: v.y, width: v.width, height: v.height } : null; })(), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const v = node.getBoundingClientRect(); return { x: v.x, y: v.y, width: v.width, height: v.height }; }) }; });
    if (JSON.stringify(backBefore) !== JSON.stringify(backAfter)) throw new Error('back interaction changed desktop geometry');
    await page.mouse.move(200, 200); await page.evaluate(() => document.querySelector('[data-subscription-desktop-back]')?.blur()); await page.waitForTimeout(220);
    await page.mouse.move(200, 200);
    const defaultBack = await page.evaluate(() => {
      const back = document.querySelector('[data-subscription-desktop-back]');
      const icon = back?.querySelector('svg');
      const rect = back?.getBoundingClientRect();
      return {
        backgroundColor: back ? getComputedStyle(back).backgroundColor : '',
        color: icon ? getComputedStyle(icon).color : '',
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      };
    });
    if (defaultBack.backgroundColor !== 'rgba(0, 0, 0, 0)' || defaultBack.color !== 'rgb(106, 55, 195)') throw new Error(`back default paint contract failed: ${JSON.stringify(defaultBack)}`);
    if (JSON.stringify(defaultBack.rect) !== JSON.stringify(backBefore.back)) throw new Error('back default reset changed geometry');
    writeFileSync(path.join(artifactDir, 'back-interaction-measurements.json'), `${JSON.stringify({ hover: backHover, focus: backFocus, before: backBefore, after: backAfter, default: defaultBack }, null, 2)}\n`);
    const measurement = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor, opacity: style.opacity };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
        outer: box('[data-subscription-desktop]'),
        row: box('[data-subscription-desktop-row]'),
        left: box('[data-subscription-desktop-left]'),
        right: box('[data-subscription-desktop-right]'),
        planArea: box('[data-subscription-desktop-plan-area]'),
        planList: box('[data-subscription-desktop-plan-area] fieldset'),
        monthly: box('[data-subscription-desktop-plan="monthly"]'),
        annual: box('[data-subscription-desktop-plan="annual"]'),
        cta: box('[data-subscription-desktop-cta]'),
        back: box('[data-subscription-desktop-back]'),
        features: [...document.querySelectorAll('[data-subscription-desktop-feature]')].map((feature) => ({
          box: boxFor(feature),
          icon: boxFor(feature.querySelector('span')),
        })),
        overflow: { documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth },
      };
      function boxFor(node) { const rect = node?.getBoundingClientRect(); return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null; }
    });
    writeFileSync(path.join(artifactDir, 'measurements.json'), `${JSON.stringify({ sourceProvenance, ...measurement, backDefault: defaultBack }, null, 2)}\n`);
    await page.screenshot({ path: path.join(artifactDir, 'actual.png'), fullPage: true });
    near(measurement.row.x, 128, 0.5, 'row x');
    near(measurement.row.y, 264.5, 0.5, 'row y');
    near(measurement.row.width, 1184, 0.5, 'row width');
    near(measurement.row.height, 551, 0.5, 'row height');
    near(measurement.left.width, 584, 0.5, 'left width');
    near(measurement.right.width, 584, 0.5, 'right width');
    near(measurement.right.x - measurement.left.x - measurement.left.width, 16, 0.5, 'card gap');
    near(measurement.planArea.height, 325, 0.5, 'plan area height');
    near(measurement.monthly.height, 72, 0.5, 'monthly height');
    near(measurement.annual.height, 72, 0.5, 'annual height');
    near(measurement.planList.height, 160, 0.5, 'plan list height');
    near(measurement.cta.height, 50, 0.5, 'cta height');
    near(measurement.back.x, 32, 0.5, 'back x');
    near(measurement.back.y, 32, 0.5, 'back y');
    near(measurement.back.width, 48, 0.5, 'back width');
    near(measurement.back.height, 48, 0.5, 'back height');
    if (measurement.back.x + measurement.back.width > measurement.left.x || measurement.back.y + measurement.back.height > measurement.left.y) throw new Error('back button overlaps cards');
    near(measurement.features[0]?.box?.y ?? NaN, 491.5, 0.5, 'first feature y');
    for (let index = 0; index < measurement.features.length; index += 1) {
      const feature = measurement.features[index];
      if (!feature?.box || !feature.icon) throw new Error(`feature ${index + 1} geometry missing`);
      near(feature.icon.x, feature.box.x, 0.5, `feature ${index + 1} icon x`);
      near(feature.icon.y + feature.icon.height / 2, feature.box.y + feature.box.height / 2, 0.5, `feature ${index + 1} icon centering`);
      if (index > 0) {
        const previous = measurement.features[index - 1];
        near(feature.box.y - (previous.box.y + previous.box.height), 48, 0.5, `feature gap ${index}`);
      }
    }
    if (measurement.overflow.documentWidth > measurement.overflow.viewportWidth) throw new Error('desktop horizontal overflow');
    if (await page.locator('[data-subscription-desktop-cta]:disabled').count() !== 1) throw new Error('desktop CTA must be disabled');
    const styleContract = await page.evaluate(() => {
      const monthly = document.querySelector('[data-subscription-desktop-plan="monthly"]');
      const annual = document.querySelector('[data-subscription-desktop-plan="annual"]');
      const pill = annual?.querySelector('span.rounded-\\[8px\\]');
      const cta = document.querySelector('[data-subscription-desktop-cta]');
      const monthlyPrice = document.querySelector('[data-subscription-desktop-plan="monthly"] span.text-\\[24px\\]');
      const annualPrice = annual?.querySelector('span.text-\\[24px\\]');
      const featureRows = [...document.querySelectorAll('[data-subscription-desktop-feature]')];
      return {
        planListGap: document.querySelector('[data-subscription-desktop-plan-area] fieldset') ? getComputedStyle(document.querySelector('[data-subscription-desktop-plan-area] fieldset')).gap : '',
        monthly: monthly ? { padding: getComputedStyle(monthly).padding, gap: getComputedStyle(monthly).gap, radius: getComputedStyle(monthly).borderRadius, borderWidth: getComputedStyle(monthly).borderTopWidth, borderRule: [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules].map((rule) => rule.cssText); } catch { return []; } }).find((css) => css.includes('border-width: 1.5px')) ?? '' } : null,
        annual: annual ? { padding: getComputedStyle(annual).padding, gap: getComputedStyle(annual).gap, radius: getComputedStyle(annual).borderRadius } : null,
        annualBackground: annual ? getComputedStyle(annual).backgroundColor : '',
        annualRadius: annual ? getComputedStyle(annual).borderRadius : '',
        pill: pill ? { background: getComputedStyle(pill).backgroundColor, radius: getComputedStyle(pill).borderRadius, color: getComputedStyle(pill).color } : null,
        cta: cta ? { color: getComputedStyle(cta).color, fontSize: getComputedStyle(cta).fontSize, lineHeight: getComputedStyle(cta).lineHeight } : null,
        monthlyPrice: monthlyPrice ? { fontSize: getComputedStyle(monthlyPrice).fontSize, lineHeight: getComputedStyle(monthlyPrice).lineHeight } : null,
        annualPrice: annualPrice ? { fontSize: getComputedStyle(annualPrice).fontSize, lineHeight: getComputedStyle(annualPrice).lineHeight } : null,
        featureRows: featureRows.map((row) => ({ top: row.getBoundingClientRect().top, alignItems: getComputedStyle(row).alignItems, color: getComputedStyle(row.querySelector('svg')).color })),
        back: document.querySelector('[data-subscription-desktop-back]') ? getComputedStyle(document.querySelector('[data-subscription-desktop-back]')).color : '',
        monthlyPriceWeight: monthlyPrice ? getComputedStyle(monthlyPrice).fontWeight : '',
        annualPriceWeight: annualPrice ? getComputedStyle(annualPrice).fontWeight : '',
        monthlySuffixWeight: monthlyPrice?.querySelector('span') ? getComputedStyle(monthlyPrice.querySelector('span')).fontWeight : '',
        annualSuffixWeight: annualPrice?.querySelector('span') ? getComputedStyle(annualPrice.querySelector('span')).fontWeight : '',
      };
    });
    if (styleContract.planListGap !== '16px') throw new Error(`plan list gap contract failed: ${styleContract.planListGap}`);
    if (!styleContract.monthly || styleContract.monthly.padding !== '16px 24px' || styleContract.monthly.gap !== '24px' || styleContract.monthly.radius !== '16px' || !['1px', '1.5px'].includes(styleContract.monthly.borderWidth) || !styleContract.monthly.borderRule) throw new Error(`monthly row style contract failed: ${JSON.stringify(styleContract.monthly)}`);
    if (!styleContract.annual || styleContract.annual.padding !== '16px 24px' || styleContract.annual.gap !== '24px' || styleContract.annual.radius !== '16px') throw new Error(`annual row style contract failed: ${JSON.stringify(styleContract.annual)}`);
    if (styleContract.annualBackground !== 'rgb(248, 245, 252)' || styleContract.annualRadius !== '16px') throw new Error('annual selected paint contract failed');
    if (!styleContract.pill || styleContract.pill.background !== 'rgb(222, 210, 241)' || styleContract.pill.radius !== '8px' || styleContract.pill.color !== 'rgb(106, 55, 195)') throw new Error('annual discount pill style contract failed');
    if (!styleContract.cta || styleContract.cta.fontSize !== '18px' || styleContract.cta.lineHeight !== '18px') throw new Error('CTA typography contract failed');
    if (!styleContract.monthlyPrice || styleContract.monthlyPrice.fontSize !== '24px' || styleContract.monthlyPrice.lineHeight !== '24px') throw new Error('monthly price typography contract failed');
    if (!styleContract.annualPrice || styleContract.annualPrice.fontSize !== '24px' || styleContract.annualPrice.lineHeight !== '24px') throw new Error('annual price typography contract failed');
    if (styleContract.featureRows.some((row) => row.alignItems !== 'center')) throw new Error('feature row alignment contract failed');
    if (styleContract.featureRows.some((row) => row.color !== 'rgb(106, 55, 195)')) throw new Error('feature icon color contract failed');
    if (styleContract.monthlyPriceWeight !== '500' || styleContract.annualPriceWeight !== '500' || styleContract.monthlySuffixWeight !== '400' || styleContract.annualSuffixWeight !== '400') throw new Error('price weight contract failed');
    const annualCtaBefore = await page.evaluate(() => {
      const rect = (selector) => { const node = document.querySelector(selector); const value = node?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; };
      return { cta: rect('[data-subscription-desktop-cta]'), row: rect('[data-subscription-desktop-row]'), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }) };
    });
    await page.locator('[data-subscription-desktop-cta]').hover();
    const annualCtaHover = await page.evaluate(() => {
      const cta = document.querySelector('[data-subscription-desktop-cta]');
      return { backgroundColor: cta ? getComputedStyle(cta).backgroundColor : '', cursor: cta ? getComputedStyle(cta).cursor : '', disabled: cta instanceof HTMLButtonElement ? cta.disabled : false, copy: cta?.textContent?.trim() ?? '' };
    });
    if (annualCtaHover.backgroundColor !== 'rgb(68, 35, 125)' || annualCtaHover.cursor !== 'not-allowed' || !annualCtaHover.disabled || annualCtaHover.copy !== 'Оформить Premium на год') throw new Error(`annual CTA hover contract failed: ${JSON.stringify(annualCtaHover)}`);
    const annualCtaAfter = await page.evaluate(() => ({ row: (() => { const value = document.querySelector('[data-subscription-desktop-row]')?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; })(), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }) }));
    if (JSON.stringify({ row: annualCtaBefore.row, cards: annualCtaBefore.cards }) !== JSON.stringify(annualCtaAfter)) throw new Error('annual CTA hover changed geometry');
    writeFileSync(path.join(artifactDir, 'cta-hover-measurements.json'), `${JSON.stringify({ annual: { before: annualCtaBefore, after: annualCtaAfter, hover: annualCtaHover } }, null, 2)}\n`);
    await page.screenshot({ path: path.join(artifactDir, 'annual-cta-hover.png'), fullPage: true });
    await page.mouse.move(200, 200);
    const referencePath = path.join(artifactDir, 'reference.png');
    let diff = null;
    try {
      diff = compareReference(referencePath, path.join(artifactDir, 'actual.png'));
    } catch (error) {
      if (error?.code === 'ENOENT' && error?.path === referencePath) {
        console.log(`NOT RUN: Figma reference unavailable at ${referencePath}`);
      } else {
        throw error;
      }
    }

    const responsiveCases = [
      { width: 768, height: 1024, rowX: 32, rowWidth: 704, panelWidth: 704, panelPadding: 32, columns: 1 },
      { width: 1024, height: 768, rowX: 32, rowWidth: 960, panelWidth: 472, panelPadding: 32, columns: 2 },
      { width: 1280, height: 800, rowX: 64, rowWidth: 1152, panelWidth: 568, panelPadding: 48, columns: 2 },
      { width: 1440, height: 1080, rowX: 128, rowWidth: 1184, panelWidth: 584, panelPadding: 64, columns: 2 },
    ];
    const responsiveMeasurements = [];
    for (const expected of responsiveCases) {
      await page.setViewportSize({ width: expected.width, height: expected.height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.locator('[data-subscription-desktop]').waitFor({ state: 'visible', timeout: 15_000 });
      await page.evaluate(async () => { await document.fonts.ready; });
      const smoke = await page.evaluate(() => {
        const rect = (selector) => { const node = document.querySelector(selector); const value = node?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null; };
        const cta = document.querySelector('[data-subscription-desktop-cta]');
        const left = document.querySelector('[data-subscription-desktop-left]');
        const right = document.querySelector('[data-subscription-desktop-right]');
        return {
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          row: rect('[data-subscription-desktop-row]'),
          left: rect('[data-subscription-desktop-left]'),
          right: rect('[data-subscription-desktop-right]'),
          back: rect('[data-subscription-desktop-back]'),
          cta: rect('[data-subscription-desktop-cta]'),
          padding: { left: left ? Number.parseFloat(getComputedStyle(left).paddingLeft) : NaN, right: right ? Number.parseFloat(getComputedStyle(right).paddingLeft) : NaN },
          scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        };
      });
      responsiveMeasurements.push(smoke);
      if (smoke.viewport.dpr !== 1) throw new Error(`${expected.width}x${expected.height}: DPR must be 1`);
      near(smoke.row?.x ?? NaN, expected.rowX, 0.5, `${expected.width}: row x`);
      near(smoke.row?.width ?? NaN, expected.rowWidth, 0.5, `${expected.width}: row width`);
      near(smoke.left?.width ?? NaN, expected.panelWidth, 0.5, `${expected.width}: left width`);
      near(smoke.right?.width ?? NaN, expected.panelWidth, 0.5, `${expected.width}: right width`);
      near(smoke.padding.left, expected.panelPadding, 0.5, `${expected.width}: left padding`);
      near(smoke.padding.right, expected.panelPadding, 0.5, `${expected.width}: right padding`);
      if (expected.columns === 1) {
        near((smoke.right?.y ?? NaN) - (smoke.left?.bottom ?? NaN), 16, 0.5, `${expected.width}: vertical card gap`);
        if ((smoke.scroll.height ?? 0) <= expected.height) throw new Error(`${expected.width}: one-column layout must use natural vertical scroll`);
      } else {
        near((smoke.right?.x ?? NaN) - (smoke.left?.right ?? NaN), 16, 0.5, `${expected.width}: horizontal card gap`);
        near(smoke.right?.y ?? NaN, smoke.left?.y ?? NaN, 0.5, `${expected.width}: card row alignment`);
      }
      if (!smoke.back || !smoke.row || !(smoke.back.right <= smoke.row.x || smoke.back.bottom <= smoke.row.y)) throw new Error(`${expected.width}: back button overlaps content`);
      if (smoke.scroll.width > expected.width) throw new Error(`${expected.width}x${expected.height}: horizontal overflow`);
      if (!smoke.cta || smoke.cta.bottom > smoke.scroll.height) throw new Error(`${expected.width}x${expected.height}: CTA unreachable in document flow`);
    }
    writeFileSync(path.join(artifactDir, 'responsive-measurements.json'), `${JSON.stringify(responsiveMeasurements, null, 2)}\n`);

    const mobileMeasurements = [];
    for (const width of [320, 360, 390, 430]) {
      const height = width === 320 ? 568 : width === 360 ? 800 : width === 390 ? 844 : 932;
      await page.setViewportSize({ width, height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.locator('[data-subscription-cta]').waitFor({ state: 'visible', timeout: 15_000 });
      const mobile = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        desktopDisplay: getComputedStyle(document.querySelector('[data-subscription-desktop]')).display,
        mobileDisplay: getComputedStyle(document.querySelector('[data-mobile-page-frame]') ?? document.querySelector('main')).display,
        scrollWidth: document.documentElement.scrollWidth,
        ctaDisabled: document.querySelector('[data-subscription-cta]') instanceof HTMLButtonElement && document.querySelector('[data-subscription-cta]').disabled,
      }));
      mobileMeasurements.push(mobile);
      if (mobile.viewport.dpr !== 1 || mobile.desktopDisplay !== 'none' || mobile.mobileDisplay === 'none' || mobile.scrollWidth > width || !mobile.ctaDisabled) throw new Error(`${width}x${height}: mobile preservation gate failed: ${JSON.stringify(mobile)}`);
    }
    writeFileSync(path.join(artifactDir, 'mobile-measurements.json'), `${JSON.stringify(mobileMeasurements, null, 2)}\n`);

    {
      await page.setViewportSize({ width: 1440, height: 1080 });
      const monthlyUrl = `${storybook}/iframe.html?id=pages-subscription--desktop-1440-x-1080-monthly-visual&viewMode=story`;
      await page.goto(monthlyUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.locator('[data-subscription-desktop]').waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator('[data-subscription-desktop] input[type="radio"][value="monthly"]').check({ force: true });
      const beforeSelection = await page.evaluate(() => [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; }));
      const monthlyMeasurement = await page.evaluate(() => {
        const monthly = document.querySelector('[data-subscription-desktop] input[type="radio"][value="monthly"]');
        const annual = document.querySelector('[data-subscription-desktop] input[type="radio"][value="annual"]');
        const cta = document.querySelector('[data-subscription-desktop-cta]');
        const plan = document.querySelector('[data-subscription-desktop-plan="monthly"]');
        const rect = plan?.getBoundingClientRect();
        return {
          monthlyChecked: monthly?.checked ?? false,
          annualChecked: annual?.checked ?? false,
          cta: cta?.textContent?.trim() ?? '',
          plan: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
          plans: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }),
          monthlyBackground: plan ? getComputedStyle(plan).backgroundColor : '',
          annualBackground: document.querySelector('[data-subscription-desktop-plan="annual"]') ? getComputedStyle(document.querySelector('[data-subscription-desktop-plan="annual"]')).backgroundColor : '',
          ctaDisabled: cta instanceof HTMLButtonElement ? cta.disabled : false,
        };
      });
      writeFileSync(path.join(artifactDir, 'monthly-measurements.json'), `${JSON.stringify(monthlyMeasurement, null, 2)}\n`);
      await page.screenshot({ path: path.join(artifactDir, 'monthly.png'), fullPage: true });
      if (!monthlyMeasurement.monthlyChecked || monthlyMeasurement.annualChecked) throw new Error('monthly selection contract failed');
      if (monthlyMeasurement.cta !== 'Оформить Premium на месяц') throw new Error(`monthly CTA copy contract failed: ${monthlyMeasurement.cta}`);
      if (!monthlyMeasurement.ctaDisabled) throw new Error('monthly CTA must be disabled');
      if (monthlyMeasurement.plans.some((plan) => Math.abs(plan.height - 72) > 0.5)) throw new Error(`monthly selection row height contract failed: ${JSON.stringify(monthlyMeasurement.plans)}`);
      if (monthlyMeasurement.monthlyBackground !== 'rgb(248, 245, 252)' || monthlyMeasurement.annualBackground !== 'rgba(0, 0, 0, 0)') throw new Error(`monthly selection paint contract failed: ${JSON.stringify({ monthly: monthlyMeasurement.monthlyBackground, annual: monthlyMeasurement.annualBackground })}`);
      if (JSON.stringify(beforeSelection) !== JSON.stringify(monthlyMeasurement.plans)) throw new Error('plan selection changed desktop geometry');
      const monthlyBefore = await page.evaluate(() => ({ row: (() => { const value = document.querySelector('[data-subscription-desktop-row]')?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; })(), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }) }));
      await page.locator('[data-subscription-desktop-cta]').hover();
      const monthlyHover = await page.evaluate(() => { const cta = document.querySelector('[data-subscription-desktop-cta]'); return { backgroundColor: cta ? getComputedStyle(cta).backgroundColor : '', cursor: cta ? getComputedStyle(cta).cursor : '', disabled: cta instanceof HTMLButtonElement ? cta.disabled : false, copy: cta?.textContent?.trim() ?? '' }; });
      if (monthlyHover.backgroundColor !== 'rgb(68, 35, 125)' || monthlyHover.cursor !== 'not-allowed' || !monthlyHover.disabled || monthlyHover.copy !== 'Оформить Premium на месяц') throw new Error(`monthly CTA hover contract failed: ${JSON.stringify(monthlyHover)}`);
      const monthlyAfter = await page.evaluate(() => ({ row: (() => { const value = document.querySelector('[data-subscription-desktop-row]')?.getBoundingClientRect(); return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null; })(), cards: [...document.querySelectorAll('[data-subscription-desktop-plan]')].map((node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; }) }));
      if (JSON.stringify(monthlyBefore) !== JSON.stringify(monthlyAfter)) throw new Error('monthly CTA hover changed geometry');
      const hoverPath = path.join(artifactDir, 'cta-hover-measurements.json');
      const hoverMeasurements = JSON.parse(readFileSync(hoverPath, 'utf8'));
      hoverMeasurements.monthly = { before: monthlyBefore, after: monthlyAfter, hover: monthlyHover };
      writeFileSync(hoverPath, `${JSON.stringify(hoverMeasurements, null, 2)}\n`);
      await page.screenshot({ path: path.join(artifactDir, 'monthly-cta-hover.png'), fullPage: true });
    }
    const diffSummary = diff ? `${(diff.ratio * 100).toFixed(2)}% (${diff.differingPixels} pixels)` : 'NOT RUN (reference unavailable)';
    console.log(`Subscription desktop visual contract passed; source ${JSON.stringify(sourceProvenance)}; 1440 reference diff ${diffSummary}.`);
  }
} finally {
  await browser.close();
}
