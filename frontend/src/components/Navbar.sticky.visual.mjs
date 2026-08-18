import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000/';
const browserChannel = process.env.BROWSER_CHANNEL || undefined;
const outputDir = path.resolve(import.meta.dirname, '../../test-results/navbar-sticky');
await fs.mkdir(outputDir, { recursive: true });

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}±${tolerance}, got ${actual}`);
}

async function seedGuest(page) {
  await page.addInitScript(() => {
    localStorage.setItem('infopedia_lang', JSON.stringify({ state: { lang: 'ru' }, version: 0 }));
    localStorage.removeItem('infopedia_auth');
  });
}

async function ready(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*,:before,:after{animation:none!important}' });
  await page.locator('[data-desktop-guest-navbar]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
}

async function measure(page) {
  return page.evaluate(() => {
    const navbar = document.querySelector('[data-desktop-guest-navbar]');
    const rail = navbar?.querySelector('[data-desktop-content-rail]');
    const rect = navbar?.getBoundingClientRect();
    const navbarStyle = navbar ? getComputedStyle(navbar) : null;
    const bodyStyle = getComputedStyle(document.body);
    return {
      dpr: window.devicePixelRatio,
      scrollY: window.scrollY,
      hash: window.location.hash,
      active: document.querySelector('[data-desktop-guest-navbar] a[aria-current="true"]')?.getAttribute('href') ?? null,
      documentScroller: document.scrollingElement === document.documentElement,
      bodyOverflowX: bodyStyle.overflowX,
      bodyOverflowY: bodyStyle.overflowY,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      navbar: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null,
      position: navbarStyle?.position ?? null,
      zIndex: navbarStyle?.zIndex ?? null,
      display: navbarStyle?.display ?? null,
      visibility: navbarStyle?.visibility ?? null,
      opacity: navbarStyle?.opacity ?? null,
      rail: rail ? (() => { const r = rail.getBoundingClientRect(); return { x: r.x, width: r.width }; })() : null,
      desktopDisplay: navbar ? navbarStyle.display : null,
    };
  });
}

function assertDesktopCheckpoint(metrics, width, label) {
  assert.equal(metrics.dpr, 1, `${label}: DPR must be exactly 1`);
  assert.equal(metrics.documentScroller, true, `${label}: documentElement must be the scrolling element`);
  assert.equal(metrics.bodyOverflowX, 'clip', `${label}: body overflow-x must be clip`);
  assert.equal(metrics.bodyOverflowY, 'visible', `${label}: body overflow-y must be visible`);
  assert.equal(metrics.position, 'sticky', `${label}: navbar must remain sticky`);
  near(metrics.navbar?.y ?? Number.NaN, 0, 0.5, `${label}: navbar y`);
  near(metrics.navbar?.height ?? Number.NaN, 64, 0.5, `${label}: navbar height`);
  assert.equal(metrics.zIndex, '40', `${label}: navbar z-index`);
  assert.equal(metrics.visibility, 'visible', `${label}: navbar visibility`);
  assert.equal(metrics.opacity, '1', `${label}: navbar opacity`);
  assert.notEqual(metrics.display, 'none', `${label}: navbar display must not be none`);
  assert.ok((metrics.navbar?.width ?? 0) > 0, `${label}: navbar must remain visible`);
  assert.ok(metrics.documentWidth <= width, `${label}: document must not overflow horizontally`);
  assert.ok(metrics.bodyWidth <= width, `${label}: body must not overflow horizontally`);
  if (width >= 1440) {
    near(metrics.rail?.width ?? Number.NaN, 1120, 0.5, `${label}: content rail width`);
    near(metrics.rail?.x ?? Number.NaN, (width - 1120) / 2, 0.5, `${label}: content rail x`);
  }
}

async function runDesktopScenario(browser, width, scenario) {
  const context = await browser.newContext({ viewport: { width, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await seedGuest(page);
  try {
    await ready(page);
    const checkpoints = [];
    const checkpoint = async (label) => {
      const metrics = await measure(page);
      assertDesktopCheckpoint(metrics, width, `${scenario}/${label}/${width}`);
      checkpoints.push({ label, ...metrics });
      return metrics;
    };

    const initial = await checkpoint('initial');
    if (scenario === 'direct-scroll') {
      await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
      await page.waitForFunction((before) => window.scrollY > before, initial.scrollY);
      await checkpoint('direct-scroll');
    } else if (scenario === 'mouse-wheel') {
      await page.mouse.wheel(0, 1200);
      await page.waitForFunction((before) => window.scrollY > before, initial.scrollY);
      await checkpoint('mouse-wheel');
    } else if (scenario === 'native-click') {
      await page.locator('[data-desktop-guest-navbar] a[href="#desktop-analysis"]').click();
      await page.waitForFunction(() => window.location.hash === '#desktop-analysis');
      await page.waitForFunction(() => document.querySelector('[data-desktop-guest-navbar] a[href="#desktop-analysis"]')?.getAttribute('aria-current') === 'true');
      const clicked = await checkpoint('native-click');
      assert.ok(clicked.scrollY > initial.scrollY, `${scenario}/${width}: native anchor click must advance scroll`);
      assert.equal(clicked.hash, '#desktop-analysis', `${scenario}/${width}: native anchor hash`);
      assert.equal(clicked.active, '#desktop-analysis', `${scenario}/${width}: native anchor aria-current`);
    }

    await fs.writeFile(path.join(outputDir, `${width}-${scenario}.json`), `${JSON.stringify(checkpoints, null, 2)}\n`);
    return checkpoints;
  } finally {
    await context.close();
  }
}

async function runMobileSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await seedGuest(page);
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '*,:before,:after{animation:none!important}' });
    await page.locator('header:not([data-desktop-guest-navbar])').waitFor({ state: 'visible' });
    const metrics = await page.evaluate(() => {
      const desktop = document.querySelector('[data-desktop-guest-navbar]');
      const mobile = document.querySelector('header:not([data-desktop-guest-navbar])');
      const bodyStyle = getComputedStyle(document.body);
      return {
        width: innerWidth,
        dpr: devicePixelRatio,
        desktopDisplay: desktop ? getComputedStyle(desktop).display : null,
        mobileDisplay: mobile ? getComputedStyle(mobile).display : null,
        documentScroller: document.scrollingElement === document.documentElement,
        overflowX: bodyStyle.overflowX,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      };
    });
    assert.equal(metrics.width, 390);
    assert.equal(metrics.dpr, 1, '390px: DPR must be exactly 1');
    assert.equal(metrics.desktopDisplay, 'none', '390px: desktop navbar must be hidden');
    assert.notEqual(metrics.mobileDisplay, 'none', '390px: mobile navbar must be visible');
    assert.equal(metrics.documentScroller, true, '390px: documentElement must be the scrolling element');
    assert.equal(metrics.overflowX, 'clip', '390px: body overflow-x must be clip');
    assert.ok(metrics.documentWidth <= 390, '390px: document must not overflow horizontally');
    assert.ok(metrics.bodyWidth <= 390, '390px: body must not overflow horizontally');
    await fs.writeFile(path.join(outputDir, '390-mobile-smoke.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true, ...(browserChannel ? { channel: browserChannel } : {}) });
try {
  for (const width of [1440, 1912, 1920]) {
    for (const scenario of ['direct-scroll', 'mouse-wheel', 'native-click']) {
      await runDesktopScenario(browser, width, scenario);
    }
  }
  await runMobileSmoke(browser);
} finally {
  await browser.close();
}

console.log(`Navbar sticky visual artifacts written to ${outputDir}${browserChannel ? ` (channel ${browserChannel})` : ''}`);
