import '../../../i18n';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import App from '../../../App';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../model';

const ownerA = {
  id: 101,
  username: 'owner-a',
  email: 'owner-a@example.com',
  language: 'ru' as const,
  grade: 'undefined' as const,
  role: 'user' as const,
};
const ownerB = { ...ownerA, id: 202, username: 'owner-b', email: 'owner-b@example.com' };
const staleTerm = { public_id: 'stale-term', name: 'Stale term', definition: 'Stale data' } as never;

type ScenarioController = {
  hold: boolean;
  pendingOwner: number | null | undefined;
  calls: Array<number | null | undefined>;
  original: (ownerUserId: number | null | undefined) => void;
};

let controller: ScenarioController | null = null;

function setupScenario() {
  const previousAuth = useAuthStore.getState();
  const previousFavorites = useFavoritesStore.getState();
  const previousPath = window.location.href;
  const previousStorage = window.localStorage.getItem('infopedia_auth');
  const original = previousFavorites.setOwnerUserId;
  const scenario: ScenarioController = { hold: false, pendingOwner: undefined, calls: [], original };
  const controlledSetOwner = (ownerUserId: number | null | undefined) => {
    scenario.calls.push(ownerUserId);
    scenario.pendingOwner = ownerUserId;
    if (!scenario.hold) original(ownerUserId);
  };
  scenario.original = original;
  controller = scenario;
  window.history.replaceState({}, '', '/forgot-password');
  useAuthStore.setState({ isAuthenticated: true, token: 'owner-sync-token', refreshToken: null, user: ownerA });
  useFavoritesStore.setState({
    ownerUserId: ownerA.id,
    list: [staleTerm],
    terms: [staleTerm],
    total: 1,
    skip: 0,
    limit: 20,
    serverConsumed: 1,
    hasMore: false,
    has_more: false,
    isLoading: false,
    loading: false,
    error: 'stale owner error',
    statusByTermRef: { 'stale-term': true },
    pendingByTermRef: { 'stale-term': true },
    errorByTermRef: { 'stale-term': 'stale owner error' },
    setOwnerUserId: controlledSetOwner,
  });
  return () => {
    controller = null;
    useAuthStore.setState(previousAuth);
    useFavoritesStore.setState(previousFavorites);
    if (previousStorage === null) window.localStorage.removeItem('infopedia_auth');
    else window.localStorage.setItem('infopedia_auth', previousStorage);
    window.history.replaceState({}, '', previousPath);
  };
}

function OwnerSyncScenario() {
  const [mounted, setMounted] = useState(true);
  const [cleanup] = useState(() => setupScenario());
  useEffect(() => cleanup, [cleanup]);

  const switchOwner = () => {
    if (!controller) return;
    controller.hold = true;
    useAuthStore.setState({ isAuthenticated: true, token: 'owner-b-token', refreshToken: null, user: ownerB });
  };
  const logout = () => {
    if (controller) controller.hold = true;
    useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
  };
  const releaseOwner = () => {
    if (!controller) return;
    controller.hold = false;
    controller.original(controller.pendingOwner);
  };

  return (
    <div data-testid="owner-sync-wrapper">
      {mounted ? <App /> : null}
      <button type="button" data-testid="owner-sync-switch" onClick={switchOwner}>Switch owner</button>
      <button type="button" data-testid="owner-sync-release" onClick={releaseOwner}>Release owner</button>
      <button type="button" data-testid="owner-sync-logout" onClick={logout}>Log out</button>
      <button type="button" data-testid="owner-sync-remount" onClick={() => setMounted((value) => !value)}>Remount</button>
    </div>
  );
}

const meta = {
  title: 'Pages/FavoritesOwnerSync',
  component: OwnerSyncScenario,
  parameters: {
    layout: 'fullscreen',
    // The owner barrier assertion targets ForgotPassword's form; keep the
    // story's axe context on that page subtree instead of its unrelated footer.
    a11y: { context: 'form' },
  },
} satisfies Meta<typeof OwnerSyncScenario>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuthOwnerBarrier: Story = {
  render: () => <OwnerSyncScenario />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const wrapper = canvas.getByTestId('owner-sync-wrapper');
    expect(wrapper.querySelector('form')).not.toBeNull();
    await userEvent.click(canvas.getByTestId('owner-sync-switch'));
    expect(wrapper.querySelector('form')).toBeNull();
    expect(controller?.calls).toContain(ownerB.id);
    await userEvent.click(canvas.getByTestId('owner-sync-release'));
    expect(wrapper.querySelector('form')).not.toBeNull();
    await userEvent.click(canvas.getByTestId('owner-sync-remount'));
    await userEvent.click(canvas.getByTestId('owner-sync-remount'));
    await userEvent.click(canvas.getByTestId('owner-sync-logout'));
    expect(wrapper.querySelector('form')).toBeNull();
    await userEvent.click(canvas.getByTestId('owner-sync-release'));
    const state = useFavoritesStore.getState();
    expect(state.ownerUserId).toBeNull();
    expect(state.list).toEqual([]);
    expect(state.terms).toEqual([]);
    expect(state.statusByTermRef).toEqual({});
    expect(state.pendingByTermRef).toEqual({});
    expect(state.errorByTermRef).toEqual({});
    expect(state.error).toBeNull();
  },
};
