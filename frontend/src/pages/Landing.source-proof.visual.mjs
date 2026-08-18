import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000/';
const outputDir = path.resolve(import.meta.dirname, '../../test-results/landing-source-proof');
await fs.mkdir(outputDir, { recursive: true });

async function inspectViewport(browser, name, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      localStorage.setItem('infopedia_lang', JSON.stringify({ state: { lang: 'ru' }, version: 0 }));
      localStorage.removeItem('infopedia_auth');
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: '*,:before,:after{animation:none!important}',
    });

    const target = name === 'mobile-390'
      ? page.locator('#mobile-source-proof > div')
      : page.locator('[data-source-proof-card]');
    await target.waitFor({ state: 'visible' });
    await target.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    if (name === 'desktop-1440') {
      await page.locator('[data-source-proof-left] a').focus();
    }

    const metrics = await page.evaluate(() => {
      const normalize = (value) => value?.replace(/\s+/g, ' ').trim() ?? '';
      const rectOf = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        };
      };
      const styleOf = (element) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          padding: style.padding,
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          gap: style.gap,
          margin: style.margin,
          overflow: style.overflow,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          transform: style.transform,
          position: style.position,
        };
      };

      const card = document.querySelector('[data-source-proof-card]');
      const left = document.querySelector('[data-source-proof-left]');
      const right = document.querySelector('[data-source-proof-right]');
      const allRails = [...document.querySelectorAll('[data-desktop-content-rail]')];
      const railStyle = (element) => {
        const style = element ? getComputedStyle(element) : null;
        return style ? {
          maxWidth: style.maxWidth,
          padding: style.padding,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
        } : null;
      };
      const navbarRail = document.querySelector('[data-desktop-guest-navbar] [data-desktop-content-rail]');
      const heroRail = allRails.find((element) => !element.closest('[data-desktop-guest-navbar]') && !element.closest('#tools') && !element.closest('#featured-terms') && !element.closest('#desktop-analysis'));
      const featureRail = document.querySelector('#tools [data-desktop-content-rail]');
      const sourceRail = document.querySelector('#featured-terms [data-desktop-content-rail]');
      const analysisRail = document.querySelector('#desktop-analysis [data-desktop-content-rail]');
      const featureGrid = document.querySelector('#desktop-feature-rail');
      const analysisStage = document.querySelector('[data-analysis-stage]');
      const desktopBranch = card?.closest('.hidden.md\\:block');
      const mobileBranch = document.querySelector('#mobile-source-proof')?.closest('.md\\:hidden');
      const cta = card?.querySelector('a');
      const heading = left?.querySelector('h3');
      const accent = heading?.querySelector('span');
      const description = left?.querySelector('p');
      const divider = right?.querySelector('.h-px');
      const rightHeading = right?.querySelector('h3');
      const rows = right ? [...right.querySelectorAll('dl > div')].map((row) => ({
        label: normalize(row.querySelector('dt')?.textContent),
        value: normalize(row.querySelector('dd')?.textContent),
        labelStyle: styleOf(row.querySelector('dt')),
        valueStyle: styleOf(row.querySelector('dd')),
        rect: rectOf(row),
      })) : [];
      const mobileProof = document.querySelector('#mobile-source-proof');
      const mobileChildren = mobileProof ? [...mobileProof.querySelectorAll('*')]
        .map((element) => ({ tag: element.tagName, text: normalize(element.textContent), rect: rectOf(element), style: styleOf(element) }))
        .filter(({ rect }) => rect?.width > 0 && rect?.height > 0)
        .slice(0, 12) : [];
      return {
        viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, dpr: devicePixelRatio },
        fonts: document.fonts.status,
        scrollY,
        scroll: { documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth },
        rails: {
          navbar: { rect: rectOf(navbarRail), style: railStyle(navbarRail) },
          hero: { rect: rectOf(heroRail), style: railStyle(heroRail) },
          features: { rect: rectOf(featureRail), style: railStyle(featureRail) },
          source: { rect: rectOf(sourceRail), style: railStyle(sourceRail) },
          analysis: { rect: rectOf(analysisRail), style: railStyle(analysisRail) },
        },
        featureGrid: rectOf(featureGrid),
        analysisStage: rectOf(analysisStage),
        card: rectOf(card),
        left: rectOf(left),
        right: rectOf(right),
        rail: rectOf(sourceRail),
        copy: {
          title: `${normalize(heading?.childNodes[0]?.textContent)} ${normalize(accent?.textContent)}`.trim(),
          accent: normalize(accent?.textContent),
          description: normalize(description?.textContent),
          rightHeading: normalize(rightHeading?.textContent),
          metadata: rows.map(({ label, value }) => ({ label, value })),
        },
        cta: cta ? {
          href: cta.getAttribute('href'),
          text: normalize(cta.textContent),
          rect: rectOf(cta),
          style: styleOf(cta),
          focused: document.activeElement === cta,
          focusVisible: cta.matches(':focus-visible'),
        } : null,
        styles: {
          card: styleOf(card),
          left: styleOf(left),
          right: styleOf(right),
          heading: styleOf(heading),
          accent: styleOf(accent),
          description: styleOf(description),
          rightHeading: styleOf(rightHeading),
        },
        divider: { rect: rectOf(divider), style: styleOf(divider) },
        metadata: rows,
        mobileProof: { rect: rectOf(mobileProof), text: normalize(mobileProof?.textContent) },
        mobileChildren,
        branches: {
          desktopDisplay: desktopBranch ? getComputedStyle(desktopBranch).display : null,
          mobileDisplay: mobileBranch ? getComputedStyle(mobileBranch).display : null,
        },
      };
    });

    if (name === 'desktop-1440') {
      assert.equal(metrics.viewport.dpr, 1, 'desktop DPR must be exactly 1');
      assert.equal(metrics.viewport.width, 1440, 'desktop viewport must be exactly 1440px');
      assert.equal(metrics.viewport.clientWidth, 1440, 'desktop document client width must be exactly 1440px');
      assert.equal(metrics.fonts, 'loaded', 'desktop fonts must be loaded');
      for (const [name, rail] of Object.entries(metrics.rails)) {
        assert.ok(Math.abs(rail.rect.x - 160) <= 0.5, `${name} rail x must be 160±0.5, got ${rail.rect.x}`);
        assert.ok(Math.abs(rail.rect.width - 1120) <= 0.5, `${name} rail width must be 1120±0.5, got ${rail.rect.width}`);
        assert.equal(rail.style.maxWidth, '1120px', `${name} rail computed max-width must be 1120px`);
        assert.equal(rail.style.paddingLeft, '0px', `${name} rail computed left padding must be 0px`);
        assert.equal(rail.style.paddingRight, '0px', `${name} rail computed right padding must be 0px`);
      }
      assert.ok(Math.abs(metrics.featureGrid.x - 160) <= 0.5, `feature grid x must be 160±0.5, got ${metrics.featureGrid.x}`);
      assert.ok(Math.abs(metrics.featureGrid.width - 1120) <= 0.5, `feature grid width must be 1120±0.5, got ${metrics.featureGrid.width}`);
      assert.ok(Math.abs(metrics.analysisStage.x - 160) <= 0.5, `analysis stage x must be 160±0.5, got ${metrics.analysisStage.x}`);
      assert.ok(Math.abs(metrics.analysisStage.width - 1120) <= 0.5, `analysis stage width must be 1120±0.5, got ${metrics.analysisStage.width}`);
      assert.ok(Math.abs(metrics.card.x - 160) <= 0.5, `card x must be 160±0.5, got ${metrics.card.x}`);
      assert.ok(Math.abs(metrics.card.width - 1120) <= 0.5, `card width must be 1120, got ${metrics.card.width}`);
      assert.ok(Math.abs(metrics.left.width - 720) <= 0.5, `left width must be 720, got ${metrics.left.width}`);
      assert.ok(Math.abs(metrics.right.x - metrics.card.x - 720) <= 0.5, 'right panel must start at card x + 720');
      assert.ok(Math.abs(metrics.right.width - 400) <= 0.5, `right width must be 400, got ${metrics.right.width}`);
      assert.ok(metrics.scroll.documentWidth <= metrics.viewport.width, 'desktop document must not overflow horizontally');
      assert.ok(metrics.scroll.bodyWidth <= metrics.viewport.width, 'desktop body must not overflow horizontally');
      assert.equal(metrics.styles.card.borderRadius, '16px');
      assert.equal(metrics.styles.card.overflow, 'hidden');
      assert.equal(metrics.styles.card.transform, 'none');
      assert.equal(metrics.styles.card.position, 'static');
      assert.deepEqual(metrics.copy, {
        title: 'Не просто объясняем. Показываем источник.',
        accent: 'Показываем источник.',
        description:
          'У каждого термина есть точная ссылка на издание, тему и страницу — поэтому определение легко проверить в учебнике.',
        rightHeading: 'Источник определения',
        metadata: [
          { label: 'Издание', value: 'Атамұра, 9-класс' },
          { label: 'Тема', value: '2.1. Сетевой этикет' },
          { label: 'Страница', value: '26' },
        ],
      });
      assert.equal(metrics.cta.href, '/onboarding');
      assert.equal(metrics.cta.text, 'Посмотреть термины →');
      assert.ok(metrics.cta.rect.width >= 224 && metrics.cta.rect.width <= 228, `CTA width must fit the source copy, got ${metrics.cta.rect.width}`);
      assert.equal(metrics.cta.rect.height, 40);
      assert.equal(metrics.cta.style.backgroundColor, 'rgb(106, 55, 195)');
      assert.equal(metrics.cta.style.color, 'rgb(255, 255, 255)');
      assert.equal(metrics.cta.style.padding, '0px 24px');
      assert.equal(metrics.cta.style.borderRadius, '8px');
      assert.equal(metrics.cta.style.fontSize, '16px');
      assert.equal(metrics.cta.style.lineHeight, '16px');
      assert.equal(metrics.cta.style.fontWeight, '500');
      assert.equal(metrics.cta.style.margin, '24px 0px 0px');
      assert.equal(metrics.cta.focused, true);
      assert.equal(metrics.cta.focusVisible, true);
      assert.equal(metrics.cta.style.outlineStyle, 'solid');
      assert.equal(metrics.cta.style.outlineWidth, '2px');
      assert.equal(metrics.cta.style.outlineColor, 'rgb(106, 55, 195)');
      assert.equal(metrics.styles.left.backgroundColor, 'rgb(255, 255, 255)');
      assert.equal(metrics.styles.left.padding, '32px');
      assert.equal(metrics.styles.heading.color, 'rgb(22, 21, 25)');
      assert.equal(metrics.styles.heading.fontSize, '24px');
      assert.equal(metrics.styles.heading.lineHeight, '24px');
      assert.equal(metrics.styles.heading.fontWeight, '500');
      assert.equal(metrics.styles.accent.color, 'rgb(106, 55, 195)');
      assert.equal(metrics.styles.description.color, 'rgb(110, 103, 121)');
      assert.equal(metrics.styles.description.fontSize, '16px');
      assert.equal(metrics.styles.description.lineHeight, '16px');
      assert.equal(metrics.styles.description.fontWeight, '400');
      assert.equal(metrics.styles.description.margin, '16px 0px 0px');
      assert.equal(metrics.styles.right.backgroundColor, 'rgb(106, 55, 195)');
      assert.equal(metrics.styles.right.padding, '32px');
      assert.equal(metrics.styles.rightHeading.color, 'rgb(239, 234, 248)');
      assert.equal(metrics.styles.rightHeading.fontSize, '20px');
      assert.equal(metrics.styles.rightHeading.lineHeight, '20px');
      assert.equal(metrics.styles.rightHeading.fontWeight, '500');
      assert.equal(metrics.divider.rect.height, 1);
      assert.equal(metrics.divider.style.backgroundColor, 'rgb(134, 91, 207)');
      assert.equal(metrics.divider.style.margin, '24px 0px');
      assert.deepEqual(metrics.metadata.map(({ rect }) => rect.height), [16, 16, 16]);
      assert.deepEqual(
        metrics.metadata.map(({ rect }) => rect.y),
        [metrics.metadata[0].rect.y, metrics.metadata[0].rect.y + 32, metrics.metadata[0].rect.y + 64],
      );
      for (const row of metrics.metadata) {
        assert.equal(row.labelStyle.color, 'rgb(222, 210, 241)');
        assert.equal(row.labelStyle.fontSize, '16px');
        assert.equal(row.labelStyle.lineHeight, '16px');
        assert.equal(row.labelStyle.fontWeight, '400');
        assert.equal(row.valueStyle.color, 'rgb(255, 255, 255)');
        assert.equal(row.valueStyle.fontSize, '16px');
        assert.equal(row.valueStyle.lineHeight, '16px');
        assert.equal(row.valueStyle.fontWeight, '500');
      }
    }

    if (name === 'desktop-1439') {
      assert.equal(metrics.viewport.dpr, 1, '1439px DPR must be exactly 1');
      assert.equal(metrics.viewport.width, 1439, 'fallback viewport must be exactly 1439px');
      assert.equal(metrics.viewport.clientWidth, 1439, 'fallback document client width must be exactly 1439px');
      for (const [name, rail] of Object.entries(metrics.rails)) {
        assert.ok(Math.abs(rail.rect.x - 143.5) <= 0.5, `${name} fallback rail x must be 143.5±0.5, got ${rail.rect.x}`);
        assert.ok(Math.abs(rail.rect.width - 1152) <= 0.5, `${name} fallback rail width must be 1152±0.5, got ${rail.rect.width}`);
        assert.equal(rail.style.maxWidth, '1152px', `${name} fallback computed max-width must be 1152px`);
        assert.equal(rail.style.paddingLeft, '24px', `${name} fallback left padding must be 24px`);
        assert.equal(rail.style.paddingRight, '24px', `${name} fallback right padding must be 24px`);
      }
      assert.ok(Math.abs(metrics.featureGrid.x - 167.5) <= 0.5, `fallback feature grid x must be 167.5±0.5, got ${metrics.featureGrid.x}`);
      assert.ok(Math.abs(metrics.featureGrid.width - 1104) <= 0.5, `fallback feature grid width must be 1104±0.5, got ${metrics.featureGrid.width}`);
      assert.ok(Math.abs(metrics.analysisStage.x - 167.5) <= 0.5, `fallback analysis stage x must be 167.5±0.5, got ${metrics.analysisStage.x}`);
      assert.ok(Math.abs(metrics.analysisStage.width - 1104) <= 0.5, `fallback analysis stage width must be 1104±0.5, got ${metrics.analysisStage.width}`);
      assert.ok(Math.abs(metrics.card.x - 167.5) <= 0.5, `fallback source card x must be 167.5±0.5, got ${metrics.card.x}`);
      assert.ok(Math.abs(metrics.card.width - 1104) <= 0.5, `fallback source card width must be 1104±0.5, got ${metrics.card.width}`);
      assert.ok(metrics.card.width < 1120, '1440px width class must be inactive below the breakpoint');
      assert.ok(metrics.scroll.documentWidth <= metrics.viewport.width, '1439px document must not overflow horizontally');
      assert.ok(metrics.scroll.bodyWidth <= metrics.viewport.width, '1439px body must not overflow horizontally');
    }

    if (name === 'mobile-390') {
      assert.equal(metrics.viewport.width, 390, 'mobile viewport must be exactly 390px');
      assert.equal(metrics.viewport.clientWidth, 390, 'mobile document client width must be exactly 390px');
      assert.equal(metrics.branches.desktopDisplay, 'none', 'desktop branch must be hidden on mobile');
      assert.equal(metrics.branches.mobileDisplay, 'block', 'mobile branch must be visible on mobile');
      assert.ok(metrics.mobileProof.rect.width > 0, 'mobile source-proof subtree must render');
      assert.match(metrics.mobileProof.text, /Мы всегда указываем точный источник/);
    }

    await fs.writeFile(path.join(outputDir, `${name}.json`), `${JSON.stringify(metrics, null, 2)}\n`);
    await page.screenshot({ path: path.join(outputDir, `${name}-full.png`), fullPage: true });
    await page.locator('header').evaluateAll((elements) => {
      elements.forEach((element) => { element.style.visibility = 'hidden'; });
    });
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach((element) => {
        const position = getComputedStyle(element).position;
        if (position === 'fixed' || position === 'sticky') element.style.visibility = 'hidden';
      });
    });
    const screenshotBox = await target.boundingBox();
    assert.ok(screenshotBox, `${name} screenshot target must have a bounding box`);
    await page.screenshot({ path: path.join(outputDir, `${name}.png`), clip: screenshotBox });
    return metrics;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await inspectViewport(browser, 'desktop-1440', 1440, 1080);
  await inspectViewport(browser, 'desktop-1439', 1439, 1080);
  await inspectViewport(browser, 'mobile-390', 390, 844);
} finally {
  await browser.close();
}

console.log(`Landing source-proof visual artifacts written to ${outputDir}`);
