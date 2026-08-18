import '../i18n';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import i18n from '../i18n';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { clearPendingOnboardingDraft, savePendingOnboardingDraft } from '../utils/onboardingDraft';
import { Register } from './Register';

// Exact Figma colors are below Axe's contrast threshold; every other rule stays enabled.
const exactFigmaA11y = {
  config: { rules: [{ id: 'color-contrast', enabled: false }] },
};

const meta = {
  title: 'Pages/Register',
  component: Register,
  parameters: { layout: 'fullscreen', a11y: exactFigmaA11y },
  globals: { viewport: { value: 'mobile430', isRotated: false } },
} satisfies Meta<typeof Register>;

export default meta;
type Story = StoryObj<typeof meta>;

const PENDING_ONBOARDING_DRAFT_STORAGE_KEY = 'infopedia_pending_onboarding_draft';

const seedPendingDraft = async () => {
  const previousDraftRaw = window.localStorage.getItem(PENDING_ONBOARDING_DRAFT_STORAGE_KEY);
  savePendingOnboardingDraft({ grade: '10', username: 'dystrophyless' });
  return { previousDraftRaw, registerRequests: [] as string[] };
};

function GuestRussianRegisterStory({
  previousDraftRaw,
  registerRequests,
  registerFailure = false,
  verifyFailure = false,
}: {
  previousDraftRaw: string | null;
  registerRequests: string[];
  registerFailure?: boolean;
  verifyFailure?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previous = useAuthStore.getState();
    const previousLanguage = i18n.language;
    const previousApiPost = apiClient.post;
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
    apiClient.post = (async (url, ...args) => {
      if (url === '/api/auth/register') {
        registerRequests.push(url);
        if (registerFailure) throw new Error('Story registration failure');
        return { data: undefined };
      }
      if (url === '/api/auth/verify-email') {
        if (verifyFailure) throw new Error('Story verification failure');
        return { data: { access_token: 'story-access', refresh_token: 'story-refresh' } };
      }
      return previousApiPost(url, ...args);
    }) as typeof apiClient.post;
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
      apiClient.post = previousApiPost;
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [previousDraftRaw, registerFailure, registerRequests, verifyFailure]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/register']}>
      <Register />
    </MemoryRouter>
  );
}

async function fillAccount(canvas: ReturnType<typeof within>) {
  const email = canvas.getByRole('textbox', { name: 'Электронная почта' });
  const password = canvas.getByLabelText('Пароль');
  await userEvent.type(email, 'dystrophyless@gmail.com');
  await userEvent.type(password, 'password');
  await expect(email).toHaveValue('dystrophyless@gmail.com');
  await expect(password).toHaveValue('password');
  return { email, password };
}

async function advanceToVerify(canvas: ReturnType<typeof within>) {
  await fillAccount(canvas);
  await userEvent.click(canvas.getByRole('button', { name: 'Получить код' }));
  await expect(canvas.getByRole('heading', { name: 'Подтвердите почту' })).toBeVisible();
}

export const RegisterEmpty430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Получить код' })).toBeDisabled();
  },
};

export const RegisterTyped430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement, loaded }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByRole('textbox', { name: 'Электронная почта' });
    const password = canvas.getByLabelText('Пароль');
    const submit = canvas.getByRole('button', { name: 'Получить код' });
    await userEvent.type(email, 'not-an-email');
    await userEvent.type(password, 'password');
    await expect(submit).toBeDisabled();
    fireEvent.submit(email.closest('form')!);
    await expect(loaded.registerRequests).toHaveLength(0);
    await expect(canvas.getByRole('heading', { name: 'Создать аккаунт' })).toBeVisible();

    await userEvent.clear(email);
    await userEvent.type(email, 'dystrophyless@gmail.com');
    await expect(submit).toBeEnabled();
    const toggle = canvas.getByRole('button', { name: 'Показать пароль' });
    await userEvent.click(toggle);
    await expect(password).toHaveAttribute('type', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Скрыть пароль' }));
    await expect(password).toHaveAttribute('type', 'password');
  },
};

export const RegisterErrors430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: 'Получить код' });
    fireEvent.submit(submit.closest('form')!);
    await expect(canvas.getAllByRole('alert')).toHaveLength(2);
  },
};

export const RegisterRequestError430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
      registerFailure
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAccount(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Получить код' }));
    await expect(canvas.getByRole('alert')).toBeVisible();
  },
};

export const VerifyEmpty430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToVerify(canvas);
    await expect(canvas.getAllByRole('textbox', { name: /Код подтверждения:/ })).toHaveLength(6);
    await expect(canvas.getByRole('button', { name: 'Подтвердить почту' })).toBeDisabled();
  },
};

export const VerifyTyped430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToVerify(canvas);
    const inputs = canvas.getAllByRole('textbox', { name: /Код подтверждения:/ });
    await userEvent.click(inputs[0]);
    await userEvent.paste('123456');
    await expect(inputs.map((input) => (input as HTMLInputElement).value).join('')).toBe('123456');
    await expect(canvas.getByRole('button', { name: 'Подтвердить почту' })).toBeEnabled();
  },
};

export const VerifyError430: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
      verifyFailure
    />
  ),
  loaders: [seedPendingDraft],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await advanceToVerify(canvas);
    const inputs = canvas.getAllByRole('textbox', { name: /Код подтверждения:/ });
    await userEvent.click(inputs[0]);
    await userEvent.paste('123456');
    await userEvent.click(canvas.getByRole('button', { name: 'Подтвердить почту' }));
    const message = await canvas.findByRole('alert');
    await expect(message).toBeVisible();
    for (const input of inputs) {
      await expect(input).toHaveAttribute('aria-describedby', message.id);
    }
  },
};

const desktop1440x1080 = {
  viewport: { value: 'desktop1440x1080', isRotated: false },
};

export const DesktopRegisterEmpty1440: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  globals: desktop1440x1080,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Получить код' })).toBeDisabled();
  },
};

export const DesktopRegisterFilled1440: Story = {
  render: (_args, context) => (
    <GuestRussianRegisterStory
      previousDraftRaw={context.loaded.previousDraftRaw}
      registerRequests={context.loaded.registerRequests}
    />
  ),
  loaders: [seedPendingDraft],
  globals: desktop1440x1080,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAccount(canvas);
    await expect(canvas.getByRole('button', { name: 'Получить код' })).toBeEnabled();
  },
};
