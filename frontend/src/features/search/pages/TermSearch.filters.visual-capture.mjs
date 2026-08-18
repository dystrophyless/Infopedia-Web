import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.OUTPUT_DIR
  ?? path.resolve(import.meta.dirname, '../../../../test-results/search-filters-task5');
const viewport = { width: 1440, height: 1372 };
const stories = [
  { state: 'default', id: 'pages-search-empty-outcome--desktop-filters-default', menu: null },
  { state: 'edition-menu', id: 'pages-search-empty-outcome--desktop-filters-edition-menu', menu: 'book' },
  { state: 'grade-menu', id: 'pages-search-empty-outcome--desktop-filters-grade-menu', menu: 'grade' },
  { state: 'chapter-menu', id: 'pages-search-empty-outcome--desktop-filters-chapter-menu', menu: 'section' },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const story of stories) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'ru-RU' });
    const page = await context.newPage();
    await page.goto(`${storybook}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    if (story.menu) {
      await page.locator(`[data-desktop-filter-menu="${story.menu}"]`).waitFor({
        state: 'visible',
        timeout: 20_000,
      });
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}',
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const measurement = await page.evaluate((menuId) => {
      const rounded = (value) => Math.round(value * 1000) / 1000;
      const rect = (node) => {
        const box = node?.getBoundingClientRect();
        return box && {
          x: rounded(box.x),
          y: rounded(box.y),
          width: rounded(box.width),
          height: rounded(box.height),
          right: rounded(box.right),
          bottom: rounded(box.bottom),
        };
      };
      const styledRect = (node) => {
        if (!node) return null;
        const computed = getComputedStyle(node);
        return {
          ...rect(node),
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderRadius: computed.borderRadius,
          color: computed.color,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          gap: computed.gap,
          lineHeight: computed.lineHeight,
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
          padding: computed.padding,
        };
      };
      const panel = document.querySelector('[role="dialog"]');
      const overlay = panel?.parentElement ?? null;
      const menu = menuId ? document.querySelector(`[data-desktop-filter-menu="${menuId}"]`) : null;
      return {
        viewport: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          scrollX,
          scrollY,
        },
        overlay: styledRect(overlay),
        panel: styledRect(panel),
        title: styledRect(document.querySelector('#desktop-search-filters-title')),
        close: rect(document.querySelector('[aria-labelledby="desktop-search-filters-title"] button')),
        fields: [...document.querySelectorAll('[data-desktop-search-filter-field]')].map((node) => ({
          id: node.getAttribute('data-desktop-search-filter-field'),
          ...styledRect(node),
        })),
        buttons: {
          reset: rect(document.querySelector('[data-desktop-search-filter-reset]')),
          apply: rect(document.querySelector('[data-desktop-search-filter-apply]')),
        },
        menu: menu && (() => {
          const initialScrollTop = menu.scrollTop;
          menu.scrollTop = menu.scrollHeight;
          const maxScrollTop = menu.scrollTop;
          menu.scrollTop = initialScrollTop;
          return {
            id: menuId,
            ...styledRect(menu),
            clientHeight: menu.clientHeight,
            scrollHeight: menu.scrollHeight,
            initialScrollTop,
            maxScrollTop,
            scrollbarWidth: menu.offsetWidth - menu.clientWidth,
            options: [...menu.querySelectorAll('[role="option"]')].map((node) => ({
              selected: node.getAttribute('aria-selected'),
              ...styledRect(node),
            })),
          };
        })(),
      };
    }, story.menu);

    assert.deepEqual(measurement.viewport, {
      width: 1440,
      height: 1372,
      dpr: 1,
      scrollX: 0,
      scrollY: 0,
    });
    await page.screenshot({
      path: path.join(outputDir, `${story.state}.actual.png`),
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
    await fs.writeFile(
      path.join(outputDir, `${story.state}.measurements.json`),
      `${JSON.stringify(measurement, null, 2)}\n`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`TermSearch DPR1 visual captures saved to ${outputDir}`);
