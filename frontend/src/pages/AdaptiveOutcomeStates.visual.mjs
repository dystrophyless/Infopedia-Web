import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = path.join(os.tmpdir(), 'infopedia-adaptive-outcomes');
const mobileViewports = [
  ['320x568', 320, 568],
  ['360x800', 360, 800],
  ['375x667', 375, 667],
  ['390x844', 390, 844],
  ['430x932', 430, 932],
];
const kazakhViewports = new Set(['320x568', '375x667', '430x932']);
const states = [
  {
    id: 'favorites',
    mobileSelector: '[data-mobile-outcome-paint][aria-labelledby][aria-describedby]',
    stories: {
      ru: 'pages-favorites--responsive-russian',
      kk: 'pages-favorites--responsive-kazakh',
      desktop: 'pages-favorites--desktop',
    },
  },
  {
    id: 'search',
    mobileSelector: '[data-mobile-search-empty]',
    stories: {
      ru: 'pages-search-empty-outcome--russian',
      kk: 'pages-search-empty-outcome--kazakh',
    },
  },
  {
    id: 'analyze',
    mobileSelector: '[data-analyze-failure-group]',
    stories: {
      ru: 'pages-analyze--unsupported-pdf-responsive-russian',
      kk: 'pages-analyze--unsupported-pdf-responsive-kazakh',
    },
  },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

async function measure(page) {
  return page.evaluate(() => {
    const visible = (element) => Boolean(element && element.getClientRects().length > 0);
    const rect = (element) => {
      if (!visible(element)) return null;
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom,
      };
    };
    const firstVisible = (selector) =>
      Array.from(document.querySelectorAll(selector)).find(visible) ?? null;
    const unobscured = (element) => {
      if (!visible(element)) return false;
      const box = element.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
      const topmost = document.elementsFromPoint(x, y)[0] ?? null;
      return Boolean(topmost && (topmost === element || element.contains(topmost)));
    };
    const group = firstVisible('[data-mobile-outcome-paint], [data-adaptive-outcome-desktop]');
    const slot = group?.closest('[data-between-blocks]') ?? null;
    const ordered = Array.from(document.body.querySelectorAll('*'));
    const slotIndex = slot ? ordered.indexOf(slot) : -1;
    const outsideSlot = (element) => Boolean(
      slot
      && element !== slot
      && !slot.contains(element)
      && !element.contains(slot),
    );
    const markerCandidates = ordered.filter((element) =>
      outsideSlot(element)
      && visible(element)
      && element.hasAttribute('data-between-blocks-boundary'),
    );
    const previousMarker = markerCandidates
      .filter((element) => ordered.indexOf(element) < slotIndex)
      .at(-1) ?? null;
    const nextMarker = markerCandidates
      .find((element) => ordered.indexOf(element) > slotIndex) ?? null;
    const structuralCandidates = ordered.filter((element) => {
      if (!outsideSlot(element) || !visible(element)) return false;
      const box = element.getBoundingClientRect();
      const display = getComputedStyle(element).display;
      return box.height > 0
        && box.width >= Math.min(innerWidth, slot?.getBoundingClientRect().width ?? innerWidth) / 2
        && display !== 'inline'
        && display !== 'contents';
    });
    const slotBox = slot?.getBoundingClientRect() ?? null;
    const previousFallback = structuralCandidates
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return ordered.indexOf(element) < slotIndex && box.bottom <= (slotBox?.top ?? 0) + 2;
      })
      .sort((left, right) => {
        const leftBox = left.getBoundingClientRect();
        const rightBox = right.getBoundingClientRect();
        return rightBox.bottom - leftBox.bottom || rightBox.width * rightBox.height - leftBox.width * leftBox.height;
      })[0] ?? null;
    const nextFallback = structuralCandidates
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return ordered.indexOf(element) > slotIndex && box.top >= (slotBox?.bottom ?? 0) - 2;
      })
      .sort((left, right) => {
        const leftBox = left.getBoundingClientRect();
        const rightBox = right.getBoundingClientRect();
        return leftBox.top - rightBox.top || rightBox.width * rightBox.height - leftBox.width * leftBox.height;
      })[0] ?? null;
    const previousBoundary = previousMarker ?? previousFallback;
    const nextBoundary = nextMarker ?? nextFallback;
    const childRects = group
      ? Array.from(group.children).filter(visible).map((element) => element.getBoundingClientRect())
      : [];
    const paint = childRects.length > 0
      ? {
          top: Math.min(...childRects.map((box) => box.top)),
          bottom: Math.max(...childRects.map((box) => box.bottom)),
          height: Math.max(...childRects.map((box) => box.bottom)) - Math.min(...childRects.map((box) => box.top)),
        }
      : null;
    const cta = group?.querySelector('[data-mobile-outcome-action]') ?? null;
    const requiredPaintElements = group
      ? Array.from(new Set([
          group,
          ...group.querySelectorAll(':scope > *, h1, h2, h3, p, a, button, [data-mobile-search-empty-icon], [data-analyze-failure-icon]'),
        ])).filter(visible)
      : [];
    const unobscuredPaintElementCount = requiredPaintElements.filter(unobscured).length;
    const boundaryDescriptor = (element, explicit) => ({
      ...rect(element),
      explicit,
      order: element ? ordered.indexOf(element) : -1,
    });

    return {
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      slot: rect(slot),
      layout: rect(group),
      paintRows: childRects.map((box) => ({ top: box.top, bottom: box.bottom })),
      paintElementCount: requiredPaintElements.length,
      unobscuredPaintElementCount,
      paintUnobscured:
        requiredPaintElements.length > 0
        && unobscuredPaintElementCount === requiredPaintElements.length,
      paint,
      cta: rect(cta),
      ctaUnobscured: unobscured(cta),
      previous: boundaryDescriptor(previousBoundary, previousBoundary === previousMarker),
      next: boundaryDescriptor(nextBoundary, nextBoundary === nextMarker),
    };
  });
}

