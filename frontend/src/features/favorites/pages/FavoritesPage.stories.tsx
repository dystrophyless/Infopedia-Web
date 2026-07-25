import '../../../i18n';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../i18n';
import { Layout } from '../../../components/Layout';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../model';
import { FavoritesPage } from './FavoritesPage';

const storyUser = {
  id: 1,
  username: 'storybook-favorites',
  email: 'storybook@example.com',
  language: 'ru' as const,
  grade: 'undefined' as const,
  role: 'user' as const,
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-hidden="true" className="hidden" data-testid="favorites-story-location">{location.pathname}</output>;
}

function FavoritesStory({ language }: { language: 'ru' | 'kk' }) {
  const [ready, setReady] = useState(i18n.language === language);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    const previousLoadFavorites = useFavoritesStore.getState().loadFavorites;
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token', refreshToken: null, user: storyUser });
    useFavoritesStore.setState({
      ownerUserId: storyUser.id,
      list: [],
      terms: [],
      total: 0,
      skip: 0,
      limit: 20,
      serverConsumed: 0,
      hasMore: false,
      has_more: false,
      isLoading: false,
      loading: false,
      error: null,
      loadFavorites: async () => undefined,
    });
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
      useFavoritesStore.setState({ loadFavorites: previousLoadFavorites });
      useFavoritesStore.getState().reset();
      void i18n.changeLanguage(previousLanguage);
    };
  }, [language]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/favorites']}>
      <Layout>
        <FavoritesPage />
        <LocationProbe />
      </Layout>
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/Favorites',
  component: FavoritesPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FavoritesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

async function assertEmptyFavorites({ canvasElement, title, body, cta }: { canvasElement: HTMLElement; title: string; body: string; cta: string }) {
  const canvas = within(canvasElement);
  const alert = await canvas.findByRole('region', { name: title });
  await waitFor(() => {
    const rect = alert.getBoundingClientRect();
    expect(rect.x).toBe(24);
    expect(rect.y).toBe(366);
    expect(rect.width).toBe(382);
    expect(rect.height).toBe(208);
  });
  const emptyStateWrapper = alert.parentElement;
  expect(emptyStateWrapper).not.toBeNull();
  if (emptyStateWrapper) {
    const wrapperStyle = getComputedStyle(emptyStateWrapper);
    expect(wrapperStyle.position).toBe('fixed');
    expect(wrapperStyle.top).toBe('366px');
    expect(wrapperStyle.left).toBe('24px');
    expect(wrapperStyle.right).toBe('24px');
    expect(wrapperStyle.paddingTop).toBe('0px');
    expect(wrapperStyle.transform).toBe('none');
  }
  await expect(canvas.getByRole('heading', { name: title })).toHaveStyle({ fontSize: '20px', lineHeight: '20px' });
  const helper = canvas.getByText(body);
  await expect(helper).toHaveStyle({ fontSize: '14px', lineHeight: '14px', color: 'rgb(110, 103, 121)' });
  expect(helper.getBoundingClientRect().height).toBe(28);
  expect(alert.firstElementChild?.getBoundingClientRect().width).toBe(64);
  expect(alert.firstElementChild?.getBoundingClientRect().height).toBe(64);
  const icon = alert.querySelector('svg');
  expect(icon).not.toBeNull();
  expect(icon?.getBoundingClientRect().width).toBe(32);
  expect(icon?.getBoundingClientRect().height).toBe(32);
  const button = canvas.getByRole('button', { name: `${cta} →` });
  await expect(button).toHaveStyle({ width: '382px', height: '40px', borderRadius: '8px', backgroundColor: 'rgb(106, 55, 195)', fontSize: '16px', lineHeight: '16px', fontWeight: '500' });
  expect(button.querySelector('svg')).toBeNull();
  expect(alert).not.toHaveStyle({ backgroundColor: 'rgb(255, 255, 255)' });
  await userEvent.click(button);
  await expect(canvas.getByTestId('favorites-story-location')).toHaveTextContent('/search');
}

export const Russian: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <FavoritesStory language="ru" />,
  play: ({ canvasElement }) => assertEmptyFavorites({
    canvasElement,
    title: 'В избранном пока ничего нет',
    body: 'Сохраняйте термины во время просмотра, чтобы найти их здесь.',
    cta: 'Искать термины',
  }),
};

export const Kazakh: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <FavoritesStory language="kk" />,
  play: ({ canvasElement }) => assertEmptyFavorites({
    canvasElement,
    title: 'Таңдаулылар әзірге бос',
    body: 'Оларды осы жерден табу үшін терминдерді қарап отырып сақтаңыз.',
    cta: 'Терминдерді іздеу',
  }),
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <FavoritesStory language="ru" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole('region', { name: 'В избранном пока ничего нет' });
    const emptyStateWrapper = alert.parentElement;
    expect(emptyStateWrapper).not.toBeNull();
    if (emptyStateWrapper) {
      await waitFor(() => {
        const wrapperStyle = getComputedStyle(emptyStateWrapper);
        expect(wrapperStyle.position).toBe('static');
        expect(wrapperStyle.top).toBe('auto');
        expect(wrapperStyle.left).toBe('auto');
        expect(wrapperStyle.right).toBe('auto');
        expect(wrapperStyle.display).toBe('flex');
        expect(wrapperStyle.flexGrow).toBe('1');
        expect(wrapperStyle.alignItems).toBe('center');
        expect(wrapperStyle.justifyContent).toBe('center');
        expect(wrapperStyle.paddingLeft).toBe('24px');
        expect(wrapperStyle.paddingRight).toBe('24px');
        expect(wrapperStyle.transform).toBe('none');
      });
    }
  },
};
