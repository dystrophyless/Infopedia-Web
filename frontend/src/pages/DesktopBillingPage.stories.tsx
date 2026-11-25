import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { DesktopSidebar } from '../components/DesktopSidebar';
import i18n from '../i18n';
import type { User } from '../types';
import { DesktopBillingPage } from './DesktopBillingPage';

const sampleUser: User = {
  id: 42,
  username: 'student',
  email: 'student@example.com',
  language: 'ru',
  grade: '11',
  role: 'user',
};

function RussianLocale({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void i18n.changeLanguage('ru').then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);
  return ready ? children : null;
}

function ProfileBillingHarness() {
  const [view, setView] = useState<'billing' | 'settings'>('billing');
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar activeItem="profile" onLogout={() => undefined} user={sampleUser} />
      <main className="min-w-0 flex-1">
        {view === 'billing'
          ? <DesktopBillingPage onBack={() => setView('settings')} />
          : <div data-billing-settings-home className="min-h-screen bg-[#efeaf8] p-6">Настройки</div>}
      </main>
    </div>
  );
}

const meta = {
  title: 'Pages/Profile/Desktop Billing',
  component: DesktopBillingPage,
  args: { onBack: () => undefined },
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  render: () => (
    <RussianLocale>
      <MemoryRouter initialEntries={['/profile?tab=settings']}>
        <Routes>
          <Route path="/profile" element={<ProfileBillingHarness />} />
          <Route path="/subscription" element={<div data-billing-upgrade-target>Subscription route</div>} />
        </Routes>
      </MemoryRouter>
    </RussianLocale>
  ),
} satisfies Meta<typeof DesktopBillingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

async function assertPage(canvasElement: HTMLElement, width: number) {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole('heading', { level: 1, name: 'Подписка' })).toBeInTheDocument();
  await expect(canvas.getByRole('heading', { level: 2, name: 'История платежей' })).toBeInTheDocument();
  expect(canvasElement.querySelectorAll('[data-desktop-sidebar]')).toHaveLength(1);
  expect(canvasElement.querySelectorAll('[data-billing-current-plan]')).toHaveLength(1);
  expect(canvas.getByText('Бесплатный план')).toBeInTheDocument();
  expect(canvas.getByText('Демо-значения — не данные вашего аккаунта')).toBeInTheDocument();
  for (const [id, text] of [
    ['tests', '3 из 5 в месяц'],
    ['analyze', '1 из 3 в месяц'],
    ['algosha', '10 из 20 в день'],
  ]) {
    const row = canvasElement.querySelector<HTMLElement>(`[data-billing-usage="${id}"]`);
    expect(row).not.toBeNull();
    expect(within(row!).getByText(text)).toBeInTheDocument();
  }
  for (const heading of ['Дата', 'Сумма', 'Статус']) {
    expect(canvas.getByRole('columnheader', { name: heading })).toBeInTheDocument();
  }
  expect(canvas.getByText('История платежей недоступна')).toBeInTheDocument();
  expect(canvas.getByText('Данные о платежах сейчас недоступны.')).toBeInTheDocument();
  expect(canvas.queryByText('Нет платежей')).not.toBeInTheDocument();

  const column = canvasElement.querySelector<HTMLElement>('[data-billing-content]');
  const page = canvasElement.querySelector<HTMLElement>('[data-figma-node="1723:3376"]');
  expect(column).not.toBeNull();
  expect(page).not.toBeNull();
  await waitFor(() => expect(Math.round(column!.getBoundingClientRect().width)).toBe(width));
  expect(column!.scrollWidth).toBeLessThanOrEqual(column!.clientWidth + 1);
  expect(page!.scrollWidth).toBeLessThanOrEqual(page!.clientWidth + 1);
}

export const Desktop1440: Story = {
  play: async ({ canvasElement }) => assertPage(canvasElement, 640),
};

export const Desktop875: Story = {
  globals: { viewport: { value: 'desktop875x831', isRotated: false } },
  play: async ({ canvasElement }) => assertPage(canvasElement, 507),
};

export const BackToSettings: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Назад' }));
    await expect(canvas.getByText('Настройки')).toBeInTheDocument();
    expect(canvasElement.querySelector('[data-billing-settings-home]')).not.toBeNull();
    expect(canvasElement.querySelector('[data-billing-upgrade-target]')).toBeNull();
  },
};

export const UpgradeRoute: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Улучшить план' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-billing-upgrade-target]')).not.toBeNull());
  },
};