try {
  for (const state of states) {
    for (const language of ['ru', 'kk']) {
      for (const [viewportName, width, height] of mobileViewports) {
        if (language === 'kk' && !kazakhViewports.has(viewportName)) continue;
        const name = `${state.id}-${language}-${viewportName}`;
        console.log(`Checking ${name}`);
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        await page.goto(`${storybook}/iframe.html?id=${state.stories[language]}&viewMode=story`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        const target = page.locator(`${state.mobileSelector}:visible`);
        const targetCta = target.locator('[data-mobile-outcome-action]:visible');
        const splash = page.locator('div[role="status"][aria-live="polite"]:has(img[src="/logo.svg"])');
        await target.waitFor({ timeout: 15000 });
        await targetCta.waitFor({ timeout: 15000 });
        await splash.waitFor({ state: 'hidden', timeout: 15000 });
        await page.evaluate(async () => { await document.fonts.ready; });
        await page.evaluate(() => new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }));

        assert.ok(await target.isVisible(), `${name}: target outcome is visible after route splash`);
        assert.ok(await targetCta.isVisible(), `${name}: target CTA is visible after route splash`);
        assert.equal(await splash.isVisible(), false, `${name}: route splash is removed or hidden before measurement`);

        const result = await measure(page);
        await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
        assert.ok(result.scrollWidth <= width, `${name}: horizontal overflow ${result.scrollWidth} > ${width}`);
        assert.ok(result.slot && result.layout && result.paint && result.cta && result.previous.height && result.next.height, `${name}: full structural geometry`);
        assert.ok(result.slot.x >= -2 && result.slot.right <= width + 2, `${name}: adaptive slot stays within the viewport (${JSON.stringify(result.slot)})`);
        assert.ok(result.layout.x >= -2 && result.layout.right <= width + 2, `${name}: outcome paint stays within the viewport`);
        assert.ok(result.cta.x >= -2 && result.cta.right <= width + 2, `${name}: CTA stays within the viewport`);
        assert.ok(Math.abs(result.slot.y - result.previous.bottom) <= 2, `${name}: slot starts at the nearest visible preceding block`);
        assert.ok(result.previous.order < result.next.order, `${name}: measured structural boundaries preserve document order`);
        for (let index = 1; index < result.paintRows.length; index += 1) {
          assert.ok(result.paintRows[index - 1].bottom <= result.paintRows[index].top + 1, `${name}: outcome paint rows remain sequential without overlap`);
        }

        const idealMidpoint = (result.previous.bottom + result.next.y) / 2;
        const paintMidpoint = (result.paint.top + result.paint.bottom) / 2;
        const availableHeight = result.next.y - result.previous.bottom;
        const centerCanFit = result.paint.height <= availableHeight + 2;

        let postScroll = null;
        if (centerCanFit) {
          assert.ok(Math.abs(result.slot.bottom - result.next.y) <= 2, `${name}: slot ends at the nearest visible following block`);
          assert.ok(Math.abs(paintMidpoint - idealMidpoint) <= 2, `${name}: centered paint midpoint (${paintMidpoint} vs ${idealMidpoint})`);
          assert.ok(
            result.paintUnobscured && result.ctaUnobscured,
            `${name}: all ${result.paintElementCount} paint elements pass the strict topmost hit test (${result.unobscuredPaintElementCount} unobscured)`,
          );
        } else {
          assert.ok(result.paint.top >= result.previous.bottom - 2, `${name}: short outcome follows the preceding block in normal flow`);
          assert.ok(result.scrollHeight > height, `${name}: short intrinsic composition exposes document scrolling`);
          await targetCta.evaluate((element) => element.scrollIntoView({ block: 'center' }));
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
          postScroll = await measure(page);
          assert.ok(postScroll.cta.bottom <= postScroll.next.y + 2, `${name}: post-scroll CTA clears the following visible block`);
          assert.ok(postScroll.ctaUnobscured, `${name}: post-scroll CTA passes the strict topmost hit test`);
        }

        measurements.push({ name, state: state.id, language, width, height, idealMidpoint, paintMidpoint, centerCanFit, ...result, postScroll });
        await page.close();
      }
    }

    const desktopName = `${state.id}-desktop-1440x900`;
    console.log(`Checking ${desktopName}`);
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await desktop.goto(`${storybook}/iframe.html?id=${state.stories.desktop ?? state.stories.ru}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await desktop.locator('[data-mobile-outcome-paint]:visible, [data-adaptive-outcome-desktop]:visible').waitFor({ timeout: 15000 });
    await desktop.evaluate(async () => { await document.fonts.ready; });
    await desktop.waitForTimeout(150);
    const result = await measure(desktop);
    await desktop.screenshot({ path: path.join(outputDir, `${desktopName}.png`), fullPage: false });
    assert.ok(result.scrollWidth <= 1440, `${desktopName}: no horizontal overflow`);
    assert.ok(result.layout && result.paintUnobscured, `${desktopName}: desktop outcome remains visible and unobscured`);
    if (state.id !== 'search') assert.ok(result.cta, `${desktopName}: existing desktop CTA remains visible`);
    measurements.push({ name: desktopName, state: state.id, language: 'ru', width: 1440, height: 900, ...result });
    await desktop.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Adaptive outcome screenshots and measurements saved to ${outputDir}`);
