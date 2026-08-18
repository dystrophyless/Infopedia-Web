import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.NAVBAR_LANGUAGE_OUTPUT ?? path.resolve('test-results/navbar-language-clicked');
const story = 'components-navbar--default';

await fs.mkdir(outputDir, { recursive: true });

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, received ${actual}`);
}

const browser = await chromium.launch({ headless: true });
const measurements = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${storybook}/iframe.html?id=${story}&viewMode=story`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-desktop-guest-navbar]').waitFor({ state: 'visible', timeout: 30_000 });
  const trigger = page.locator('button[aria-controls="lang-menu"]');
  await trigger.click();
  await page.locator('#lang-menu').waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.locator('#lang-menu [role="menuitem"][aria-current="true"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const selected = document.querySelector('#lang-menu [role="menuitem"][aria-current="true"]');
    if (!selected) return false;
    const computed = getComputedStyle(selected);
    return computed.outlineStyle === 'none' || computed.outlineColor === 'rgba(0, 0, 0, 0)';
  }, null, { timeout: 30_000 });

  const result = await page.evaluate(() => {
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const style = (element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        borderWidth: computed.borderWidth,
        borderRadius: computed.borderRadius,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        padding: computed.padding,
        position: computed.position,
        zIndex: computed.zIndex,
        boxShadow: computed.boxShadow,
        overflow: computed.overflow,
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        outlineOffset: computed.outlineOffset,
      };
    };
    const header = document.querySelector('[data-desktop-guest-navbar]');
    const trigger = document.querySelector('button[aria-controls="lang-menu"]');
    const menu = document.querySelector('#lang-menu');
    const rows = [...document.querySelectorAll('#lang-menu [role="menuitem"]')];
    const navbarRail = document.querySelector('[data-desktop-content-rail]');
    const heroAnchor = document.querySelector('[data-desktop-guest-hero]');
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      header: box(header),
      trigger: box(trigger),
      triggerStyle: style(trigger),
      menu: box(menu),
      menuStyle: style(menu),
      rows: rows.map((row) => ({ box: box(row), style: style(row), label: row.textContent.trim(), current: row.getAttribute('aria-current'), svgCount: row.querySelectorAll('svg').length })),
      navbarRail: box(navbarRail),
      heroAnchor: heroAnchor ? box(heroAnchor) : null,
      overflow: { html: document.documentElement.scrollWidth, body: document.body.scrollWidth },
      activeElement: document.activeElement?.textContent?.trim() ?? null,
    };
  });

  assert.deepEqual(result.viewport, { width: 1440, height: 900, devicePixelRatio: 1 }, 'deterministic desktop viewport');
  assert.deepEqual(result.header, { x: 0, y: 0, width: 1440, height: 64, right: 1440, bottom: 64 }, 'navbar remains at the 1440x64 origin frame');
  near(result.menu.right, result.trigger.right, 0.5, 'popup right aligns to trigger right');
  near(result.menu.y - result.trigger.bottom, 8, 0.5, 'popup overlays below trigger with an 8px gap');
  near(result.menu.width, 160, 0.5, 'popup width');
  near(result.menu.height, 66, 0.5, 'popup natural height');
  assert.equal(result.menuStyle.backgroundColor, 'rgb(255, 255, 255)', 'popup white background');
  assert.equal(result.menuStyle.borderWidth, '1px', 'popup border width');
  assert.equal(result.menuStyle.borderColor, 'rgb(234, 233, 236)', 'popup border color');
  assert.equal(result.menuStyle.borderRadius, '8px', 'popup radius');
  assert.equal(result.menuStyle.padding, '4px', 'popup padding');
  assert.equal(result.menuStyle.position, 'absolute', 'popup overlays rather than shifting layout');
  assert.equal(result.menuStyle.zIndex, '50', 'popup z-index');
  assert.ok(result.menuStyle.boxShadow === 'none' || /rgba\(0, 0, 0, 0\)/.test(result.menuStyle.boxShadow), `popup has no painted shadow: ${result.menuStyle.boxShadow}`);
  assert.equal(result.rows.length, 2, 'RU and KK are the only language rows');
  for (const [index, row] of result.rows.entries()) {
    near(row.box.width, 150, 0.5, `row ${index + 1} inner width`);
    near(row.box.height, 28, 0.5, `row ${index + 1} height`);
    assert.equal(row.style.borderRadius, '4px', `row ${index + 1} radius`);
    assert.equal(row.style.padding, '6px 8px', `row ${index + 1} padding`);
    assert.equal(row.style.fontSize, '14px', `row ${index + 1} font size`);
    assert.equal(row.style.fontWeight, '400', `row ${index + 1} regular weight`);
    assert.equal(row.style.color, 'rgb(22, 21, 25)', `row ${index + 1} dark text`);
    assert.equal(row.style.backgroundColor, 'rgba(0, 0, 0, 0)', `row ${index + 1} transparent paint`);
    assert.ok(row.style.outlineStyle === 'none' || row.style.outlineColor === 'rgba(0, 0, 0, 0)', `row ${index + 1} pointer-open state has no painted outline`);
  }
  assert.deepEqual(result.rows.map((row) => row.label), ['Русский', 'Қазақша'], 'localized RU/KK labels');
  assert.deepEqual(result.rows.map((row) => row.svgCount), [1, 0], 'only selected RU row paints Tick02');
  assert.equal(result.rows[0].current, 'true', 'RU row is selected');
  assert.equal(result.rows[1].current, null, 'KK row is unselected');
  assert.deepEqual(result.navbarRail, { x: 160, y: 15, width: 1120, height: 34, right: 1280, bottom: 49 }, 'navbar content rail remains fixed while popup is open');
  assert.ok(result.overflow.html <= 1440, `desktop html must not overflow: ${result.overflow.html}`);
  assert.ok(result.overflow.body <= 1440, `desktop body must not overflow: ${result.overflow.body}`);
  await page.screenshot({ path: path.join(outputDir, 'language-clicked-1440.png'), fullPage: false });

  const menu = page.locator('#lang-menu');
  const russianKeyboard = page.getByRole('menuitem', { name: 'Русский' });
  const kazakhKeyboard = page.getByRole('menuitem', { name: 'Қазақша' });
  await russianKeyboard.hover();
  assert.equal(await russianKeyboard.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(248, 245, 252)', 'RU row hover paint');
  await kazakhKeyboard.hover();
  assert.equal(await kazakhKeyboard.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(248, 245, 252)', 'KK row hover paint');
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => [...document.querySelectorAll('#lang-menu [role="menuitem"]')].every((row) => getComputedStyle(row).backgroundColor === 'rgba(0, 0, 0, 0)'), null, { timeout: 5_000 });
  const pointerRussianFocus = await russianKeyboard.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { outlineStyle: computed.outlineStyle, outlineColor: computed.outlineColor };
  });
  assert.ok(pointerRussianFocus.outlineStyle === 'none' || pointerRussianFocus.outlineColor === 'rgba(0, 0, 0, 0)', 'pointer-open RU row has no painted outline');
  await russianKeyboard.press('ArrowDown');
  const kazakhFocus = await kazakhKeyboard.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { active: document.activeElement === element, outlineStyle: computed.outlineStyle, outlineWidth: computed.outlineWidth, outlineColor: computed.outlineColor, outlineOffset: computed.outlineOffset };
  });
  assert.deepEqual(kazakhFocus, { active: true, outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(106, 55, 195)', outlineOffset: '-2px' }, 'keyboard ArrowDown from pointer-open moves the visible focus indicator to KK');
  await kazakhKeyboard.press('ArrowUp');
  const russianFocus = await russianKeyboard.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { active: document.activeElement === element, outlineStyle: computed.outlineStyle, outlineWidth: computed.outlineWidth, outlineColor: computed.outlineColor, outlineOffset: computed.outlineOffset };
  });
  assert.deepEqual(russianFocus, { active: true, outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(106, 55, 195)', outlineOffset: '-2px' }, 'keyboard ArrowUp returns the visible focus indicator to RU');
  await russianKeyboard.press('ArrowDown');
  await kazakhKeyboard.press('Enter');
  await expectClosed(page, menu, 'keyboard selection closes popup');
  assert.equal(await trigger.textContent(), 'KK');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('infopedia_lang') ?? 'null')?.state?.lang);
  assert.equal(persisted, 'kk', 'keyboard selection persists KK in the language store');

  await trigger.click();
  await page.keyboard.press('Escape');
  await expectClosed(page, menu, 'Escape closes popup');
  await trigger.click();
  await page.mouse.click(20, 400);
  await expectClosed(page, menu, 'outside click closes popup');
  measurements.push({ state: 'language-clicked', story, ...result, persistedLanguage: persisted });
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.goto(`${storybook}/iframe.html?id=${story}&viewMode=story`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await mobile.locator('[data-desktop-guest-navbar]').waitFor({ state: 'attached', timeout: 30_000 });
  const mobileResult = await mobile.evaluate(() => ({
    headerDisplay: getComputedStyle(document.querySelector('[data-desktop-guest-navbar]')).display,
    htmlScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  assert.equal(mobileResult.headerDisplay, 'none', 'desktop navbar is hidden at 390px');
  assert.ok(mobileResult.htmlScrollWidth <= 390, `mobile html must not overflow: ${mobileResult.htmlScrollWidth}`);
  assert.ok(mobileResult.bodyScrollWidth <= 390, `mobile body must not overflow: ${mobileResult.bodyScrollWidth}`);
  measurements.push({ state: 'mobile-390-smoke', story, viewport: { width: 390, height: 900, devicePixelRatio: 1 }, ...mobileResult });
  await mobile.close();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Navbar language clicked screenshots and measurements saved to ${outputDir}`);

async function expectClosed(page, menu, message) {
  await menu.waitFor({ state: 'detached', timeout: 5_000 });
  assert.equal(await page.locator('button[aria-controls="lang-menu"]').getAttribute('aria-expanded'), 'false', message);
}
