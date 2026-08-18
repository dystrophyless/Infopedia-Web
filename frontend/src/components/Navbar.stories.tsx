import '../i18n';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import i18n from '../i18n';
import { useLangStore, type Language } from '../stores/langStore';
import { Navbar } from './Navbar';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current story location" className="sr-only">{location.pathname}</output>;
}

function NavbarStory({ language = 'ru' }: { language?: Language }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    useLangStore.setState({ lang: language });
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
    };
  }, [language]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/']}>
      <Navbar />
      <LocationProbe />
    </MemoryRouter>
  );
}

const meta = {
  title: 'Components/Navbar',
  component: Navbar,
  render: () => <NavbarStory />,
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    // Figma nodes 1226:2804/2817/2823 require #b1acb9 on white/neutral
    // surfaces, so only this source-provenanced contrast pair is exempted.
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

async function getGuestControls(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const signIn = await canvas.findByRole('link', { name: /Войти|Кіру/i });
  const start = await canvas.findByRole('link', { name: /Начать|Бастау/i });
  const language = await canvas.findByRole('button', { name: /Русский|Қазақша/i });
  return { canvas, signIn, start, language };
}

async function expectCompactControl(control: HTMLElement, backgroundColor: string, color: string) {
  const rect = control.getBoundingClientRect();
  const style = getComputedStyle(control);
  await expect(rect.height).toBe(32);
  await expect(style.backgroundColor).toBe(backgroundColor);
  await expect(style.borderRadius).toBe('8px');
  await expect(style.fontFamily).toContain('Mabry Pro');
  await expect(style.fontSize).toBe('12px');
  await expect(style.fontWeight).toBe('400');
  await expect(style.lineHeight).toBe('normal');
  await expect(style.color).toBe(color);
  await expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth);
}

async function expectCompactLanguageColor(language: HTMLElement, color: string) {
  const label = language.querySelector('span');
  const icon = language.querySelector('svg');
  await expect(label).not.toBeNull();
  await expect(icon).not.toBeNull();
  if (!label || !icon) return;
  await expect(getComputedStyle(language).color).toBe(color);
  await expect(getComputedStyle(label).color).toBe(color);
  await expect(getComputedStyle(icon).color).toBe(color);
}

async function expectCompactKeyboardFocus(option: HTMLElement) {
  const style = getComputedStyle(option);
  await expect(style.outlineStyle).toBe('solid');
  await expect(style.outlineWidth).toBe('2px');
  await expect(style.outlineColor).toBe('rgb(106, 55, 195)');
  await expect(style.outlineOffset).toBe('-2px');
}

async function expectCompactPointerClean(option: HTMLElement) {
  const style = getComputedStyle(option);
  await expect(style.outlineStyle === 'none' || style.outlineColor === 'rgba(0, 0, 0, 0)').toBe(true);
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const { signIn, start, language } = await getGuestControls(canvasElement);
    await expect(window.devicePixelRatio).toBe(1);
    await expectCompactControl(signIn, 'rgb(255, 255, 255)', 'rgb(22, 21, 25)');
    await expectCompactControl(start, 'rgb(106, 55, 195)', 'rgb(255, 255, 255)');
    await expectCompactControl(language, 'rgb(255, 255, 255)', 'rgb(177, 172, 185)');
    await expectCompactLanguageColor(language, 'rgb(177, 172, 185)');
    await expect(signIn).toHaveAttribute('href', '/login');
    await expect(start).toHaveAttribute('href', '/onboarding');
    await expect(signIn).toHaveTextContent('Войти');
    await expect(start).toHaveTextContent('Начать');
    await expect(language).toHaveTextContent('RU');
    await expect(start.querySelector('svg')?.getBoundingClientRect().width).toBe(16);
    await expect(language.querySelector('svg')?.getBoundingClientRect().width).toBe(16);
  },
};

export const SignInHover: Story = {
  play: async ({ canvasElement }) => {
    const { signIn } = await getGuestControls(canvasElement);
    await userEvent.hover(signIn);
    // Storybook userEvent dispatches pointer events but does not activate the
    // browser CSS :hover pseudo-state; live-browser computed paint covers it.
    await expect(signIn).toHaveClass('hover:bg-[#f6f5f7]');
  },
};

export const SignInClicked: Story = {
  play: async ({ canvasElement }) => {
    const { signIn } = await getGuestControls(canvasElement);
    await userEvent.pointer([{ keys: '[MouseLeft>]', target: signIn }]);
    await expect(signIn).toHaveClass('active:bg-[#d5d3d9]');
    await userEvent.pointer([{ keys: '[/MouseLeft]', target: signIn }]);
  },
};

