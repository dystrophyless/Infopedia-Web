import '../i18n';
import { useEffect, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, userEvent } from 'storybook/test';
import { Subscription } from './Subscription';

type HistoryHarnessMode = 'direct' | 'prior';
type HistorySnapshot = { state: unknown; url: string };

function configureBrowserHistory(mode: HistoryHarnessMode) {
  const currentState = window.history.state;
  const state = currentState && typeof currentState === 'object' ? currentState : {};
  if (mode === 'prior') {
    window.history.replaceState({ ...state, idx: 0 }, '', '/profile?from=prior');
    window.history.pushState({ ...state, idx: 1 }, '', '/subscription');
  } else {
    window.history.replaceState({ ...state, idx: 0 }, '', '/subscription');
  }
}

function BrowserHistoryHarness({ mode, original, children }: { mode: HistoryHarnessMode; original: HistorySnapshot; children: ReactNode }) {
  useEffect(() => {
    configureBrowserHistory(mode);
    return () => window.history.replaceState(original.state, '', original.url);
  }, [mode, original]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/subscription" element={children} />
        <Route path="/profile" element={<div data-subscription-back-target={mode}>Profile route</div>} />
      </Routes>
    </BrowserRouter>
  );
}

function withBrowserHistory(mode: HistoryHarnessMode) {
  return (Story: () => ReactNode) => {
    const original = { state: window.history.state, url: window.location.href };
    configureBrowserHistory(mode);
    return <BrowserHistoryHarness mode={mode} original={original}><Story /></BrowserHistoryHarness>;
  };
}

const meta = {
  title: 'Pages/Subscription',
  component: Subscription,
  decorators: [(Story, context) => context.parameters.routerHarness === 'browser' ? <Story /> : <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile430', isRotated: false } },
} satisfies Meta<typeof Subscription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile430Geometry: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock])' }] } } },
  play: async ({ canvasElement }) => {
    const main = canvasElement.querySelector('main');
    const scrollViewport = canvasElement.querySelector('[data-mobile-page-scroll-viewport]');
    const card = canvasElement.querySelector('[data-figma-node="425:3479"]');
    const actions = canvasElement.querySelector('[data-subscription-actions]');
    const cta = canvasElement.querySelector('[data-subscription-cta]');
    const disclosure = canvasElement.querySelector('[data-subscription-disclosure]');
    const benefitRows = [...canvasElement.querySelectorAll('li')];

    expect(main).not.toBeNull();
    expect(scrollViewport).not.toBeNull();
    expect(card).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(disclosure).not.toBeNull();
    expect(benefitRows).toHaveLength(3);
    if (!main || !scrollViewport || !card || !actions || !cta || !disclosure) return;

    const cardRect = card.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();
    const disclosureRect = disclosure.getBoundingClientRect();
    expect(Math.round(ctaRect.top - cardRect.bottom)).toBe(24);
    expect(Math.round(disclosureRect.top - ctaRect.bottom)).toBe(16);

    expect(main.contains(card)).toBe(true);
    expect(main.contains(actions)).toBe(true);
    expect(canvasElement.querySelector('footer')).toBeNull();
    expect(getComputedStyle(scrollViewport).overflowY).toBe('auto');
    expect(getComputedStyle(actions).paddingBottom).toBe('16px');
    for (const row of benefitRows) {
      expect(getComputedStyle(row).alignItems).toBe('center');
      expect(getComputedStyle(row).textAlign).toBe('left');
    }
  },
};

