import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = path.join(os.tmpdir(), 'infopedia-auth-onboarding-desktop-states');
const viewportProfiles = [
  { name: 'figma-1080', width: 1440, height: 1080, exactFigma: true },
  { name: 'viewport-720', width: 1440, height: 720, exactFigma: false },
];
const responsiveProfiles = [
  { name: 'fallback-1024', width: 1024, height: 900 },
  { name: 'fallback-1280', width: 1280, height: 900 },
  { name: 'fallback-1366', width: 1366, height: 900 },
  { name: 'fallback-1439', width: 1439, height: 900 },
];
const responsiveReferences = [
  {
    state: 'grade-fallback',
    kind: 'grade',
    storyId: 'pages-onboarding--desktop-grade-empty-1440',
    control: 'button[aria-pressed="false"]',
  },
  {
    state: 'username-fallback',
    kind: 'username',
    storyId: 'pages-onboarding--desktop-username-empty-1440',
    control: 'input[autocomplete="username"]',
  },
  {
    state: 'register-fallback',
    kind: 'register',
    storyId: 'pages-register--desktop-register-empty-1440',
    control: 'input[type="email"]',
  },
];
const figmaStates = [
  { state: 'grade-empty', storyId: 'pages-onboarding--desktop-grade-empty-1440', nodeId: '845:4019', step: 1, filled: false, control: 'button[aria-pressed="false"]' },
  { state: 'grade-selected', storyId: 'pages-onboarding--desktop-grade-selected-1440', nodeId: '854:4119', step: 1, filled: true, control: 'button[aria-pressed="true"]' },
  { state: 'username-empty', storyId: 'pages-onboarding--desktop-username-empty-1440', nodeId: '862:4334', step: 2, filled: false, control: 'input[autocomplete="username"]' },
  { state: 'username-valid', storyId: 'pages-onboarding--desktop-username-valid-1440', nodeId: '862:4463', step: 2, filled: true, control: 'input[autocomplete="username"]' },
  { state: 'register-empty', storyId: 'pages-register--desktop-register-empty-1440', nodeId: '865:3751', step: 3, filled: false, control: 'input[type="email"]' },
  { state: 'register-filled', storyId: 'pages-register--desktop-register-filled-1440', nodeId: '865:3864', step: 3, filled: true, control: 'input[type="email"]' },
];
const shortViewportStates = [
  {
    state: 'verify-empty',
    kind: 'verification',
    storyId: 'pages-register--verify-empty-430',
    step: 3,
    filled: false,
    control: 'form input',
  },
];

const expected = {
  sidebarBackground: 'rgb(255, 255, 255)',
  sidebarBorder: 'rgb(222, 210, 241)',
  mainBackground: 'rgb(239, 235, 246)',
  controlBackground: 'rgb(248, 245, 252)',
  disabledBackground: 'rgb(239, 234, 248)',
  disabledText: 'rgb(197, 177, 231)',
  enabledBackground: 'rgb(106, 55, 195)',
  enabledText: 'rgb(255, 255, 255)',
};

