import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = process.env.SIDEBAR_VISUAL_OUTPUT ?? path.join(os.tmpdir(), 'infopedia-desktop-sidebar');
const states = [
  { id: 'home', activeLabel: 'Главная', figmaNode: '602:2350' },
  { id: 'tests', activeLabel: 'Тесты', figmaNode: '602:2563' },
  { id: 'search', activeLabel: 'Поиск', figmaNode: '602:2617' },
  { id: 'analyze', activeLabel: 'Анализ ЕНТ', figmaNode: '602:2726' },
  { id: 'algosha-ai', activeLabel: 'Algosha AI', figmaNode: '602:2780' },
  { id: 'profile', activeLabel: 'Профиль', figmaNode: '804:1153' },
  { id: 'profile-default', activeLabel: null, figmaNode: '804:1930' },
  { id: 'profile-clicked', activeLabel: null, figmaNode: '804:1936', open: true },
  { id: 'profile-menu-clicked', activeLabel: null, figmaNode: '871:4016', popupNode: '871:4016', open: true, hoverSettings: true },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, received ${actual}`);
}

try {
  for (const state of states) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 1080 }, deviceScaleFactor: 1, locale: 'ru-RU' });
    await page.goto(
      `${storybook}/iframe.html?id=components-desktopsidebar--${state.id}&viewMode=story`,
      { waitUntil: 'domcontentloaded', timeout: 60000 },
    );
    const sidebar = page.locator('[data-desktop-sidebar]');
    await sidebar.waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('img[alt="Infopedia"]').evaluate((image) => image.decode());
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(() => scrollTo(0, 0));
    if (state.open) await page.getByRole('link', { name: 'Избранное' }).waitFor({ state: 'visible' });
    await page.mouse.move(900, 900);
    await page.waitForTimeout(250);
    await page.waitForTimeout(100);

    const result = await page.evaluate(({ activeLabel, open }) => {
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
          gap: computed.gap,
          boxShadow: computed.boxShadow,
          position: computed.position,
          zIndex: computed.zIndex,
          transitionProperty: computed.transitionProperty,
          transitionDuration: computed.transitionDuration,
          transitionTimingFunction: computed.transitionTimingFunction,
        };
      };
      const root = document.querySelector('[data-desktop-sidebar]');
      const logo = root.querySelector('img[alt="Infopedia"]');
      const nav = root.querySelector('nav[aria-label="Основные разделы"]');
      const navRows = [...nav.children];
      const active = activeLabel === 'Профиль' || activeLabel === null
        ? root.querySelector('[data-profile-disclosure] > button')
        : navRows.find((row) => row.textContent.trim() === activeLabel);
      const profileButton = root.querySelector('[data-profile-disclosure] > button');
      const profileText = profileButton.querySelector('span span');
      const planText = profileButton.querySelector('span span + span');
      const popup = root.querySelector('#desktop-sidebar-profile-menu');
      const popupActions = popup ? [...popup.querySelectorAll('a, button')] : [];
      const dividers = popup ? [...popup.querySelectorAll('[data-profile-menu-divider]')] : [];
      return {
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        sidebar: box(root),
        sidebarStyle: style(root),
        logo: box(logo),
        nav: box(nav),
        navRows: navRows.map((row) => ({ box: box(row), style: style(row), icon: box(row.querySelector('svg')), label: box(row.querySelector('span')) })),
        active: { box: box(active), style: style(active) },
        profileButton: box(profileButton),
        profileButtonStyle: style(profileButton),
        inactiveNavStyle: style(navRows.find((row) => row !== active) ?? navRows[0]),
        profileIconStyle: style(profileButton.querySelector('svg')),
        profileTextStyle: style(profileText),
        planTextStyle: style(planText),
        popup: popup ? box(popup) : null,
        popupStyle: popup ? style(popup) : null,
        popupActions: popupActions.map((action) => ({ box: box(action), style: style(action), icon: box(action.querySelector('svg, img, [data-profile-subscription-icon]')), label: box(action.querySelector('span')) })),
        subscriptionIcon: (() => {
          const action = popupActions.find((item) => item.textContent?.trim() === 'РљСѓРїРёС‚СЊ РїРѕРґРїРёСЃРєСѓ');
          const icon = action?.querySelector('[data-profile-subscription-icon]');
          if (!icon) return null;
          const computed = getComputedStyle(icon);
          return { box: box(icon), backgroundColor: computed.backgroundColor, maskImage: computed.maskImage || computed.webkitMaskImage };
        })(),
        dividers: dividers.map((divider) => ({ box: box(divider), style: style(divider) })),
        profileExpanded: profileButton.getAttribute('aria-expanded'),
        profileCurrent: profileButton.getAttribute('aria-current'),
        focusedAction: document.activeElement?.textContent?.trim() ?? null,
        open,
      };
    }, state);

    assert.deepEqual(result.viewport, { width: 1024, height: 1080, devicePixelRatio: 1 }, `${state.id}: deterministic viewport`);
    near(result.sidebar.width, 320, 0.05, `${state.id}: sidebar width`);
    near(result.sidebar.height, 1080, 0.05, `${state.id}: sidebar height`);
    assert.equal(result.sidebarStyle.backgroundColor, 'rgb(255, 255, 255)', `${state.id}: white surface`);
    assert.equal(result.sidebarStyle.borderWidth, '1px', `${state.id}: border width`);
    assert.equal(result.sidebarStyle.borderColor, 'rgb(222, 210, 241)', `${state.id}: border color`);
    assert.equal(result.sidebarStyle.padding, '32px', `${state.id}: padding`);
    assert.equal(result.sidebarStyle.boxShadow, 'none', `${state.id}: no sidebar shadow`);
    assert.equal(result.sidebarStyle.fontFamily, '"Mabry Pro", sans-serif', `${state.id}: Mabry Pro font`);
    near(result.logo.width, 170.37, 0.05, `${state.id}: logo width`);
    near(result.logo.height, 43.736, 0.05, `${state.id}: logo height`);
    near(result.nav.y - result.logo.bottom, 32, 0.05, `${state.id}: logo/nav gap`);
    assert.equal(result.navRows.length, 5, `${state.id}: five navigation rows`);
    result.navRows.forEach((row, index) => {
      near(row.box.width, 256, 0.05, `${state.id}: row ${index + 1} width`);
      near(row.box.height, 48, 0.05, `${state.id}: row ${index + 1} height`);
      near(row.icon.width, 24, 0.05, `${state.id}: row ${index + 1} icon width`);
      near(row.icon.height, 24, 0.05, `${state.id}: row ${index + 1} icon height`);
      near(row.icon.x - row.box.x, 16, 0.05, `${state.id}: row ${index + 1} horizontal padding`);
      near(row.label.x - row.icon.right, 16, 0.05, `${state.id}: row ${index + 1} icon/text gap`);
      assert.equal(row.style.fontSize, '16px', `${state.id}: row ${index + 1} font size`);
      assert.equal(row.style.lineHeight, '16px', `${state.id}: row ${index + 1} line height`);
      assert.equal(row.style.fontWeight, '400', `${state.id}: row ${index + 1} font weight`);
      assert.equal(row.style.borderRadius, '8px', `${state.id}: row ${index + 1} radius`);
      if (index > 0) near(row.box.y - result.navRows[index - 1].box.bottom, 8, 0.05, `${state.id}: row gap ${index}`);
    });
    assert.equal(result.active.style.backgroundColor, state.activeLabel === null ? (state.open ? 'rgb(248, 245, 252)' : 'rgba(0, 0, 0, 0)') : 'rgb(248, 245, 252)', `${state.id}: active background`);
    if (!state.open && state.activeLabel) {
      const activeColor = state.activeLabel === 'Профиль' ? result.profileTextStyle.color : result.active.style.color;
      assert.equal(activeColor, 'rgb(134, 91, 207)', `${state.id}: active color`);
    }
    if (state.open || state.activeLabel === 'Профиль') {
      assert.equal(result.profileTextStyle.color, 'rgb(134, 91, 207)', `${state.id}: active profile text color`);
      assert.equal(result.planTextStyle.color, 'rgb(165, 133, 219)', `${state.id}: active profile plan color`);
      assert.equal(result.profileIconStyle.color, 'rgb(134, 91, 207)', `${state.id}: active profile icon color`);
    }
    near(result.profileButton.width, 256, 0.05, `${state.id}: profile width`);
    near(result.profileButton.height, 48, 0.05, `${state.id}: profile height`);
    near(result.sidebar.bottom - result.profileButton.bottom, 33, 0.05, `${state.id}: profile bottom inset including border`);
    assert.equal(result.profileTextStyle.fontSize, '16px', `${state.id}: username font size`);
    assert.equal(result.profileTextStyle.lineHeight, '16px', `${state.id}: username line height`);
    assert.equal(result.planTextStyle.fontSize, '14px', `${state.id}: plan font size`);
    assert.equal(result.planTextStyle.lineHeight, '14px', `${state.id}: plan line height`);

    await page.mouse.move(result.profileButton.x + 12, result.profileButton.y + 12);
    await page.waitForTimeout(250);
    const hoveredProfile = await page.locator('[data-profile-disclosure] > button').evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        transitionProperty: computed.transitionProperty,
        transitionDuration: computed.transitionDuration,
        transitionTimingFunction: computed.transitionTimingFunction,
        textColor: getComputedStyle(element.querySelector('span span')).color,
        iconColor: getComputedStyle(element.querySelector('svg')).color,
        expanded: element.getAttribute('aria-expanded'),
        current: element.getAttribute('aria-current'),
      };
    });
    assert.equal(hoveredProfile.backgroundColor, 'rgb(248, 245, 252)', `${state.id}: profile hover background`);
    assert.equal(hoveredProfile.transitionProperty, result.inactiveNavStyle.transitionProperty, `${state.id}: profile transition property parity`);
    assert.equal(hoveredProfile.transitionDuration, result.inactiveNavStyle.transitionDuration, `${state.id}: profile transition duration parity`);
    assert.equal(hoveredProfile.transitionTimingFunction, result.inactiveNavStyle.transitionTimingFunction, `${state.id}: profile transition timing parity`);
    assert.equal(hoveredProfile.textColor, result.profileTextStyle.color, `${state.id}: hover preserves text color`);
    assert.equal(hoveredProfile.iconColor, result.profileIconStyle.color, `${state.id}: hover preserves icon color`);
    assert.equal(hoveredProfile.expanded, result.profileExpanded, `${state.id}: hover preserves expanded state`);
    assert.equal(hoveredProfile.current, result.profileCurrent, `${state.id}: hover preserves current state`);
    await page.mouse.move(900, 900);
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator('[data-profile-disclosure] > button').evaluate((element) => getComputedStyle(element).backgroundColor),
      state.open || state.activeLabel === 'Профиль' ? 'rgb(248, 245, 252)' : 'rgba(0, 0, 0, 0)',
      `${state.id}: profile mouseleave transparent`,
    );

    if (state.open) {
      assert.ok(result.subscriptionIcon, `${state.id}: subscription icon should expose a painted mask`);
      near(result.subscriptionIcon.box.width, 20, 0.05, `${state.id}: subscription icon width`);
      near(result.subscriptionIcon.box.height, 20, 0.05, `${state.id}: subscription icon height`);
      assert.equal(result.subscriptionIcon.backgroundColor, 'rgb(76, 38, 140)', `${state.id}: subscription visible paint color`);
      assert.match(result.subscriptionIcon.maskImage, /ai-co-editing/,
        `${state.id}: subscription icon should preserve the tracked glyph asset`);
      assert.equal(result.profileExpanded, 'true', 'profile-clicked: disclosure expanded');
      assert.equal(result.profileCurrent, state.activeLabel === 'Профиль' ? 'page' : null, `${state.id}: current page remains truthful`);
      assert.equal(result.focusedAction, 'Избранное', 'profile-clicked: first enabled action receives focus');
      near(result.popup.width, 256, 0.05, 'profile-clicked: popup width');
      near(result.popup.height, 242, 0.05, `${state.id}: popup height`);
      near(result.profileButton.y - result.popup.bottom, 8, 0.05, 'profile-clicked: popup/profile gap');
      assert.equal(result.popupStyle.backgroundColor, 'rgb(239, 234, 248)', 'profile-clicked: popup background');
      assert.equal(result.popupStyle.padding, '8px', `${state.id}: popup padding`);
      assert.equal(result.popupStyle.position, 'absolute', 'profile-clicked: popup overlays the profile anchor');
      assert.equal(result.popupStyle.zIndex, '20', 'profile-clicked: popup overlays navigation rows');
      assert.equal(result.popupStyle.borderRadius, '16px', 'profile-clicked: popup radius');
      assert.equal(result.popupStyle.gap, '8px', `${state.id}: popup section gap`);
      assert.equal(result.popupStyle.boxShadow, 'none', 'profile-clicked: no popup shadow');
      assert.equal(result.popupActions.length, 6, 'profile-clicked: six actions');
      result.popupActions.forEach((action, index) => {
        near(action.icon.width, 20, 0.05, `profile-clicked: action ${index + 1} icon width`);
        near(action.icon.height, 20, 0.05, `profile-clicked: action ${index + 1} icon height`);
        near(action.box.width, 240, 0.05, `${state.id}: action ${index + 1} width`);
        near(action.box.height, 32, 0.05, `${state.id}: action ${index + 1} height`);
        near(action.label.x - action.icon.right, 8, 0.05, `profile-clicked: action ${index + 1} icon/text gap`);
        assert.equal(action.style.fontSize, '14px', `profile-clicked: action ${index + 1} font size`);
        assert.equal(action.style.lineHeight, '14px', `profile-clicked: action ${index + 1} line height`);
        assert.equal(action.style.color, 'rgb(76, 38, 140)', `profile-clicked: action ${index + 1} text color`);
        assert.equal(action.style.borderRadius, '4px', `${state.id}: action ${index + 1} radius`);
        assert.equal(action.style.transitionProperty, result.inactiveNavStyle.transitionProperty, `profile-clicked: action ${index + 1} transition property parity`);
        assert.equal(action.style.transitionDuration, result.inactiveNavStyle.transitionDuration, `profile-clicked: action ${index + 1} transition duration parity`);
      });
      const enabledAction = page.getByRole('link', { name: 'Избранное' });
      await enabledAction.hover();
      await page.waitForTimeout(250);
      assert.equal(await enabledAction.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(222, 210, 241)', `${state.id}: enabled action hover`);
      if (state.hoverSettings) {
        const settingsAction = page.getByRole('link', { name: 'Настройки' });
        await settingsAction.hover();
        await page.waitForTimeout(250);
        assert.equal(await settingsAction.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(222, 210, 241)', `${state.id}: Settings hover`);
        for (const label of ['Избранное', 'Слабые темы', 'Купить подписку', 'Справка', 'Выйти']) {
          const locator = label === 'Справка' || label === 'Выйти'
            ? page.getByRole('button', { name: label })
            : page.getByRole('link', { name: label });
          assert.equal(await locator.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', `${state.id}: non-hovered ${label} transparent`);
        }
      }
      const helpAction = page.getByRole('button', { name: 'Справка' });
      await helpAction.hover();
      await page.waitForTimeout(250);
      assert.equal(await helpAction.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'profile-clicked: disabled Help remains transparent on hover');
      assert.equal(await helpAction.getAttribute('disabled'), '', 'profile-clicked: Help remains disabled');
      assert.equal(result.dividers.length, 2, 'profile-clicked: two dividers');
      result.dividers.forEach((divider, index) => {
        near(divider.box.width, 240, 0.05, `${state.id}: divider ${index + 1} width`);
        near(divider.box.height, 1, 0.05, `profile-clicked: divider ${index + 1} height`);
        assert.equal(divider.style.backgroundColor, 'rgb(222, 210, 241)', `profile-clicked: divider ${index + 1} color`);
      });
    } else {
      assert.equal(result.profileExpanded, 'false', `${state.id}: profile closed`);
      assert.equal(result.popup, null, `${state.id}: popup absent`);
    }

    if (state.open) {
      await page.evaluate(() => document.activeElement?.blur());
    }
    await sidebar.screenshot({ path: path.join(outputDir, `${state.id}.png`) });
    measurements.push({ state: state.id, storyId: `components-desktopsidebar--${state.id}`, figmaNode: state.figmaNode, popupNode: state.popupNode ?? null, ...result });
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Desktop sidebar screenshots and measurements saved to ${outputDir}`);