async function assertAdaptiveDesktopGeometry(
  canvasElement: HTMLElement,
  expected: { rowX: number; rowWidth: number; panelWidth: number; panelPadding: number },
) {
  const row = canvasElement.querySelector('[data-subscription-desktop-row]');
  const left = canvasElement.querySelector('[data-subscription-desktop-left]');
  const right = canvasElement.querySelector('[data-subscription-desktop-right]');
  const back = canvasElement.querySelector('[data-subscription-desktop-back]');
  expect(row).not.toBeNull();
  expect(left).not.toBeNull();
  expect(right).not.toBeNull();
  expect(back).not.toBeNull();
  if (!row || !left || !right || !back) return;

  const rowRect = row.getBoundingClientRect();
  const leftRect = left.getBoundingClientRect();
  const rightRect = right.getBoundingClientRect();
  const backRect = back.getBoundingClientRect();
  expect(Math.round(rowRect.x)).toBe(expected.rowX);
  expect(Math.round(rowRect.width)).toBe(expected.rowWidth);
  expect(Math.round(leftRect.width)).toBe(expected.panelWidth);
  expect(Math.round(rightRect.width)).toBe(expected.panelWidth);
  expect(Math.round(rightRect.x - leftRect.right)).toBe(16);
  expect(Math.round(Number.parseFloat(getComputedStyle(left).paddingLeft))).toBe(expected.panelPadding);
  expect(Math.round(Number.parseFloat(getComputedStyle(right).paddingLeft))).toBe(expected.panelPadding);
  expect(backRect.right <= rowRect.left || backRect.bottom <= rowRect.top).toBe(true);
  expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

export const Desktop1024AdaptiveGeometry: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => assertAdaptiveDesktopGeometry(canvasElement, { rowX: 32, rowWidth: 960, panelWidth: 472, panelPadding: 32 }),
};