function closeTo(actual, wanted, label, tolerance = 0.25) {
  assert.ok(
    Math.abs(actual - wanted) <= tolerance,
    `${label}: expected ${wanted}, received ${actual}`,
  );
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (const profile of viewportProfiles) {
    const states = profile.exactFigma ? figmaStates : [...figmaStates, ...shortViewportStates];
    for (const reference of states) {
    const page = await browser.newPage({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: 1,
      locale: 'ru-RU',
    });
    await page.goto(`${storybook}/iframe.html?id=${reference.storyId}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.getByTestId('desktop-onboarding-sidebar').waitFor({ state: 'visible' });
    await page.locator(reference.control).first().waitFor({ state: 'visible' });
    await page.waitForFunction(
      ({ control, filled, kind }) => {
        const submit = document.querySelector('button[type="submit"]');
        const target = document.querySelector(control);
        const ready = Boolean(target) && submit instanceof HTMLButtonElement && submit.disabled === !filled;
        return kind === 'verification' ? ready && document.querySelectorAll('form input').length === 6 : ready;
      },
      reference,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
    });

    const result = await page.evaluate(({ control, step, state }) => {
      const inspect = (element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          right: box.right,
          bottom: box.bottom,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRightColor: style.borderRightColor,
          borderRightWidth: style.borderRightWidth,
          borderRadius: style.borderRadius,
          display: style.display,
          color: style.color,
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      };
      const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);
      const sidebar = byTestId('desktop-onboarding-sidebar');
      const logo = byTestId('desktop-onboarding-logo');
      const stepper = byTestId('desktop-onboarding-stepper');
      const main = byTestId('desktop-onboarding-main');
      const card = byTestId('desktop-onboarding-card');
      const target = document.querySelector(control);
      const submit = document.querySelector('button[type="submit"]');
      const currentStep = document.querySelector('[data-step-state="current"]');
      const connector = stepper?.querySelector(':scope > span[aria-hidden="true"]');
      const title = card?.querySelector('h1');
      const description = card?.querySelector('h1 + form > p');
      const googleIcon = document.querySelector(
        'button img[src="/figma/onboarding/google-black-icon.svg"][aria-hidden="true"]',
      );
      const googleButton = googleIcon?.closest('button');
      const expectsGoogleIcon = state.startsWith('register-');
      const stepItems = [...document.querySelectorAll('[data-step-state]')];
      const stepCircles = stepItems.map((item) => item.querySelector(':scope > span'));
      const gradeRows = [...document.querySelectorAll('button[aria-pressed]')];
      const fieldControls = [...document.querySelectorAll('form input')];
      if (
        !sidebar ||
        !logo ||
        !stepper ||
        !main ||
        !card ||
        !target ||
        !submit ||
        !currentStep ||
        !connector ||
        !title ||
        !description ||
        (expectsGoogleIcon && (!googleIcon || !googleButton)) ||
        stepItems.length !== 3 ||
        stepCircles.some((circle) => !circle)
      ) {
        throw new Error('Desktop onboarding visual hook missing');
      }
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
        document: {
          clientHeight: document.documentElement.clientHeight,
          scrollHeight: document.documentElement.scrollHeight,
          bodyClientHeight: document.body.clientHeight,
          bodyScrollHeight: document.body.scrollHeight,
        },
        step,
        currentStepText: currentStep.textContent?.replace(/\s+/g, ' ').trim(),
        sidebar: inspect(sidebar),
        logo: inspect(logo),
        stepper: inspect(stepper),
        connector: inspect(connector),
        stepItems: stepItems.map(inspect),
        stepCircles: stepCircles.map(inspect),
        main: inspect(main),
        card: inspect(card),
        title: inspect(title),
        description: inspect(description),
        googleIcon: googleIcon ? inspect(googleIcon) : null,
        googleButton: googleButton ? inspect(googleButton) : null,
        control: inspect(target),
        gradeRows: gradeRows.map(inspect).sort((a, b) => a.y - b.y),
        gradeMobileIndicators: gradeRows.map((row) => {
          const indicator = row.querySelector('[data-onboarding-indicator="mobile"]');
          return indicator ? inspect(indicator) : null;
        }),
        gradeDesktopIndicators: gradeRows.map((row) => {
          const indicator = row.querySelector('[data-onboarding-indicator="desktop"]');
          return indicator ? inspect(indicator) : null;
        }),
        fieldControls: fieldControls.map(inspect).sort((a, b) => a.y - b.y),
        submit: inspect(submit),
      };
    }, reference);

    assert.deepEqual(result.viewport, { width: profile.width, height: profile.height, dpr: 1 });
    closeTo(result.sidebar.x, 0, `${reference.state} sidebar x`);
    closeTo(result.sidebar.y, 0, `${reference.state} sidebar y`);
    closeTo(result.sidebar.width, 480, `${reference.state} sidebar width`);
    closeTo(result.sidebar.height, profile.height, `${reference.state} sidebar height`);
    assert.equal(result.sidebar.backgroundColor, expected.sidebarBackground);
    assert.equal(result.sidebar.borderRightWidth, '1px');
    assert.equal(result.sidebar.borderRightColor, expected.sidebarBorder);
    assert.equal(result.sidebar.paddingLeft, '64px');
    assert.equal(result.sidebar.paddingTop, '32px');
    closeTo(result.logo.x, 64, `${reference.state} logo x`);
    closeTo(result.logo.y, 32, `${reference.state} logo y`);
    closeTo(result.logo.width, 171, `${reference.state} logo width`);
    closeTo(result.logo.height, 44, `${reference.state} logo height`);
    closeTo(result.connector.width, 2, `${reference.state} connector width`);
    for (const [index, circle] of result.stepCircles.entries()) {
      closeTo(circle.width, 48, `${reference.state} step ${index + 1} circle width`);
      closeTo(circle.height, 48, `${reference.state} step ${index + 1} circle height`);
    }
    for (let index = 1; index < result.stepItems.length; index += 1) {
      closeTo(
        result.stepItems[index].y - result.stepItems[index - 1].bottom,
        64,
        `${reference.state} step ${index} to ${index + 1} gap`,
      );
    }
    closeTo(result.main.x, 480, `${reference.state} main x`);
    closeTo(result.main.y, 0, `${reference.state} main y`);
    closeTo(result.main.width, 960, `${reference.state} main width`);
    closeTo(result.main.height, profile.height, `${reference.state} main height`);
    assert.equal(result.main.backgroundColor, expected.mainBackground);
    closeTo(result.card.width, 480, `${reference.state} card width`);
    closeTo(result.card.x, 720, `${reference.state} card x`);
    closeTo(
      result.card.y * 2 + result.card.height,
      profile.height,
      `${reference.state} card vertical center`,
    );
    closeTo(
      result.card.height,
      reference.step === 1 ? 408 : reference.step === 2 ? 308 : 508,
      `${reference.state} card height`,
    );
    assert.equal(result.card.borderRadius, '16px');
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
      assert.equal(result.card[side], '48px', `${reference.state} card ${side}`);
    }
    assert.equal(result.title.fontSize, '24px');
    assert.equal(result.title.fontWeight, '500');
    assert.equal(result.description.fontSize, '16px');
    if (reference.state.startsWith('register-')) {
      assert.ok(result.googleIcon, `${reference.state} Google icon should be present`);
      assert.ok(result.googleButton, `${reference.state} Google icon should be inside its button`);
      closeTo(result.googleIcon.width, 16, `${reference.state} Google icon width`);
      closeTo(result.googleIcon.height, 16, `${reference.state} Google icon height`);
    }
    if (reference.kind === 'verification') {
      assert.equal(result.fieldControls.length, 6, 'Verification should retain six OTP cells');
      for (const field of result.fieldControls) {
        assert.ok(field.y >= result.card.y, 'Verification OTP cell should remain inside the card');
        assert.ok(field.bottom <= result.card.bottom, 'Verification OTP cell should remain inside the card');
      }
      assert.ok(result.submit.y >= result.card.y, 'Verification submit should remain inside the card');
      assert.ok(result.submit.bottom <= result.card.bottom, 'Verification submit should remain inside the card');
    } else {
      closeTo(result.control.height, 48, `${reference.state} control height`);
      assert.equal(result.control.borderRadius, '8px');
      assert.equal(result.control.backgroundColor, expected.controlBackground);
      assert.equal(result.control.fontSize, '16px');
      if (reference.step === 1) {
        assert.equal(result.gradeRows.length, 3);
        assert.equal(result.gradeMobileIndicators.length, 3);
        assert.equal(result.gradeDesktopIndicators.length, 3);
        assert.ok(result.gradeMobileIndicators.every((indicator) => indicator?.display === 'none'), `${reference.state} mobile square indicators should be hidden at 1440px`);
        assert.ok(result.gradeDesktopIndicators.every((indicator) => indicator && indicator.display !== 'none'), `${reference.state} desktop radio indicators should be visible at 1440px`);
        for (let index = 1; index < result.gradeRows.length; index += 1) {
          closeTo(
            result.gradeRows[index].y - result.gradeRows[index - 1].bottom,
            8,
            `${reference.state} grade row ${index} to ${index + 1} gap`,
          );
        }
      }
      const finalControl =
        reference.step === 1
          ? result.gradeRows.at(-1)
          : reference.step === 2
            ? result.control
            : result.fieldControls.at(-1);
      assert.ok(finalControl, `${reference.state} final form control should exist`);
      closeTo(result.submit.y - finalControl.bottom, 24, `${reference.state} form to submit gap`);
      closeTo(result.submit.height, 48, `${reference.state} submit height`);
      assert.equal(result.submit.borderRadius, '8px');
      assert.equal(
        result.submit.backgroundColor,
        reference.filled ? expected.enabledBackground : expected.disabledBackground,
      );
      assert.equal(result.submit.color, reference.filled ? expected.enabledText : expected.disabledText);
    }

    if (!profile.exactFigma) {
      assert.ok(result.card.y >= 0, `${reference.state} card should start in the visible right pane`);
      assert.ok(
        result.card.bottom <= profile.height,
        `${reference.state} card should end in the visible right pane`,
      );
      assert.equal(result.document.clientHeight, profile.height);
      assert.equal(result.document.scrollHeight, profile.height);
      assert.equal(result.document.bodyClientHeight, profile.height);
      assert.equal(result.document.bodyScrollHeight, profile.height);
    }

    const screenshotPath = path.join(outputDir, `${profile.name}-${reference.state}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    measurements.push({ ...profile, ...reference, screenshotPath, ...result });
    await page.close();
    }
  }

  for (const profile of responsiveProfiles) {
    for (const reference of responsiveReferences) {
    const page = await browser.newPage({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: 1,
      locale: 'ru-RU',
    });
    await page.goto(`${storybook}/iframe.html?id=${reference.storyId}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.locator(reference.control).first().waitFor({ state: 'visible' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    const result = await page.evaluate(({ control, kind }) => {
      const sidebar = document.querySelector('[data-testid="desktop-onboarding-sidebar"]');
      const target = document.querySelector(control);
      const form = document.querySelector('form');
      const header = [...document.querySelectorAll('header')].find(
        (element) =>
          getComputedStyle(element).display !== 'none' && Boolean(element.querySelector('a[href="/"]')),
      );
      if (!sidebar || !target || !form || !header) {
        throw new Error('Responsive onboarding fallback hook missing');
      }
      const targetBox = target.getBoundingClientRect();
      const formBox = form.getBoundingClientRect();
      const backButton = [...form.querySelectorAll('button[type="button"]')].find(
        (element) => element.textContent?.trim(),
      );
      const gradeGlyph =
        kind === 'grade' ? target.querySelector(':scope > svg') : null;
      const gradeRadio =
        kind === 'grade' ? target.querySelector(':scope > [data-onboarding-indicator="desktop"]') : null;
      const isVisible = (element) => {
        if (!element) return false;
        const box = element.getBoundingClientRect();
        return getComputedStyle(element).display !== 'none' && box.width > 0 && box.height > 0;
      };
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
        scrollWidth: document.documentElement.scrollWidth,
        sidebarDisplay: getComputedStyle(sidebar).display,
        headerDisplay: getComputedStyle(header).display,
        target: {
          left: targetBox.left,
          right: targetBox.right,
          width: targetBox.width,
          center: targetBox.left + targetBox.width / 2,
        },
        form: {
          left: formBox.left,
          right: formBox.right,
          width: formBox.width,
        },
        grade: kind === 'grade' ? {
          justifyContent: getComputedStyle(target).justifyContent,
          backgroundColor: getComputedStyle(target).backgroundColor,
          glyphVisible: isVisible(gradeGlyph),
          radioVisible: isVisible(gradeRadio),
        } : null,
        backVisible: kind === 'username' ? isVisible(backButton) : null,
      };
    }, reference);
    assert.deepEqual(result.viewport, { width: profile.width, height: profile.height, dpr: 1 });
    assert.ok(
      result.scrollWidth <= profile.width,
      `${profile.name} ${reference.state} document should not horizontally overflow`,
    );
    assert.equal(result.sidebarDisplay, 'none', `${profile.name} should not activate the 1440px sidebar`);
    assert.notEqual(result.headerDisplay, 'none', `${profile.name} should retain a visible fallback header`);
    assert.ok(result.form.left >= 0, `${profile.name} ${reference.state} form should not clip on the left`);
    assert.ok(result.form.right <= profile.width, `${profile.name} ${reference.state} form should not clip on the right`);
    assert.ok(result.target.left >= 0, `${profile.name} ${reference.state} control should not clip on the left`);
    assert.ok(result.target.right <= profile.width, `${profile.name} ${reference.state} control should not clip on the right`);
    closeTo(result.target.center, profile.width / 2, `${profile.name} ${reference.state} control horizontal center`);
    if (reference.kind === 'grade') {
      assert.ok(result.grade, `${profile.name} grade fallback measurements should exist`);
      assert.notEqual(result.grade.justifyContent, 'space-between', `${profile.name} grade should not use desktop alignment`);
      assert.equal(result.grade.backgroundColor, 'rgb(255, 255, 255)', `${profile.name} grade should keep fallback surface`);
      assert.equal(result.grade.glyphVisible, false, `${profile.name} grade should not render a leading glyph`);
      assert.equal(result.grade.radioVisible, false, `${profile.name} grade should not expose desktop radio anatomy`);
    }
    if (reference.kind === 'username') {
      assert.equal(result.backVisible, true, `${profile.name} username Back control should remain visible`);
    }

    const screenshotPath = path.join(outputDir, `${profile.name}-${reference.state}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    measurements.push({ ...profile, ...reference, screenshotPath, ...result });
    await page.close();
    }
  }
} finally {
  await browser.close();
}

const measurementsPath = path.join(outputDir, 'measurements.json');
await fs.writeFile(measurementsPath, JSON.stringify(measurements, null, 2));
console.log(
  `Desktop onboarding visual geometry passed: ${measurements.length}/${
    figmaStates.length * viewportProfiles.length + shortViewportStates.length + responsiveProfiles.length * responsiveReferences.length
  }`,
);
console.log(`Artifacts: ${outputDir}`);
