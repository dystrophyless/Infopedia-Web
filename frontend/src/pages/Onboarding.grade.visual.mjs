import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const storybook = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const outputDir = path.join(os.tmpdir(), 'infopedia-auth-onboarding-spacing-states');
const states = [
  { state: 'grade-empty', storyId: 'pages-onboarding--grade-unselected-430', kind: 'grade', filled: false },
  { state: 'grade-selected', storyId: 'pages-onboarding--grade-10-selected-430', kind: 'grade', filled: true },
  { state: 'username-empty', storyId: 'pages-onboarding--username-empty-430', kind: 'username', filled: false },
  { state: 'username-typed', storyId: 'pages-onboarding--username-typed-430', kind: 'username', filled: true },
  { state: 'register-empty', storyId: 'pages-register--register-empty-430', kind: 'register', filled: false },
  { state: 'register-typed', storyId: 'pages-register--register-typed-430', kind: 'register', filled: true },
  { state: 'verify-empty', storyId: 'pages-register--verify-empty-430', kind: 'verify', filled: false },
  { state: 'verify-typed', storyId: 'pages-register--verify-typed-430', kind: 'verify', filled: true },
  { state: 'grade-error', storyId: 'pages-onboarding--grade-error-430', kind: 'grade', filled: false },
  { state: 'username-validation-error', storyId: 'pages-onboarding--username-validation-error-430', kind: 'username', filled: false },
  { state: 'username-request-error', storyId: 'pages-onboarding--username-request-error-430', kind: 'username', filled: false },
  { state: 'register-errors', storyId: 'pages-register--register-errors-430', kind: 'register', filled: false },
  { state: 'register-request-error', storyId: 'pages-register--register-request-error-430', kind: 'register', filled: true },
  { state: 'verify-error', storyId: 'pages-register--verify-error-430', kind: 'verify', filled: true },
];
const narrowViewports = [
  ['320x568', 320, 568],
  ['360x800', 360, 800],
  ['390x844', 390, 844],
];
const pendingDraftStorageKey = 'infopedia_pending_onboarding_draft';
const probeDraftRaw = '{"grade":"11","username":"keep-me","extra":"exact"}';

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (const { state, storyId, kind, filled } of states) {
    console.log(`Checking ${state} (${storyId})`);
    const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    await page.goto(`${storybook}/iframe.html?id=${storyId}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.locator('h1.text-left').waitFor({ state: 'visible' });
    if (kind === 'grade') await page.getByRole('button', { name: '10 класс' }).waitFor({ state: 'visible' });
    if (kind === 'username') await page.getByRole('textbox', { name: 'Имя пользователя' }).waitFor({ state: 'visible' });
    if (kind === 'register') await page.getByRole('textbox', { name: 'Электронная почта' }).waitFor({ state: 'visible' });
    if (kind === 'verify') await page.getByRole('textbox', { name: 'Код подтверждения: 1' }).waitFor({ state: 'visible' });
    const submit = page.locator('button[type="submit"]');
    await submit.waitFor({ state: 'visible' });
    await page.waitForFunction((expectedState) => {
      const form = document.querySelector('form');
      const alerts = form?.querySelectorAll('[role="alert"]') ?? [];
      const username = document.querySelector('input[autocomplete="username"]');
      const email = document.querySelector('input[type="email"]');
      const password = document.querySelector('input[autocomplete="new-password"]');
      const otp = [...document.querySelectorAll('input[aria-label^="Код подтверждения:"]')]
        .map((input) => input.value)
        .join('');
      const usernameDescription = username?.getAttribute('aria-describedby');

      if (expectedState === 'grade-selected') {
        return document.querySelector('button[aria-pressed="true"]') !== null;
      }
      if (expectedState === 'grade-error') return alerts.length === 1;
      if (expectedState === 'username-typed') {
        return username?.value === 'dystrophyless' && Boolean(usernameDescription);
      }
      if (expectedState === 'username-validation-error') {
        return username?.value === 'ab' && alerts.length === 1;
      }
      if (expectedState === 'username-request-error') {
        return username?.value === 'dystrophyless' && Boolean(usernameDescription);
      }
      if (expectedState === 'register-typed') {
        return email?.value === 'dystrophyless@gmail.com' && password?.value === 'password';
      }
      if (expectedState === 'register-errors') return alerts.length === 2;
      if (expectedState === 'register-request-error') {
        return email?.value === 'dystrophyless@gmail.com' && password?.value === 'password' && alerts.length === 1;
      }
      if (expectedState === 'verify-typed') return otp === '123456';
      if (expectedState === 'verify-error') return otp === '123456' && alerts.length === 1;
      return true;
    }, state);
    await page.waitForFunction(
      ([element, shouldBeEnabled]) => element.disabled === !shouldBeEnabled,
      [await submit.elementHandle(), filled],
    );
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(150);

    const result = await page.evaluate(({ kind, filled }) => {
      const visible = (elements) => elements.find((element) => element.getClientRects().length > 0);
      const isVisible = (element) => Boolean(element && element.getClientRects().length > 0 && getComputedStyle(element).display !== 'none');
      const rect = (element) => {
        if (!element) return null;
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
          borderWidth: style.borderWidth,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          borderRadius: style.borderRadius,
          display: style.display,
          pointerEvents: style.pointerEvents,
        };
      };
      const header = visible([...document.querySelectorAll('header.lg\\:hidden')]);
      const divider = header?.querySelector('div.h-px');
      const logo = visible([...document.querySelectorAll('img[alt="Infopedia"]')]);
      const title = visible([...document.querySelectorAll('h1')]);
      const form = visible([...document.querySelectorAll('form')]);
      const helper = form?.querySelector(':scope > p');
      const cta = form?.querySelector('button[type="submit"]');
      const ctaBox = cta?.getBoundingClientRect();
      const hit = ctaBox
        ? document.elementFromPoint(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2)
        : null;
      const common = {
        viewport: { width: innerWidth, height: innerHeight },
        header: rect(header),
        divider: rect(divider),
        logo: rect(logo),
        title: rect(title),
        titleText: title?.textContent?.trim(),
        helper: rect(helper),
        helperText: helper?.textContent?.trim(),
        cta: rect(cta),
        ctaText: cta?.textContent?.trim(),
        ctaDisabled: cta?.hasAttribute('disabled'),
        ctaPointerHit: Boolean(cta && hit && (hit === cta || cta.contains(hit))),
        scrollWidth: document.documentElement.scrollWidth,
      };

      if (kind === 'grade') {
        const options = [...document.querySelectorAll('button[aria-pressed]')].filter(isVisible);
        const tick = visible([...document.querySelectorAll('button[aria-pressed="true"] span')].filter((element) => element.classList.contains('size-5')));
        const message = form?.querySelector('[role="alert"]');
        return {
          ...common,
          options: options.map(rect),
          selected: options[0]?.getAttribute('aria-pressed') === 'true',
          optionTexts: options.map((option) => option.textContent?.trim()),
          optionIconCounts: options.map((option) => [...option.querySelectorAll('svg')].filter(isVisible).length),
          tick: rect(tick),
          message: rect(message),
        };
      }

      if (kind === 'username') {
        const input = document.querySelector('input[autocomplete="username"]');
        const field = input?.parentElement;
        const leadingIcon = field?.querySelector('span[aria-hidden="true"]');
        const describedBy = input?.getAttribute('aria-describedby');
        const message = describedBy ? document.getElementById(describedBy) : null;
        return {
          ...common,
          field: rect(input),
          value: input?.value,
          placeholder: input?.getAttribute('placeholder'),
          leadingIcon: rect(leadingIcon),
          leadingIconVisible: isVisible(leadingIcon),
          describedBy,
          message: rect(message),
        };
      }

      if (kind === 'register') {
        const email = document.querySelector('input[type="email"]');
        const password = document.querySelector('input[autocomplete="new-password"]');
        const emailShell = email?.parentElement;
        const passwordShell = password?.parentElement;
        const emailDescribedBy = email?.getAttribute('aria-describedby');
        const passwordDescribedBy = password?.getAttribute('aria-describedby');
        const emailMessage = emailDescribedBy ? document.getElementById(emailDescribedBy) : null;
        const passwordMessage = passwordDescribedBy ? document.getElementById(passwordDescribedBy) : null;
        const google = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Продолжить с Google');
        const orText = [...document.querySelectorAll('span')].find((span) => span.textContent?.trim() === 'или');
        const separators = [...(orText?.parentElement?.querySelectorAll('hr') ?? [])].filter(isVisible);
        const footer = [...document.querySelectorAll('div')].find((node) => node.textContent?.trim() === 'Уже есть аккаунт? Войти');
        return {
          ...common,
          email: rect(email),
          password: rect(password),
          emailValue: email?.value,
          passwordValue: password?.value,
          passwordType: password?.getAttribute('type'),
          emailVisibleIcons: [...(emailShell?.querySelectorAll('svg') ?? [])].filter(isVisible).length,
          passwordVisibleIcons: [...(passwordShell?.querySelectorAll('svg') ?? [])].filter(isVisible).length,
          emailMessage: rect(emailMessage),
          passwordMessage: rect(passwordMessage),
          google: rect(google),
          orText: rect(orText),
          separators: separators.map(rect),
          footer: rect(footer),
        };
      }

      const inputs = [...document.querySelectorAll('input[aria-label^="Код подтверждения:"]')];
      const resend = [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Отправить код еще раз');
      const describedBy = inputs[0]?.getAttribute('aria-describedby');
      const message = describedBy ? document.getElementById(describedBy) : null;
      return {
        ...common,
        otpGroup: rect(inputs[0]?.parentElement),
        otpInputs: inputs.map(rect),
        otpValue: inputs.map((input) => input.value).join(''),
        resend: rect(resend),
        resendText: resend?.innerText.trim(),
        describedBy: inputs.map((input) => input.getAttribute('aria-describedby')),
        message: rect(message),
      };
    }, { kind, filled });

    assert.equal(result.viewport.width, 430);
    assert.equal(Math.round(result.header.y), 0);
    assert.equal(Math.round(result.header.height), 112);
    assert.equal(Math.round(result.divider.bottom), 112);
    assert.equal(Math.round(result.divider.height), 1);
    assert.equal(Math.round(result.divider.width), 430);
    assert.equal(result.divider.backgroundColor, 'rgb(234, 233, 236)');
    assert.ok(Math.abs(result.logo.x - 152) <= 2, `logo x should be approximately 152, got ${result.logo.x}`);
    assert.equal(Math.round(result.logo.y), 64);
    assert.equal(Math.round(result.title.x), 32);
    assert.equal(Math.round(result.title.y), 177);
    assert.equal(result.title.fontSize, '24px');
    assert.equal(result.title.color, 'rgb(22, 21, 25)');
    assert.equal(Math.round(result.helper.x), 32);
    assert.equal(result.helper.fontSize, '16px');
    assert.equal(result.helper.color, 'rgb(140, 134, 152)');
    assert.equal(Math.round(result.cta.x), 32);
    assert.equal(Math.round(result.cta.width), 366);
    assert.equal(Math.round(result.cta.height), 48, `${state}: primary CTA should remain 48px`);
    assert.equal(result.ctaPointerHit, true);
    assert.equal(result.scrollWidth, 430);

    if (kind === 'grade') {
      assert.equal(result.titleText, 'В каком классе ты учишься?');
      assert.equal(result.helperText, 'Это поможет нам адаптировать программу');
      assert.deepEqual(result.optionTexts, ['10 класс', '11 класс', 'Другое']);
      assert.equal(Math.round(result.options[0].x), 32);
      assert.equal(Math.round(result.options[0].y), 257);
      assert.equal(Math.round(result.options[0].width), 366);
      assert.deepEqual(result.options.map((option) => Math.round(option.height)), [48, 48, 48]);
      assert.deepEqual(result.options.slice(1).map((option, index) => Math.round(option.y - result.options[index].bottom)), [8, 8]);
      const lastOption = result.options.at(-1);
      assert.equal(Boolean(result.message), state === 'grade-error', `${state}: grade message visibility`);
      if (result.message) {
        assert.equal(Math.round(result.message.y - lastOption.bottom), 8, `${state}: options to message gap`);
        assert.equal(Math.round(result.cta.y - result.message.bottom), 24, `${state}: message to CTA gap`);
      } else {
        assert.equal(Math.round(result.cta.y - lastOption.bottom), 24, `${state}: options to CTA gap`);
        assert.equal(Math.round(result.cta.y), 441);
      }
      assert.equal(result.cta.backgroundColor, filled ? 'rgb(106, 55, 195)' : 'rgb(222, 210, 241)');
      assert.equal(result.ctaDisabled, !filled);
      assert.equal(result.selected, filled);
      assert.deepEqual(result.optionIconCounts, filled ? [2, 1, 1] : [1, 1, 1]);
      if (filled) {
        assert.equal(result.options[0].borderColor, 'rgb(106, 55, 195)');
        assert.equal(result.options[0].borderWidth, '1px');
        assert.equal(Math.round(result.tick.width), 20);
        assert.equal(Math.round(result.tick.height), 20);
        await page.hover('button[aria-pressed="true"]');
        assert.equal(await page.locator('button[aria-pressed="true"]').evaluate((button) => getComputedStyle(button).backgroundColor), 'rgb(255, 255, 255)');
      }
    } else if (kind === 'username') {
      assert.equal(result.titleText, 'Придумай себе юзернейм');
      assert.equal(result.helperText, 'Благодаря нему мы сможем отличать тебя от других пользователей.');
      assert.deepEqual([Math.round(result.field.x), Math.round(result.field.y), Math.round(result.field.width), Math.round(result.field.height)], [32, 269, 366, 48]);
      assert.equal(result.field.backgroundColor, 'rgb(255, 255, 255)');
      assert.equal(result.field.borderRadius, '8px');
      const expectedUsername = state === 'username-validation-error' ? 'ab' : state === 'username-empty' ? '' : 'dystrophyless';
      assert.equal(result.value, expectedUsername);
      assert.equal(result.leadingIconVisible, expectedUsername.length === 0);
      assert.equal(Boolean(result.message), state !== 'username-empty', `${state}: username message visibility`);
      if (result.message) {
        assert.equal(Math.round(result.message.y - result.field.bottom), 8, `${state}: username input to message gap`);
        assert.equal(Math.round(result.cta.y - result.message.bottom), 24, `${state}: username message to CTA gap`);
        assert.ok(result.describedBy, `${state}: visible username message should describe the input`);
      } else {
        assert.equal(Math.round(result.cta.y - result.field.bottom), 24, `${state}: username input to CTA gap`);
        assert.equal(Math.round(result.cta.y), 341);
        assert.equal(result.describedBy, null, `${state}: absent username message should not reserve a description`);
      }
      assert.equal(result.cta.backgroundColor, filled ? 'rgb(106, 55, 195)' : 'rgb(222, 210, 241)');
      assert.equal(result.ctaDisabled, !filled);
    } else if (kind === 'register') {
      assert.equal(result.titleText, 'Создать аккаунт');
      assert.equal(result.helperText, 'Мы отправим 6-значный код для подтверждения.');
      assert.deepEqual([Math.round(result.email.x), Math.round(result.email.y), Math.round(result.email.width), Math.round(result.email.height)], [32, 257, 366, 48]);
      assert.deepEqual(
        [Math.round(result.password.x), Math.round(result.password.y), Math.round(result.password.width), Math.round(result.password.height)],
        [32, result.emailMessage ? 345 : 321, 366, 48],
      );
      assert.equal(result.emailValue, filled ? 'dystrophyless@gmail.com' : '');
      assert.equal(result.passwordValue, filled ? 'password' : '');
      assert.equal(result.passwordType, 'password');
      assert.equal(result.emailVisibleIcons, filled ? 0 : 1);
      assert.equal(result.passwordVisibleIcons, filled ? 1 : 2);
      if (result.emailMessage) {
        assert.equal(Math.round(result.emailMessage.y - result.email.bottom), 8, `${state}: email input to message gap`);
        assert.equal(Math.round(result.password.y - result.emailMessage.bottom), 16, `${state}: email message to password gap`);
      }
      if (result.passwordMessage) {
        assert.equal(Math.round(result.passwordMessage.y - result.password.bottom), 8, `${state}: password input to message gap`);
      }
      assert.equal(Boolean(result.emailMessage), state === 'register-errors' || state === 'register-request-error', `${state}: email message visibility`);
      assert.equal(Boolean(result.passwordMessage), state === 'register-errors', `${state}: password message visibility`);
      const registerPredecessor = result.passwordMessage ?? result.password;
      assert.equal(Math.round(result.cta.y - registerPredecessor.bottom), 24, `${state}: last register field/message to CTA gap`);
      if (!result.emailMessage && !result.passwordMessage) assert.equal(Math.round(result.cta.y), 393);
      assert.equal(result.cta.backgroundColor, filled ? 'rgb(106, 55, 195)' : 'rgb(222, 210, 241)');
      assert.equal(result.ctaDisabled, !filled);

    } else {
      assert.equal(result.titleText, 'Подтвердите почту');
      assert.equal(result.helperText, 'Введите 6-значный код, который мы отправили');
      assert.deepEqual([Math.round(result.otpGroup.x), Math.round(result.otpGroup.y), Math.round(result.otpGroup.width), Math.round(result.otpGroup.height)], [32, 257, 366, 60]);
      assert.equal(result.otpInputs.length, 6);
      assert.deepEqual(result.otpInputs.map((input) => Math.round(input.height)), [60, 60, 60, 60, 60, 60]);
      assert.deepEqual(result.otpInputs.slice(1).map((input, index) => Math.round(input.x - result.otpInputs[index].right)), [8, 8, 8, 8, 8]);
      assert.equal(result.otpValue, filled ? '123456' : '');
      assert.deepEqual(result.otpInputs.map((input) => input.color), Array(6).fill('rgb(0, 0, 0)'));
      assert.equal(Boolean(result.message), state === 'verify-error', `${state}: OTP message visibility`);
      if (result.message) {
        assert.equal(Math.round(result.message.y - result.otpGroup.bottom), 8, `${state}: OTP group to message gap`);
        assert.equal(Math.round(result.cta.y - result.message.bottom), 24, `${state}: OTP message to CTA gap`);
        assert.deepEqual(result.describedBy, Array(6).fill('registration-verification-message'));
      } else {
        assert.equal(Math.round(result.cta.y - result.otpGroup.bottom), 24, `${state}: OTP group to CTA gap`);
        assert.equal(Math.round(result.cta.y), 341);
        assert.deepEqual(result.describedBy, Array(6).fill(null));
      }
      assert.equal(result.cta.backgroundColor, filled ? 'rgb(106, 55, 195)' : 'rgb(222, 210, 241)');
      assert.equal(result.ctaDisabled, !filled);
      assert.equal(result.resendText, 'Отправить код еще раз');
      assert.equal(result.resend.color, 'rgb(165, 133, 219)');
      await page.waitForTimeout(300);
      assert.equal(await page.getByRole('heading', { name: 'Подтвердите почту' }).isVisible(), true, 'filled OTP remains stable without auto-submit');
    }

    await page.screenshot({ path: path.join(outputDir, `${state}-430x932.png`), fullPage: false });
    measurements.push({ state, figmaNode: storyId, ...result });
    if (state === 'register-empty') {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[autocomplete="new-password"]');
      await emailInput.fill('not-an-email');
      await passwordInput.fill('password');
      assert.equal(await page.locator('button[type="submit"]').isDisabled(), true, 'malformed email keeps registration CTA disabled');
      await emailInput.fill('dystrophyless@gmail.com');
      assert.equal(await page.locator('button[type="submit"]').isEnabled(), true, 'exact Figma email plus valid password enables registration CTA');
    }
    await page.close();
  }

  for (const [name, width, height] of narrowViewports) {
    const checks = [
      {
        kind: 'grade',
        storyId: 'pages-onboarding--grade-unselected-430',
        run: async (page) => {
          const option = page.getByRole('button', { name: '10 класс' });
          await option.waitFor({ state: 'visible' });
          await option.click();
          assert.equal(await option.getAttribute('aria-pressed'), 'true', `${name}: grade remains selectable`);
        },
      },
      {
        kind: 'username',
        storyId: 'pages-onboarding--username-empty-430',
        run: async (page) => {
          const input = page.getByRole('textbox', { name: 'Имя пользователя' });
          await input.waitFor({ state: 'visible' });
          await input.fill('dystrophyless');
          await page.getByRole('button', { name: 'Продолжить' }).waitFor({ state: 'visible' });
          await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.hasAttribute('disabled'));
        },
      },
      {
        kind: 'register',
        storyId: 'pages-register--register-empty-430',
        run: async (page) => {
          const email = page.getByRole('textbox', { name: 'Электронная почта' });
          const password = page.locator('input[autocomplete="new-password"]');
          await email.fill('dystrophyless@gmail.com');
          await password.fill('password');
          await page.getByRole('button', { name: 'Показать пароль' }).click();
          assert.equal(await password.getAttribute('type'), 'text', `${name}: password toggle reveals value`);
          await page.getByRole('button', { name: 'Скрыть пароль' }).click();
          assert.equal(await password.getAttribute('type'), 'password', `${name}: password toggle restores mask`);
        },
      },
      {
        kind: 'verify',
        storyId: 'pages-register--verify-empty-430',
        run: async (page) => {
          const first = page.getByRole('textbox', { name: 'Код подтверждения: 1' });
          await first.waitFor({ state: 'visible' });
          await first.focus();
          await first.fill('123456');
          const inputs = page.locator('input[aria-label^="Код подтверждения:"]');
          assert.equal(await inputs.evaluateAll((nodes) => nodes.map((node) => node.value).join('')), '123456', `${name}: OTP paste-like input distributes digits`);
          assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Код подтверждения: 6', `${name}: OTP distribution advances focus`);
          assert.equal(await page.getByRole('button', { name: 'Подтвердить почту' }).isEnabled(), true, `${name}: OTP CTA enables`);
        },
      },
    ];

    for (const check of checks) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(`${storybook}/iframe.html?id=${check.storyId}&viewMode=story`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await check.run(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${name}/${check.kind}: no horizontal overflow`);
      measurements.push({ state: `${name}-${check.kind}`, viewport: { width, height }, overflow });
      await page.close();
    }
  }

  const probe = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await probe.goto(storybook, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await probe.evaluate(([key, raw]) => window.localStorage.setItem(key, raw), [pendingDraftStorageKey, probeDraftRaw]);
  await probe.goto(`${storybook}/iframe.html?id=pages-onboarding--grade-unselected-430&viewMode=story`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await probe.getByRole('button', { name: '10 класс' }).waitFor({ state: 'visible' });
  assert.equal(await probe.evaluate((key) => window.localStorage.getItem(key), pendingDraftStorageKey), null);
  await probe.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(
    await probe.evaluate((key) => window.localStorage.getItem(key), pendingDraftStorageKey),
    probeDraftRaw,
  );
  await probe.goto(`${storybook}/favicon.ico`, { waitUntil: 'commit', timeout: 60000 });
  assert.equal(await probe.evaluate((key) => window.localStorage.getItem(key), pendingDraftStorageKey), probeDraftRaw);
  await probe.close();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);
console.log(`Auth/onboarding spacing screenshots and measurements saved to ${outputDir}`);