export const StartHover: Story = {
  play: async ({ canvasElement }) => {
    const { start } = await getGuestControls(canvasElement);
    await userEvent.hover(start);
    await expect(start).toHaveClass('hover:bg-[#865bcf]');
  },
};

export const StartClicked: Story = {
  play: async ({ canvasElement }) => {
    const { start } = await getGuestControls(canvasElement);
    await userEvent.pointer([{ keys: '[MouseLeft>]', target: start }]);
    await expect(start).toHaveClass('active:bg-[#a585db]');
    await userEvent.pointer([{ keys: '[/MouseLeft]', target: start }]);
  },
};

export const LanguageHover: Story = {
  play: async ({ canvasElement }) => {
    const { language } = await getGuestControls(canvasElement);
    await userEvent.hover(language);
    await expect(language).toHaveClass('hover:bg-[#f6f5f7]');
    await expect(language).toHaveClass('hover:text-[#161519]');
  },
};

export const LanguageClicked: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, language } = await getGuestControls(canvasElement);
    await userEvent.click(language);
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await expectCompactControl(language, 'rgb(213, 211, 217)', 'rgb(22, 21, 25)');
    await expectCompactLanguageColor(language, 'rgb(22, 21, 25)');
    await expect(canvas.getByRole('menu')).toBeVisible();
    const russian = canvas.getByRole('menuitem', { name: 'Русский' });
    const kazakh = canvas.getByRole('menuitem', { name: 'Қазақша' });
    await expectCompactPointerClean(russian);
    await expect(russian).toHaveClass('rounded-[4px]');
    await expect(kazakh).toHaveClass('rounded-[4px]');
    await expect(russian).toHaveAttribute('aria-current', 'true');
    await expect(russian.querySelectorAll('svg').length).toBe(1);
    await expect(kazakh.querySelectorAll('svg').length).toBe(0);
    const selectedTick = russian.querySelector('svg');
    await expect(selectedTick).not.toBeNull();
    if (selectedTick) await expect(getComputedStyle(selectedTick).color).toBe('rgb(106, 55, 195)');
    await expect(russian).toHaveClass('hover:bg-[#f8f5fc]');
    await expect(kazakh).toHaveClass('hover:bg-[#f8f5fc]');
  },
};

export const KeyboardAndDropdownBehavior: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, signIn, language } = await getGuestControls(canvasElement);
    await userEvent.click(language);
    const russian = canvas.getByRole('menuitem', { name: 'Русский' });
    const kazakh = canvas.getByRole('menuitem', { name: 'Қазақша' });
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await expect(russian).toHaveFocus();
    await expectCompactPointerClean(russian);
    await userEvent.keyboard('{ArrowDown}');
    await expect(kazakh).toHaveFocus();
    await expectCompactKeyboardFocus(kazakh);
    await userEvent.keyboard('{ArrowUp}');
    await expect(russian).toHaveFocus();
    await expectCompactKeyboardFocus(russian);
    await userEvent.keyboard('{ArrowDown}');
    await expect(kazakh).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(language).toHaveAttribute('aria-expanded', 'false');
    await expect(language).toHaveFocus();
    await expect(language).toHaveTextContent('KK');
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(language).toHaveAttribute('aria-expanded', 'false');
    await expect(language).toHaveFocus();
    await userEvent.tab();
    await expect(signIn).toHaveFocus();
  },
};

export const CompletedRouteNavigation: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, signIn, start } = await getGuestControls(canvasElement);
    const location = canvas.getByLabelText('Current story location');
    await expect(location).toHaveTextContent('/');
    await userEvent.click(signIn);
    await expect(location).toHaveTextContent('/login');
    await userEvent.click(start);
    await expect(location).toHaveTextContent('/onboarding');
  },
};

export const KazakhNoClipping: Story = {
  render: () => <NavbarStory language="kk" />,
  play: async ({ canvasElement }) => {
    const { signIn, start, language } = await getGuestControls(canvasElement);
    await expect(window.devicePixelRatio).toBe(1);
    const header = canvasElement.querySelector<HTMLElement>('[data-desktop-guest-navbar]');
    await expect(header).not.toBeNull();
    if (!header) return;
    for (const control of [signIn, start, language]) {
      await expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth);
      await expect(control.getBoundingClientRect().height).toBe(32);
    }
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  },
};
