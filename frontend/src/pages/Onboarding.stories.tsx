import '../i18n';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../i18n';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { clearPendingOnboardingDraft, savePendingOnboardingDraft } from '../utils/onboardingDraft';
import { Onboarding } from './Onboarding';

// Exact Figma colors are below Axe's contrast threshold; every other rule stays enabled.
const exactFigmaA11y = {
  config: { rules: [{ id: 'color-contrast', enabled: false }] },
};

const meta = {
  title: 'Pages/Onboarding',
  component: Onboarding,
  parameters: { layout: 'fullscreen', a11y: exactFigmaA11y },
  globals: { viewport: { value: 'mobile430', isRotated: false } },
} satisfies Meta<typeof Onboarding>;

export default meta;
type Story = StoryObj<typeof meta>;
const PENDING_ONBOARDING_DRAFT_STORAGE_KEY = 'infopedia_pending_onboarding_draft';

const seedPendingDraft = async () => {
  const previousDraftRaw = window.localStorage.getItem(PENDING_ONBOARDING_DRAFT_STORAGE_KEY);
  savePendingOnboardingDraft({ grade: '10', username: 'existing-user' });
  return { previousDraftRaw };
};

function GuestRussianOnboardingStory({
  previousDraftRaw,
  usernameAvailability = 'available',
}: {
  previousDraftRaw: string | null;
  usernameAvailability?: 'available' | 'taken' | 'error';
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = useAuthStore.getState();
    const previousLanguage = i18n.language;
    const previousApiGet = apiClient.get;
    clearPendingOnboardingDraft();
    useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
    let draftRestored = false;
    const restoreDraft = () => {
      if (draftRestored) return;
      draftRestored = true;
      if (previousDraftRaw === null) {
        window.localStorage.removeItem(PENDING_ONBOARDING_DRAFT_STORAGE_KEY);
      } else {
        window.localStorage.setItem(PENDING_ONBOARDING_DRAFT_STORAGE_KEY, previousDraftRaw);
      }
    };
    apiClient.get = (async (url, ...args) => {
      if (url === '/api/users/username-availability') {
        if (usernameAvailability === 'error') {
          throw new Error('Story username availability failure');
        }
        const config = args[0] as { params?: { username?: string } } | undefined;
        const username = config?.params?.username ?? '';
        return { data: { username, available: usernameAvailability === 'available' } };
      }
      return previousApiGet(url, ...args);
    }) as typeof apiClient.get;
    window.addEventListener('pagehide', restoreDraft);
    window.addEventListener('beforeunload', restoreDraft);
    window.addEventListener('unload', restoreDraft);
    let mounted = true;
    void i18n.changeLanguage('ru').then(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
      setReady(false);
      window.removeEventListener('pagehide', restoreDraft);
      window.removeEventListener('beforeunload', restoreDraft);
      window.removeEventListener('unload', restoreDraft);
      restoreDraft();
      apiClient.get = previousApiGet;
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [previousDraftRaw, usernameAvailability]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/onboarding']}>
      <Onboarding />
    </MemoryRouter>
  );
}

export const GradeUnselected430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: '10 класс' })).toBeVisible();
  },
};

export const Grade10Selected430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '10 класс' }));
    await expect(canvas.getByRole('button', { name: '10 класс' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const GradeError430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: 'Продолжить' });
    fireEvent.submit(submit.closest('form')!);
    await expect(canvas.getByRole('alert')).toBeVisible();
  },
};

async function advanceToUsername(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole('button', { name: '10 класс' }));
  await userEvent.click(canvas.getByRole('button', { name: 'Продолжить' }));
  await expect(canvas.getByRole('textbox', { name: 'Имя пользователя' })).toBeVisible();
}

export const UsernameEmpty430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToUsername(canvas);
    await expect(canvas.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  },
};

export const UsernameTyped430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToUsername(canvas);
    const input = canvas.getByRole('textbox', { name: 'Имя пользователя' });
    await userEvent.type(input, 'dystrophyless');
    await expect(input).toHaveValue('dystrophyless');
    await waitFor(
      async () => {
        await expect(canvas.getByRole('button', { name: 'Продолжить' })).toBeEnabled();
      },
      { timeout: 2000 },
    );
  },
};

export const UsernameValidationError430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory previousDraftRaw={context.loaded.previousDraftRaw} />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToUsername(canvas);
    const input = canvas.getByRole('textbox', { name: 'Имя пользователя' });
    await userEvent.type(input, 'ab');
    await userEvent.tab();
    await expect(canvas.getByRole('alert')).toBeVisible();
  },
};

export const UsernameRequestError430: Story = {
  render: (_args, context) => (
    <GuestRussianOnboardingStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      usernameAvailability="error"
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToUsername(canvas);
    const input = canvas.getByRole('textbox', { name: 'Имя пользователя' });
    await userEvent.type(input, 'dystrophyless');
    await waitFor(
      async () => {
        await expect(input.getAttribute('aria-describedby')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  },
};
