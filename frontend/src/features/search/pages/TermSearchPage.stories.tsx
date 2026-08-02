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

const desktopFeaturedTerms = Array.from({ length: 4 }, (_, index) => ({
  term: {
    public_id: `storybook-desktop-term-${index + 1}`,
    name: ['Алгоритм', 'Двоичный поиск', 'Массив', 'Рекурсия'][index],
  },
  featured_definition: {
    public_id: `storybook-desktop-definition-${index + 1}`,
    text: 'Фиксированное определение для проверки desktop Search rail.',
    page: index + 1,
  },
}));

const desktopLoadMoreTerms = Array.from({ length: 6 }, (_, index) => ({
  term: {
    public_id: `storybook-load-more-term-${index + 1}`,
    name: `Desktop term ${index + 1}`,
  },
  featured_definition: {
    public_id: `storybook-load-more-definition-${index + 1}`,
    text: 'Deterministic desktop load-more definition.',
    page: index + 1,
  },
}));

function DesktopSearchStory({
  terms = desktopFeaturedTerms,
  fullShell = true,
}: {
  terms?: typeof desktopFeaturedTerms;
  fullShell?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    const previousGet = apiClient.get;
    apiClient.get = (async (url: string) => {
      if (url.includes('/featured')) return { data: terms };
      return { data: terms.map(({ term, featured_definition }) => ({ ...term, definitions: [featured_definition] })) };
    }) as typeof apiClient.get;
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { ...storyUser, language: 'ru' },
    });
    useSearchStore.getState().reset();
    void i18n.changeLanguage('ru').then(() => {
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
  }, [terms]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/search']}>
      {fullShell ? <Layout><TermSearchPage /></Layout> : <TermSearchPage />}
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

export const DesktopModes: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    const modes = canvasElement.querySelectorAll<HTMLElement>('[data-desktop-search-mode]');
    const controls = canvasElement.querySelector<HTMLElement>('[data-desktop-search-controls]');
    const modeRail = canvasElement.querySelector<HTMLElement>('[data-desktop-search-modes]');
    const results = canvasElement.querySelector<HTMLElement>('[data-desktop-search-results]');
    expect(modes).toHaveLength(3);
    expect(controls).not.toBeNull();
    expect(modeRail).not.toBeNull();
    expect(results).not.toBeNull();
    if (!controls || !modeRail || !results) return;

    expect(controls.getBoundingClientRect().width).toBeCloseTo(684, 0);
    expect(results.getBoundingClientRect().width).toBeCloseTo(684, 0);
    expect(modeRail.getBoundingClientRect().top - controls.getBoundingClientRect().bottom).toBeCloseTo(32, 0);
    expect(results.getBoundingClientRect().top - modeRail.getBoundingClientRect().bottom).toBeCloseTo(24, 0);
    const modeRects = [...modes].map((mode) => mode.getBoundingClientRect());
    expect(modeRects[1].left - modeRects[0].right).toBeCloseTo(8, 0);
    expect(modeRects[2].left - modeRects[1].right).toBeCloseTo(8, 0);
    expect(canvasElement.querySelector('[data-desktop-search-mode="random"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const cards = [...results.querySelectorAll<HTMLElement>('[data-term-card-state]')];
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0].getBoundingClientRect().width).toBeCloseTo(684, 0);
    expect(cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom).toBeCloseTo(16, 0);
    await userEvent.click(modes[1]);
    expect(modes[1]).toHaveAttribute('aria-selected', 'true');
  },
};

async function assertSelectedDesktopGeometry(canvasElement: HTMLElement, stacked: boolean) {
  await canvasElement.ownerDocument?.fonts?.ready;
  const card = canvasElement.querySelector<HTMLElement>('[data-term-card-state="clicked"]');
  expect(card).not.toBeNull();
  if (!card) return;
  const main = card.querySelector<HTMLElement>('[data-term-card-main]');
  const panel = card.querySelector<HTMLElement>('[data-term-card-source-panel]');
  expect(main).not.toBeNull();
  expect(panel).not.toBeNull();
  if (!main || !panel) return;
  const cardRect = card.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  expect(mainRect.width).toBeCloseTo(684, 0);
  expect(panelRect.height).toBeCloseTo(mainRect.height, 0);
  if (stacked) {
    expect(panelRect.top).toBeGreaterThanOrEqual(mainRect.bottom - 1);
    expect(panelRect.width).toBeGreaterThanOrEqual(684);
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('*')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > viewportWidth + 1)
      .sort((a, b) => b.rect.right - a.rect.right)
      .slice(0, 5)
      .map(({ element, rect }) => `${element.tagName}.${element.className} right=${rect.right}`);
    expect(document.documentElement.scrollWidth, offenders.join(' | ')).toBeLessThanOrEqual(viewportWidth);
  } else {
    expect(panelRect.top).toBeCloseTo(mainRect.top, 0);
    expect(panelRect.right).toBeCloseTo(cardRect.right, 0);
    expect(cardRect.width).toBeGreaterThan(684);
  }
}

