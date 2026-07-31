import '../../../i18n';
import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import { Layout } from '../../../components/Layout';
import { apiClient } from '../../../api/client';
import i18n from '../../../i18n';
import { useAuthStore } from '../../../stores/authStore';
import { useSearchStore } from '../model';
import { TermSearchPage } from './TermSearchPage';

const storyUser = {
  id: 2,
  username: 'storybook-search',
  email: 'storybook-search@example.com',
  language: 'ru' as const,
  grade: 'undefined' as const,
  role: 'user' as const,
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-hidden="true" className="hidden" data-testid="search-story-location">{location.pathname}</output>;
}

function EmptySearchStory({
  language,
  fullShell = true,
}: {
  language: 'ru' | 'kk';
  fullShell?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    const previousGet = apiClient.get;
    apiClient.get = (async () => ({ data: [] })) as typeof apiClient.get;
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { ...storyUser, language },
    });
    useSearchStore.getState().reset();
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      apiClient.get = previousGet;
      useSearchStore.getState().reset();
      useAuthStore.setState({
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [language]);

  if (!ready) return null;

  const content = (
    <>
      <TermSearchPage />
      <LocationProbe />
    </>
  );

  return (
    <MemoryRouter initialEntries={['/search?query=adaptive-empty-state']}>
      {fullShell ? <Layout>{content}</Layout> : content}
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/Search/Empty Outcome',
  component: TermSearchPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TermSearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Russian: Story = {
  tags: ['!test'],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <EmptySearchStory language="ru" />,
};

export const Kazakh: Story = {
  tags: ['!test'],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <EmptySearchStory language="kk" />,
};

export const BehaviorRussian: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { context: '[data-mobile-search-empty]' },
  },
  render: () => <EmptySearchStory language="ru" fullShell={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = await canvas.findByRole('heading', { level: 2 });
    const outcome = heading.closest<HTMLElement>('[data-mobile-search-empty]');
    expect(outcome).not.toBeNull();
    if (!outcome) return;

    const cta = within(outcome).getByRole('link');
    const accessibleName = cta.textContent?.trim();
    expect(accessibleName).toBeTruthy();
    await expect(cta).toHaveAccessibleName(accessibleName);
    await expect(cta).toHaveAttribute('href', '/search/filters');
    await userEvent.click(cta);
    await expect(canvas.getByTestId('search-story-location')).toHaveTextContent('/search/filters');
  },
};
