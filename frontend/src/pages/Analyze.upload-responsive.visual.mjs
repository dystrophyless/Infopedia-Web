import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const storyPath = '/iframe.html?id=pages-analyze--upload-empty-responsive-shell&viewMode=story';
const outputDir = path.join(os.tmpdir(), 'infopedia-analyze-responsive');
const viewports = [
  ['ru-320x568', 'ru', 320, 568],
  ['ru-360x800', 'ru', 360, 800],
  ['ru-375x812', 'ru', 375, 812],
  ['ru-390x844', 'ru', 390, 844],
  ['ru-430x932', 'ru', 430, 932],
  ['kk-320x568', 'kk', 320, 568],
  ['kk-390x844', 'kk', 390, 844],
  ['desktop-1440x900', 'ru', 1440, 900],
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (const [name, language, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.addInitScript((lang) => {
      localStorage.setItem('infopedia_lang', JSON.stringify({ state: { lang } }));
    }, language);
    await page.goto(`${storybook}${storyPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#analyze-file').waitFor({ state: 'attached' });
    await page.locator('[role="status"][aria-label]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(150);

    const result = await page.evaluate(() => {
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: box.x, y: box.y, width: box.width, height: box.height,
          right: box.right, bottom: box.bottom,
          overflow: style.overflow, lineClamp: style.webkitLineClamp,
          textOverflow: style.textOverflow, whiteSpace: style.whiteSpace,
        };
      };
      const label = document.querySelector('label[for="analyze-file"]');
      const form = document.querySelector('form');
      const button = form?.querySelector('button[type="submit"]');
      const cards = [...document.querySelectorAll('form article')];
      const nav = [...document.querySelectorAll('nav')].find((node) => getComputedStyle(node).position === 'fixed' && node.getBoundingClientRect().bottom >= innerHeight - 2);
      return {
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        rail: rect(form),
        dropzone: rect(label),
        cta: rect(button),
        cards: cards.map(rect),
        nav: rect(nav),
        navAnalyzeActive: Boolean(nav?.querySelector('a[href="/analyze"], a[href="/analyze/"]')),
        scrollHeight: document.documentElement.scrollHeight,
      };
    });

    assert.ok(result.scrollWidth <= width, `${name}: horizontal overflow ${result.scrollWidth} > ${width}`);
    const expectedRail = width === 320 ? 16 : width < 768 ? 24 : null;
    let postScroll = null;
    if (expectedRail !== null) {
      assert.equal(Math.round(result.rail.x), expectedRail, `${name}: rail left inset`);
      assert.equal(Math.round(width - result.rail.right), expectedRail, `${name}: rail right inset`);
      assert.equal(Math.round(result.dropzone.width), Math.round(result.rail.width), `${name}: dropzone rail width`);
      assert.equal(Math.round(result.dropzone.height), 214, `${name}: dropzone height`);
      assert.equal(Math.round(result.cta.width), Math.round(result.rail.width), `${name}: CTA rail width`);
      assert.equal(Math.round(result.cta.height), 48, `${name}: CTA height`);
      assert.equal(result.cards.length, 3, `${name}: three benefit cards`);
      for (const [index, card] of result.cards.entries()) {
        assert.ok(card.height >= 96, `${name}: card ${index + 1} min-height`);
        assert.notEqual(card.overflow, 'hidden', `${name}: card ${index + 1} overflow`);
        assert.ok(card.lineClamp === 'none' || card.lineClamp === '', `${name}: card ${index + 1} line clamp`);
        assert.notEqual(card.textOverflow, 'ellipsis', `${name}: card ${index + 1} ellipsis`);
        assert.notEqual(card.whiteSpace, 'nowrap', `${name}: card ${index + 1} nowrap`);
      }
      if (width === 320) {
        assert.deepEqual(result.cards.map((card) => Math.round(card.width)), [288, 288, 288], `${name}: one-column cards`);
      } else {
        assert.equal(Math.round(result.cards[0].width), Math.round(result.cards[1].width), `${name}: first-row equal cards`);
        assert.equal(Math.round(result.cards[1].x - result.cards[0].right), 8, `${name}: first-row gap`);
        assert.equal(Math.round(result.cards[2].width), Math.round(result.rail.width), `${name}: third full-width card`);
      }
      await page.screenshot({ path: path.join(outputDir, `${name}-top.png`), fullPage: false });
      await page.mouse.wheel(0, 10000);
      await page.waitForTimeout(100);
      const bottom = await page.evaluate(() => {
        const lastCard = [...document.querySelectorAll('form article')].at(-1);
        const card = lastCard?.getBoundingClientRect();
        const nav = [...document.querySelectorAll('nav')].find((node) => getComputedStyle(node).position === 'fixed' && node.getBoundingClientRect().bottom >= innerHeight - 2);
        const navTop = nav?.getBoundingClientRect().top ?? innerHeight;
        return card ? { bottom: card.bottom, navTop, clearance: navTop - card.bottom } : null;
      });
      postScroll = bottom;
      assert.ok(bottom && bottom.bottom <= bottom.navTop - 24, `${name}: last card accessible with 24px fixed-nav clearance (${JSON.stringify(bottom)})`);
      assert.ok(result.nav && result.navAnalyzeActive, `${name}: fixed Analyze navigation active`);
    }

    await page.mouse.wheel(0, 10000);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(outputDir, `${name}-bottom.png`), fullPage: false });
    measurements.push({ name, language, width, height, ...result, postScroll });
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Responsive screenshots and measurements saved to ${outputDir}`);