function assertDesktopShellGeometry(canvasElement: HTMLElement, expectedPadding: number) {
  const ownerDocument = canvasElement.ownerDocument;
  const content = canvasElement.querySelector<HTMLElement>('[data-desktop-search-content]');
  const controls = canvasElement.querySelector<HTMLElement>('[data-desktop-search-controls]');
  const sidebar = canvasElement.querySelector<HTMLElement>('[data-desktop-sidebar]');
  expect(content).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(sidebar).not.toBeNull();
  if (!content || !controls || !sidebar) return;

  const viewportWidth = ownerDocument.documentElement.clientWidth;
  const contentRect = content.getBoundingClientRect();
  const sidebarRect = sidebar.getBoundingClientRect();
  expect(getComputedStyle(content).paddingLeft).toBe(`${expectedPadding}px`);
  expect(getComputedStyle(content).paddingRight).toBe(`${expectedPadding}px`);
  expect(contentRect.left).toBeCloseTo(sidebarRect.right, 0);
  expect(contentRect.right).toBeCloseTo(viewportWidth, 0);
  expect(controls.getBoundingClientRect().width).toBeCloseTo(684, 0);
  expect(ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

export const DesktopSelectedFill1440: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    expect(title).not.toBeNull();
    if (!title) return;
    await userEvent.click(title);
    await assertSelectedDesktopGeometry(canvasElement, false);
    assertDesktopShellGeometry(canvasElement, 64);
  },
};

export const DesktopSelectedFill1280: Story = {
  globals: { viewport: { value: 'desktop1280', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    expect(title).not.toBeNull();
    if (!title) return;
    await userEvent.click(title);
    await assertSelectedDesktopGeometry(canvasElement, false);
    assertDesktopShellGeometry(canvasElement, 64);
  },
};

export const DesktopSelectedFill1024: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory fullShell />,
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    expect(title).not.toBeNull();
    if (!title) return;
    await userEvent.click(title);
    await assertSelectedDesktopGeometry(canvasElement, true);
    assertDesktopShellGeometry(canvasElement, 10);
  },
};

export const DesktopQueryFilters: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
    expect(input).not.toBeNull();
    if (!input) return;

    expect(canvasElement.querySelector('[data-desktop-search-modes]')).not.toBeNull();
    expect(canvasElement.querySelector('[data-desktop-search-filters]')).toBeNull();

    await userEvent.type(input, 'algorithm');
    const filterRail = canvasElement.querySelector<HTMLElement>('[data-desktop-search-filters]');
    const filters = [...canvasElement.querySelectorAll<HTMLElement>('[data-desktop-search-filter]')];
    expect(canvasElement.querySelector('[data-desktop-search-modes]')).toBeNull();
    expect(filterRail).not.toBeNull();
    expect(filters.map((filter) => filter.dataset.desktopSearchFilter)).toEqual([
      'filter',
      'specification',
      'book',
      'grade',
      'topic',
    ]);
    if (!filterRail) return;

    expect(getComputedStyle(filterRail).overflowX).toBe('auto');
    const rects = filters.map((filter) => filter.getBoundingClientRect());
    expect(rects).toHaveLength(5);
    expect(rects[0].height).toBeCloseTo(30, 0);
    expect(rects[1].left - rects[0].right).toBeCloseTo(8, 0);
    expect(getComputedStyle(filters[0]).backgroundColor).toBe('rgb(222, 210, 241)');
    expect(getComputedStyle(filters[0]).color).toBe('rgb(165, 133, 219)');

    await userEvent.click(filters[1]);
    expect(filters[1]).toHaveAttribute('aria-pressed', 'true');
    expect(getComputedStyle(filters[1]).backgroundColor).toBe('rgb(68, 35, 125)');

    await userEvent.clear(input);
    expect(canvasElement.querySelector('[data-desktop-search-filters]')).toBeNull();
    expect(canvasElement.querySelector('[data-desktop-search-modes]')).not.toBeNull();
  },
};

export const DesktopLoadMore: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
  render: () => <DesktopSearchStory terms={desktopLoadMoreTerms} />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    const results = canvasElement.querySelector<HTMLElement>('[data-desktop-search-results]');
    const loadMore = canvasElement.querySelector<HTMLElement>('[data-desktop-search-load-more]');
    expect(results).not.toBeNull();
    expect(loadMore).not.toBeNull();
    if (!results || !loadMore) return;

    expect(loadMore.getBoundingClientRect().width).toBeCloseTo(684, 0);
    expect(loadMore.getBoundingClientRect().height).toBeCloseTo(48, 0);
    expect(getComputedStyle(loadMore).backgroundColor).toBe('rgb(222, 210, 241)');
    expect(getComputedStyle(loadMore).borderRadius).toBe('8px');
    await userEvent.click(loadMore);
    expect(canvasElement.querySelector('[data-desktop-search-load-more]')).toBeNull();
  },
};
