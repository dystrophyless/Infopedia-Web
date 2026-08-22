import '../i18n';
import { useEffect, useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, mocked, userEvent, within } from 'storybook/test';
import i18n from '../i18n';
import { startGoogleAuth } from '../api/auth';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Login } from './Login';

const meta = {
  title: 'Pages/Login',
  component: Login,
  parameters: {
    layout: 'fullscreen',
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  globals: { viewport: { value: 'mobile430', isRotated: false } },
} satisfies Meta<typeof Login>;

export default meta;
type Story = StoryObj<typeof meta>;

function LoginHarness({ mode }: { mode: 'success' | 'error' | 'footer' | 'google' }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = useAuthStore.getState();
    const previousLanguage = i18n.language;
    const previousPost = apiClient.post;
    const previousGet = apiClient.get;
    let tokenCalls = 0;
    window.sessionStorage.removeItem('login_story_token_calls');
    useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
    apiClient.post = (async (url, ...args) => {
      if (url === '/api/auth/token') {
        tokenCalls += 1;
        window.sessionStorage.setItem('login_story_token_calls', String(tokenCalls));
        if (mode === 'error') {
          const error = Object.assign(new Error('invalid'), {
            isAxiosError: true,
            response: { status: 401, data: { detail: 'Неверные учетные данные' } },
          });
          throw error;
        }
        return {
          data: { access_token: 'story-access', refresh_token: 'story-refresh', token_type: 'bearer' },
        };
      }
      return previousPost(url, ...args);
    }) as typeof apiClient.post;
    apiClient.get = (async (url, ...args) => {
      if (url === '/api/users/me') {
        return { data: { id: 1, onboarding_completed: true } };
      }
      return previousGet(url, ...args);
    }) as typeof apiClient.get;
    void i18n.changeLanguage('ru').then(() => setReady(true));
    return () => {
      apiClient.post = previousPost;
      apiClient.get = previousGet;
      useAuthStore.setState(previous);
      void i18n.changeLanguage(previousLanguage);
    };
  }, [mode]);

  if (!ready) return null;
  return (
    <MemoryRouter initialEntries={['/login?next=/search']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<div>search destination</div>} />
        <Route path="/onboarding" element={<div>onboarding destination</div>} />
      </Routes>
    </MemoryRouter>
  );
}

export const LoginFlow430: Story = {
  render: () => <LoginHarness mode="success" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Войдите в аккаунт' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Войти' })).toBeVisible();
    await expect(canvas.getByText('Нет аккаунта?')).toBeVisible();
    const email = canvas.getByRole('textbox', { name: 'Электронная почта' });
    const password = canvas.getByLabelText('Пароль');
    const emptyEmailPadding = getComputedStyle(email).paddingLeft;
    await expect(email.parentElement?.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    await expect(password.parentElement?.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    await expect(canvas.queryByTestId('mobile-onboarding-progress')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Войти' })).toBeDisabled();
    await userEvent.type(email, 'student@example.com');
    await userEvent.type(password, 'secret');
    const iconToggle = canvas.getByRole('button', { name: 'Показать пароль' });
    const filledEmailPadding = getComputedStyle(email).paddingLeft;
    await expect(filledEmailPadding).toBe(emptyEmailPadding);
    await expect(email.parentElement?.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    await expect(password.parentElement?.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    const toggleRect = iconToggle.getBoundingClientRect();
    await expect(toggleRect.width).toBeGreaterThanOrEqual(44);
    await expect(toggleRect.height).toBeGreaterThanOrEqual(44);
    await userEvent.click(iconToggle);
    await expect(password).toHaveAttribute('type', 'text');
    await expect(canvas.getByRole('button', { name: 'Войти' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Войти' }));
    await expect(canvas.getByText('search destination')).toBeVisible();
    await expect(window.sessionStorage.getItem('login_story_token_calls')).toBe('1');
  },
};

export const LoginError430: Story = {
  render: () => <LoginHarness mode="error" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Электронная почта' }), 'bad@example.com');
    await userEvent.type(canvas.getByLabelText('Пароль'), 'wrong');
    await userEvent.click(canvas.getByRole('button', { name: 'Войти' }));
    await expect(canvas.getByRole('alert')).toBeVisible();
  },
};

export const LoginValidationDisabled430: Story = {
  render: () => <LoginHarness mode="success" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByRole('textbox', { name: 'Электронная почта' });
    const password = canvas.getByLabelText('Пароль');
    const submit = canvas.getByRole('button', { name: 'Войти' });
    await expect(submit).toBeDisabled();
    await userEvent.type(email, 'student@example.com');
    await expect(submit).toBeDisabled();
    await userEvent.clear(email);
    await userEvent.type(password, 'secret');
    await expect(submit).toBeDisabled();
    await userEvent.clear(password);
    await userEvent.type(email, '   ');
    await expect(submit).toBeDisabled();
    await expect(window.sessionStorage.getItem('login_story_token_calls')).toBeNull();
  },
};

export const LoginFooterOnboarding430: Story = {
  render: () => <LoginHarness mode="footer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('link', { name: 'Создать' }));
    await expect(canvas.getByText('onboarding destination')).toBeVisible();
  },
};

export const LoginGoogleNext430: Story = {
  render: () => <LoginHarness mode="google" />,
  beforeEach: () => {
    mocked(startGoogleAuth).mockImplementation(() => undefined);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const initialHref = window.location.href;
    await userEvent.click(canvas.getByRole('button', { name: /Google/ }));
    await expect(mocked(startGoogleAuth)).toHaveBeenCalledTimes(1);
    await expect(mocked(startGoogleAuth)).toHaveBeenCalledWith('/search');
    await expect(window.location.href).toBe(initialHref);
  },
};

export const LoginDesktopCentered1440: Story = {
  render: () => <LoginHarness mode="success" />,
  parameters: { viewport: { value: 'desktop1440' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('desktop-auth-main')).toBeVisible();
    await expect(canvas.getByTestId('desktop-auth-card')).toBeVisible();
    await expect(canvas.queryByTestId('desktop-onboarding-sidebar')).toBeNull();
  },
};