export const Desktop1280AdaptiveGeometry: Story = {
  globals: { viewport: { value: 'desktop1280', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => assertAdaptiveDesktopGeometry(canvasElement, { rowX: 64, rowWidth: 1152, panelWidth: 568, panelPadding: 48 }),
};

export const Desktop1440x1080AnnualSelected: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => {
    const desktop = canvasElement.querySelector('[data-subscription-desktop]');
    const row = canvasElement.querySelector('[data-subscription-desktop-row]');
    const left = canvasElement.querySelector('[data-subscription-desktop-left]');
    const right = canvasElement.querySelector('[data-subscription-desktop-right]');
    const annual = canvasElement.querySelector('[data-subscription-desktop-plan="annual"]');
    const monthly = canvasElement.querySelector('[data-subscription-desktop-plan="monthly"]');
    const cta = canvasElement.querySelector('[data-subscription-desktop-cta]');
    const discount = annual && [...annual.querySelectorAll('span')].find((node) => node.textContent?.trim() === '-67%');
    expect(desktop).not.toBeNull();
    expect(row).not.toBeNull();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(annual).not.toBeNull();
    expect(monthly).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(discount).not.toBeUndefined();
    if (!desktop || !row || !left || !right || !annual || !monthly || !cta || !discount) return;

    const rowRect = row.getBoundingClientRect();
    const leftRect = left.getBoundingClientRect();
    const rightRect = right.getBoundingClientRect();
    expect(Math.round(rowRect.x)).toBe(128);
    expect(Math.round(rowRect.y)).toBe(265);
    expect(Math.round(rowRect.width)).toBe(1184);
    expect(Math.round(rowRect.height)).toBe(551);
    expect(Math.round(leftRect.width)).toBe(584);
    expect(Math.round(rightRect.width)).toBe(584);
    expect(Math.round(rightRect.x - leftRect.right)).toBe(16);
    expect(Math.round(monthly.getBoundingClientRect().height)).toBe(72);
    expect(Math.round(annual.getBoundingClientRect().height)).toBe(72);
    const planList = annual.parentElement;
    expect(planList).not.toBeNull();
    if (!planList) return;
    expect(getComputedStyle(planList).gap).toBe('16px');
    for (const plan of [monthly, annual]) {
      const style = getComputedStyle(plan);
      expect(style.paddingTop).toBe('16px');
      expect(style.paddingRight).toBe('24px');
      expect(style.paddingBottom).toBe('16px');
      expect(style.paddingLeft).toBe('24px');
      expect(style.gap).toBe('24px');
      expect(style.borderRadius).toBe('16px');
    }
    expect(getComputedStyle(annual).backgroundColor).toBe('rgb(248, 245, 252)');
    expect(getComputedStyle(monthly).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const beforeToggle = [monthly, annual].map((plan) => plan.getBoundingClientRect().toJSON());
    const monthlyInput = monthly.querySelector('input') as HTMLInputElement | null;
    expect(monthlyInput).not.toBeNull();
    if (!monthlyInput) return;
    await userEvent.click(monthlyInput);
    expect(getComputedStyle(monthly).backgroundColor).toBe('rgb(248, 245, 252)');
    expect(getComputedStyle(annual).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect([monthly, annual].map((plan) => plan.getBoundingClientRect().toJSON())).toEqual(beforeToggle);
    const annualInput = annual.querySelector('input') as HTMLInputElement | null;
    expect(annualInput).not.toBeNull();
    if (annualInput) await userEvent.click(annualInput);
    expect(getComputedStyle(annual).backgroundColor).toBe('rgb(248, 245, 252)');
    expect(getComputedStyle(monthly).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect([monthly, annual].map((plan) => plan.getBoundingClientRect().toJSON())).toEqual(beforeToggle);
    expect(getComputedStyle(left).borderRadius).toBe('16px');
    expect(getComputedStyle(right).borderRadius).toBe('16px');
    expect(getComputedStyle(discount).borderRadius).toBe('8px');
    expect(getComputedStyle(discount).fontSize).toBe('14px');
    expect(getComputedStyle(discount).lineHeight).toBe('14px');
    expect(getComputedStyle(cta).fontSize).toBe('18px');
    expect(getComputedStyle(cta).lineHeight).toBe('18px');
    for (const feature of canvasElement.querySelectorAll('[data-subscription-desktop-feature]')) {
      expect(getComputedStyle(feature).alignItems).toBe('center');
    }
    expect((cta as HTMLButtonElement).disabled).toBe(true);
  },
};

export const DesktopBackHoverAndKeyboardFocus: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => {
    const back = canvasElement.querySelector('[data-subscription-desktop-back]') as HTMLButtonElement | null;
    const row = canvasElement.querySelector('[data-subscription-desktop-row]');
    const cards = [...canvasElement.querySelectorAll('[data-subscription-desktop-plan]')];
    expect(back).not.toBeNull(); expect(row).not.toBeNull(); expect(cards).toHaveLength(2);
    if (!back || !row || cards.length !== 2) return;
    const rectSnapshot = (element: Element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
    const before = { back: rectSnapshot(back), row: rectSnapshot(row), cards: cards.map(rectSnapshot) };
    const tokens = new Set(back.className.split(/\s+/));
    for (const token of ['cursor-pointer', '!text-[#6A37C3]', 'hover:!bg-[#f8f5fc]', 'hover:!text-[#6A37C3]', 'focus-visible:!bg-[#f8f5fc]', 'focus-visible:!text-[#6A37C3]', 'focus-visible:!ring-[#6A37C3]', 'focus-visible:!ring-offset-[#efeaf8]', 'duration-[140ms]']) expect(tokens.has(token)).toBe(true);
    await userEvent.hover(back); expect(getComputedStyle(back).cursor).toBe('pointer'); await userEvent.unhover(back);
    expect(getComputedStyle(back).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const monthly = canvasElement.querySelector('[data-subscription-desktop-plan="monthly"] input') as HTMLInputElement | null;
    expect(monthly).not.toBeNull(); if (!monthly) return;
    monthly.focus(); await userEvent.tab({ shift: true }); expect(canvasElement.ownerDocument.activeElement).toBe(back);
    const after = { back: rectSnapshot(back), row: rectSnapshot(row), cards: cards.map(rectSnapshot) }; expect(after).toEqual(before);
  },
};

async function assertDesktopCtaHover(canvasElement: HTMLElement, expectedCopy: string) {
  const row = canvasElement.querySelector('[data-subscription-desktop-row]');
  const cta = canvasElement.querySelector('[data-subscription-desktop-cta]') as HTMLButtonElement | null;
  const cards = [...canvasElement.querySelectorAll('[data-subscription-desktop-plan]')];
  expect(row).not.toBeNull();
  expect(cta).not.toBeNull();
  expect(cards).toHaveLength(2);
  if (!row || !cta || cards.length !== 2) return;
  const snapshot = (element: Element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
  const before = { row: snapshot(row), cards: cards.map(snapshot) };
  expect(cta.disabled).toBe(true);
  expect(cta.textContent).toBe(expectedCopy);
  expect(cta.className.split(/\s+/)).toContain('hover:bg-action-primary-hover');
  expect(cta.className.split(/\s+/)).toContain('disabled:hover:bg-action-primary-hover');
  await userEvent.hover(cta);
  expect(getComputedStyle(cta).cursor).toBe('not-allowed');
  expect({ row: snapshot(row), cards: cards.map(snapshot) }).toEqual(before);
}

export const DesktopAnnualCtaHover: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => assertDesktopCtaHover(canvasElement, 'Оформить Premium на год'),
};

export const DesktopMonthlyCtaHover: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => {
    const monthly = canvasElement.querySelector('[data-subscription-desktop-plan="monthly"] input') as HTMLInputElement | null;
    expect(monthly).not.toBeNull();
    if (monthly) await userEvent.click(monthly);
    await assertDesktopCtaHover(canvasElement, 'Оформить Premium на месяц');
  },
};

export const Desktop1440x1080MonthlySelected: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { routerHarness: 'browser', a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  decorators: [withBrowserHistory('prior')],
  play: async ({ canvasElement }) => {
    const desktop = canvasElement.querySelector('[data-subscription-desktop]');
    const monthly = desktop?.querySelector('input[type="radio"][value="monthly"]') as HTMLInputElement | null;
    const annual = desktop?.querySelector('input[type="radio"][value="annual"]') as HTMLInputElement | null;
    const cta = canvasElement.querySelector('[data-subscription-desktop-cta]');
    const back = canvasElement.querySelector('[data-subscription-desktop-back]') as HTMLButtonElement | null;
    expect(monthly).not.toBeNull();
    expect(annual).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(back).not.toBeNull();
    if (!monthly || !annual || !cta || !back) return;

    const planGeometry = () => [monthly, annual].map((input) => input.closest('[data-subscription-desktop-plan]')?.getBoundingClientRect().toJSON());
    const monthlyCard = monthly.closest('[data-subscription-desktop-plan]');
    const annualCard = annual.closest('[data-subscription-desktop-plan]');
    expect(monthlyCard).not.toBeNull();
    expect(annualCard).not.toBeNull();
    if (!monthlyCard || !annualCard) return;
    for (const card of [monthlyCard, annualCard]) {
      const style = getComputedStyle(card);
      expect(Math.round(card.getBoundingClientRect().height)).toBe(72);
      expect(style.paddingTop).toBe('16px');
      expect(style.paddingRight).toBe('24px');
      expect(style.paddingBottom).toBe('16px');
      expect(style.paddingLeft).toBe('24px');
      expect(style.gap).toBe('24px');
      expect(style.borderRadius).toBe('16px');
    }
    const beforeSelection = planGeometry();
    await userEvent.click(monthly);
    expect(monthly.checked).toBe(true);
    expect(annual.checked).toBe(false);
    expect(cta.textContent).toBe('Оформить Premium на месяц');
    expect(planGeometry()).toEqual(beforeSelection);
    monthly.focus();
    expect(canvasElement.ownerDocument.activeElement).toBe(monthly);
    await userEvent.keyboard('{ArrowRight}');
    expect(annual.checked).toBe(true);
    expect(cta.textContent).toBe('Оформить Premium на год');
    expect(planGeometry()).toEqual(beforeSelection);
    await userEvent.click(back);
    expect(canvasElement.querySelector('[data-subscription-back-target="prior"]')).not.toBeNull();
    const priorLocation = canvasElement.ownerDocument.defaultView?.location;
    expect(`${priorLocation?.pathname ?? ''}${priorLocation?.search ?? ''}`).toBe('/profile?from=prior');
  },
};

export const DesktopBackDirectEntry: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { routerHarness: 'browser', a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  decorators: [withBrowserHistory('direct')],
  play: async ({ canvasElement }) => {
    const back = canvasElement.querySelector('[data-subscription-desktop-back]') as HTMLButtonElement | null;
    expect(back).not.toBeNull();
    if (!back) return;
    await userEvent.click(back);
    expect(canvasElement.querySelector('[data-subscription-back-target="direct"]')).not.toBeNull();
    const directLocation = canvasElement.ownerDocument.defaultView?.location;
    expect(directLocation?.pathname).toBe('/profile');
    expect(directLocation?.search).toBe('');
  },
};

export const Desktop1440x1080MonthlyVisual: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false }, locale: 'ru' },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', selector: '*:not([data-subscription-contrast-lock="annual-equivalent"])' }] } } },
  play: async ({ canvasElement }) => {
    const desktop = canvasElement.querySelector('[data-subscription-desktop]');
    const monthly = desktop?.querySelector('input[type="radio"][value="monthly"]') as HTMLInputElement | null;
    expect(monthly).not.toBeNull();
    if (monthly) await userEvent.click(monthly);
  },
};
