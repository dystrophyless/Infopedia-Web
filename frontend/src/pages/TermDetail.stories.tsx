import '../i18n';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { apiClient } from '../api/client';
import { useFavoritesStore } from '../features/favorites/model';
import { useAuthStore } from '../stores/authStore';
import type { Term } from '../types';
import { TermDetail } from './TermDetail';

const termA: Term = {
  public_id: 'term-a',
  name: 'Термин A',
  definitions: [
    { public_id: 'definition-a1', name: 'Термин A', text: 'Определение A1', page: 10, topic: { name: 'Тема A1', book: { publisher: 'Атамұра', grade: 10 } } },
    { public_id: 'definition-a2', name: 'Термин A', text: 'Определение A2', page: 11, topic: { name: 'Тема A2', book: { publisher: 'Мектеп', grade: 10 } } },
  ],
};

const termB: Term = {
  public_id: 'term-b',
  name: 'Термин B',
  definitions: [
    { public_id: 'definition-b1', name: 'Термин B', text: 'Определение B1', page: 20, topic: { name: 'Тема B1', book: { publisher: 'Арман-ПВ', grade: 11 } } },
  ],
};

const relatedA1 = [
  { public_id: 'a1-related-1', name: 'A1 связанный 1' },
  { public_id: 'a1-related-2', name: 'A1 связанный 2' },
  { public_id: 'a1-related-3', name: 'A1 связанный 3' },
];
const relatedA2 = [
  { public_id: 'a2-related-1', name: 'A2 связанный 1' },
  { public_id: 'a2-related-2', name: 'A2 связанный 2' },
  { public_id: 'a2-related-3', name: 'A2 связанный 3' },
];
const relatedB1 = [
  { public_id: 'b1-related-1', name: 'B1 связанный 1' },
  { public_id: 'b1-related-2', name: 'B1 связанный 2' },
  { public_id: 'b1-related-3', name: 'B1 связанный 3' },
];

let resolveA2Related: (() => void) | null = null;
let resolveTermB: (() => void) | null = null;
let requestLog: string[] = [];

function NavigateToTermB() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/terms/term-b')}>Открыть термин B</button>;
}

function TermDetailHarness({ authenticated, switchable = false }: { authenticated: boolean; switchable?: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previousGet = apiClient.get;
    const previousAuth = useAuthStore.getState();
    const previousEnsureStatuses = useFavoritesStore.getState().ensureStatuses;
    requestLog = [];
    resolveA2Related = null;
    resolveTermB = null;
    useAuthStore.setState({
      isAuthenticated: authenticated,
      token: authenticated ? 'term-detail-story-token' : null,
      refreshToken: null,
      user: authenticated
        ? { id: 7, username: 'term-detail-story', email: 'term-detail@example.com', language: 'ru', grade: 'undefined', role: 'user' }
        : null,
    });
    useFavoritesStore.setState({ ensureStatuses: async () => undefined });
    apiClient.get = (async (url, config) => {
      const definitionRef = config?.params?.definition_ref as string | undefined;
      requestLog.push(definitionRef ? `${url}?definition_ref=${definitionRef}` : url);
      if (url === '/api/terms/term-a') return { data: termA };
      if (url === '/api/terms/term-b') {
        if (!switchable) return { data: termB };
        return new Promise<{ data: Term }>((resolve) => {
          resolveTermB = () => resolve({ data: termB });
        });
      }
      if (url === '/api/terms/term-a/related' && definitionRef === 'definition-a1') return { data: relatedA1 };
      if (url === '/api/terms/term-a/related' && definitionRef === 'definition-a2') {
        return new Promise<{ data: typeof relatedA2 }>((resolve) => {
          resolveA2Related = () => resolve({ data: relatedA2 });
        });
      }
      if (url === '/api/terms/term-b/related' && definitionRef === 'definition-b1') return { data: relatedB1 };
      if (url.includes('/related')) return { data: [] };
      return previousGet(url, config);
    }) as typeof apiClient.get;
    setReady(true);
    return () => {
      apiClient.get = previousGet;
      useAuthStore.setState(previousAuth);
      useFavoritesStore.setState({ ensureStatuses: previousEnsureStatuses });
      resolveA2Related = null;
      resolveTermB = null;
      requestLog = [];
    };
  }, [authenticated, switchable]);

  if (!ready) return null;
  const initialEntry = authenticated
    ? '/terms/term-a'
    : { pathname: '/terms/term-a', state: { term: termA, backTo: '/' } };
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/terms/:termRef"
          element={<>{switchable && <NavigateToTermB />}<TermDetail /></>}
        />
        <Route path="/" element={<div>Главная</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/Term Detail lifecycle',
  component: TermDetail,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TermDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuthenticatedMobilePager: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <TermDetailHarness authenticated />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('link', { name: 'A1 связанный 1' })).resolves.toBeVisible();
    await expect(requestLog).toContain('/api/terms/term-a/related?definition_ref=definition-a1');
    await expect(canvas.getAllByRole('link', { name: /A1 связанный/ })).toHaveLength(3);

    await userEvent.click(canvas.getAllByRole('button', { name: /Далее/i })[0]);
    await waitFor(() => expect(resolveA2Related).not.toBeNull());
    await expect(canvas.queryByRole('link', { name: 'A1 связанный 1' })).not.toBeInTheDocument();
    resolveA2Related?.();
    await expect(canvas.findByRole('link', { name: 'A2 связанный 1' })).resolves.toBeVisible();
    await expect(canvas.getAllByRole('link', { name: /A2 связанный/ })).toHaveLength(3);
  },
};

export const AuthenticatedDesktopThreeServerTerms: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <TermDetailHarness authenticated />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('link', { name: 'A1 связанный 1' })).resolves.toBeVisible();
    await expect(canvas.getAllByRole('link', { name: /A1 связанный/ })).toHaveLength(3);
  },
};

export const GuestStateDoesNotRequestRelated: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <TermDetailHarness authenticated={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findAllByText('Термин A')).resolves.toHaveLength(2);
    await waitFor(() => expect(requestLog.filter((request) => request.includes('/related'))).toHaveLength(0));
  },
};

export const UrlSwitchNeverRequestsMismatchedDefinition: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <TermDetailHarness authenticated switchable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole('link', { name: 'A1 связанный 1' })).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Открыть термин B' }));
    await waitFor(() => expect(resolveTermB).not.toBeNull());
    await expect(canvas.queryAllByText('Термин A')).toHaveLength(0);
    await expect(requestLog).not.toContain('/api/terms/term-b/related?definition_ref=definition-a1');
    resolveTermB?.();
    await expect(canvas.findAllByText('Термин B')).resolves.toHaveLength(2);
    await expect(canvas.queryAllByText('Термин A')).toHaveLength(0);
    await expect(canvas.findByRole('link', { name: 'B1 связанный 1' })).resolves.toBeVisible();
    await expect(requestLog).not.toContain('/api/terms/term-b/related?definition_ref=definition-a1');
  },
};
