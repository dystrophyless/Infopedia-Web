import '../../../i18n';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Layout } from '../../../components/Layout';
import { DesktopSidebar } from '../../../components/DesktopSidebar';
import i18n from '../../../i18n';
import { useAuthStore } from '../../../stores/authStore';
import { useSearchStore } from '../model';
import { SearchRequestClientProvider, type SearchRequestClient } from '../api/searchRequestClient';
import { TermSearchPage } from './TermSearchPage';

const storyUser = {
  id: 2,
  username: 'storybook-search',
  email: 'storybook-search@example.com',
  language: 'ru' as const,
  grade: 'undefined' as const,
  role: 'user' as const,
};

function DesktopStoryShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg md:min-h-screen md:flex-row">
      <DesktopSidebar activeItem="search" onLogout={() => undefined} user={storyUser} />
      <div className="min-w-0 flex-1 w-full max-md:min-h-0">{children}</div>
    </div>
  );
}

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
  const requestClient = useMemo<SearchRequestClient>(() => ({
    get: async (url: string) => {
      if (url.includes('/topics/books')) return { data: [] } as never;
      if (url.includes('/topics/chapters')) return { data: [] } as never;
      if (url.includes('/search/terms')) {
        return { data: { terms: [], total: 0, skip: 0, limit: 11, has_more: false } } as never;
      }
      return { data: [] } as never;
    },
  }), []);

  useEffect(() => {
    let active = true;
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { ...storyUser, language },
    });
    useSearchStore.getState().reset();
    useSearchStore.getState().resetSearchFilters();
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      useSearchStore.getState().reset();
      useSearchStore.getState().resetSearchFilters();
      useAuthStore.setState({
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      });
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
      <SearchRequestClientProvider client={requestClient} locale={language}>
        {fullShell ? <Layout>{content}</Layout> : content}
      </SearchRequestClientProvider>
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
  bookCatalogFailuresBeforeSuccess = 0,
  bookCatalogFailureRequests = [],
  initialBookSelection = false,
  deferSearch = false,
  deferSearchOnlyWithQuery = false,
  refreshCatalogOnReady = false,
  deferCatalogFailure = false,
}: {
  terms?: typeof desktopFeaturedTerms;
  fullShell?: boolean;
  bookCatalogFailuresBeforeSuccess?: number;
  bookCatalogFailureRequests?: number[];
  initialBookSelection?: boolean;
  deferSearch?: boolean;
  deferSearchOnlyWithQuery?: boolean;
  refreshCatalogOnReady?: boolean;
  deferCatalogFailure?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [searchRequestCount, setSearchRequestCount] = useState(0);
  const [searchAbortCount, setSearchAbortCount] = useState(0);
  const [bookCatalogRequestCount, setBookCatalogRequestCount] = useState(0);
  const [bookCatalogFailureReleased, setBookCatalogFailureReleased] = useState(false);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [lastSearchBooks, setLastSearchBooks] = useState('');
  const searchReleaseRef = useRef<Set<() => void>>(new Set());
  const bookCatalogReleaseRef = useRef<(() => void) | null>(null);
  const requestClientRef = useRef<SearchRequestClient | null>(null);
  const catalogRefreshTriggeredRef = useRef(false);
  const bookCatalogFailureRequestsKey = bookCatalogFailureRequests.join(',');

  useEffect(() => {
    let active = true;
    let bookRequests = 0;
    requestClientRef.current = { get: (async (url: string, config?: { params?: URLSearchParams; signal?: AbortSignal }) => {
      if (url.includes('/featured')) return { data: terms };
      if (url.includes('/topics/books')) {
        bookRequests += 1;
        setBookCatalogRequestCount(bookRequests);
        if (
          bookRequests <= bookCatalogFailuresBeforeSuccess ||
          bookCatalogFailureRequests.includes(bookRequests)
        ) {
          if (deferCatalogFailure && bookCatalogFailureRequests.includes(bookRequests)) {
            return new Promise<never>((_, reject) => {
              bookCatalogReleaseRef.current = () => {
                setBookCatalogFailureReleased(true);
                reject(new Error('Deterministic Storybook book catalog failure'));
              };
            });
          }
          throw new Error('Deterministic Storybook book catalog failure');
        }
        return {
          data: [
            { public_id: 'book:signed:atamura:10', publisher: 'Атамұра', grade: 10 },
            { public_id: 'book:signed:atamura:11', publisher: 'Атамұра', grade: 11 },
            { public_id: 'book:signed:almaty:10', publisher: 'Алматыкітап', grade: 10 },
            { public_id: 'book:signed:arman:11', publisher: 'Арман-ПВ', grade: 11 },
          ],
        };
      }
      if (url.includes('/topics/chapters')) {
        return {
          data: [
            { public_id: 'chapter:signed:devices', title: 'Устройства компьютера' },
            { public_id: 'chapter:signed:networks', title: 'Компьютерные сети. Организация компьютерных сетей' },
            { public_id: 'chapter:signed:information', title: 'Представление и измерение информации. Кодирование информации' },
            { public_id: 'chapter:signed:numeral', title: 'Системы счисления' },
            { public_id: 'chapter:signed:logic', title: 'Логические основы компьютера' },
            { public_id: 'chapter:signed:algorithms', title: 'Программирование алгоритмов на языке Python' },
          ],
        };
      }
      if (url.includes('/search/terms')) {
        setSearchRequestCount((count) => count + 1);
        setLastSearchBooks(config?.params?.getAll('book').join('|') ?? '');
        const pageTerms = terms.map(({ term, featured_definition }) => ({
          ...term,
          definitions: [featured_definition],
        }));
        const skip = Number(config?.params?.get('skip') ?? 0);
        const limit = Number(config?.params?.get('limit') ?? 11);
        const response = {
          data: {
            terms: pageTerms.slice(skip, skip + limit),
            total: pageTerms.length,
            skip,
            limit,
            has_more: skip + limit < pageTerms.length,
          },
        };
        const shouldDeferSearch =
          deferSearch &&
          (!deferSearchOnlyWithQuery || Boolean(config?.params?.get('query')?.trim()));
        if (!shouldDeferSearch) return response;
        config?.signal?.addEventListener('abort', () => setSearchAbortCount((count) => count + 1), { once: true });
        return new Promise<typeof response>((resolve) => {
          searchReleaseRef.current.add(() => resolve(response));
        });
      }
      return { data: [] };
    }) as SearchRequestClient['get'] };
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { ...storyUser, language: 'ru' },
    });
    useSearchStore.getState().reset();
    useSearchStore.getState().resetSearchFilters();
    if (initialBookSelection) {
      useSearchStore.getState().toggleSearchFilterOption('book', 'atamura', 'Атамұра');
    }
    void i18n.changeLanguage('ru').then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      requestClientRef.current = null;
      searchReleaseRef.current.clear();
      useSearchStore.getState().reset();
      useSearchStore.getState().resetSearchFilters();
      useAuthStore.setState({
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
      });
    };
  }, [
    bookCatalogFailuresBeforeSuccess,
    bookCatalogFailureRequestsKey,
    deferSearch,
    deferSearchOnlyWithQuery,
    initialBookSelection,
    terms,
  ]);

  useEffect(() => {
    if (!refreshCatalogOnReady || catalogRefreshTriggeredRef.current || bookCatalogRequestCount !== 1 || searchRequestCount === 0) return;
    catalogRefreshTriggeredRef.current = true;
    // Toggle from the current locale so the refresh is real even when a prior
    // Storybook story left i18n in kk; do not rely on a no-op same-locale call.
    setCatalogRefreshKey((key) => key + 1);
  }, [bookCatalogRequestCount, refreshCatalogOnReady, searchRequestCount]);

  if (!ready) return null;
  if (!requestClientRef.current) return null;

  return (
    <MemoryRouter initialEntries={['/search']}>
      <SearchRequestClientProvider client={requestClientRef.current} refreshKey={catalogRefreshKey} locale="ru">
        {fullShell ? <DesktopStoryShell><TermSearchPage /></DesktopStoryShell> : <TermSearchPage />}
      <output data-story-search-request-count className="sr-only">{searchRequestCount}</output>
      <output data-story-search-abort-count className="sr-only">{searchAbortCount}</output>
      <output data-story-book-catalog-request-count className="sr-only">{bookCatalogRequestCount}</output>
      <output data-story-book-catalog-failure-released className="sr-only">{String(bookCatalogFailureReleased)}</output>
      <output data-story-last-search-books className="sr-only">{lastSearchBooks}</output>
      {deferCatalogFailure && (
        <button
          type="button"
          data-story-release-book-catalog
          className="sr-only"
          onClick={() => bookCatalogReleaseRef.current?.()}
        >
          Release book catalog
        </button>
      )}
      <button
        type="button"
        data-story-reset-search-request-count
        className="sr-only"
        onClick={() => setSearchRequestCount(0)}
      >
        Reset request count
      </button>
      {deferSearch && (
        <button
          type="button"
          data-story-release-search
          className="sr-only"
          onClick={() => {
            const releases = [...searchReleaseRef.current];
            searchReleaseRef.current.clear();
            releases.forEach((release) => release());
          }}
        >
          Release search request
        </button>
      )}
      </SearchRequestClientProvider>
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

// The story-only desktop shell keeps the page's canonical main landmark as the
// sole main landmark in the axe context. Exact source-palette contrast remains
// the only approved disabled rule.
const desktopShellA11yParameters = {
  layout: 'fullscreen',
  a11y: {
    context: '#term-search-content',
    config: {
      rules: [
        { id: 'color-contrast', enabled: false },
      ],
    },
  },
};

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
  parameters: desktopShellA11yParameters,
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

export const DesktopNotFound: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  render: () => <DesktopSearchStory terms={[]} fullShell={false} />,
  play: async ({ canvasElement }) => {
    const input = await within(canvasElement).findByRole('textbox');
    await userEvent.type(input, 'несуществующий термин');
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-not-found]')).toBeInTheDocument());
    const heading = canvasElement.querySelector<HTMLElement>('[data-desktop-search-query-heading]');
    const outcome = canvasElement.querySelector<HTMLElement>('[data-desktop-search-not-found]');
    const clear = canvasElement.querySelector<HTMLButtonElement>('[data-desktop-search-clear]');
    expect(heading).toHaveTextContent('По запросу «несуществующий термин» ничего не найдено');
    expect(clear).toBeInTheDocument();
    expect(input.id).toBe('desktop-search-input');
    const field = canvasElement.querySelector<HTMLElement>('[data-desktop-search-field]');
    expect(field).not.toBeNull();
    expect(field?.getBoundingClientRect().height).toBeCloseTo(40, 0);
    expect(input.getBoundingClientRect().height).toBeLessThanOrEqual(24);
    expect(getComputedStyle(heading!).fontSize).toBe('18px');
    expect(getComputedStyle(heading!).lineHeight).toBe('18px');
    expect(getComputedStyle(heading!).color).toBe('rgb(22, 21, 25)');
    const rail = heading?.closest<HTMLElement>('[data-desktop-search-results]');
    expect(rail).not.toBeNull();
    if (rail && heading) {
      expect(getComputedStyle(heading).textAlign).toBe('left');
      expect(heading.getBoundingClientRect().left).toBeCloseTo(rail.getBoundingClientRect().left, 0);
      expect(heading.getBoundingClientRect().width).toBeCloseTo(rail.getBoundingClientRect().width, 0);
    }
    expect(clear!.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    expect(outcome).not.toBeNull();
    if (outcome && heading) {
      const circle = outcome.querySelector<HTMLElement>('[data-empty-state-icon]');
      const glyph = circle?.querySelector<HTMLElement>('span');
      const title = outcome.querySelector<HTMLElement>('h2');
      const description = outcome.querySelector<HTMLElement>('p');
      expect(outcome.getBoundingClientRect().width).toBeCloseTo(382, 0);
      expect(outcome.getBoundingClientRect().left).toBeCloseTo(
        rail!.getBoundingClientRect().left + (rail!.getBoundingClientRect().width - outcome.getBoundingClientRect().width) / 2,
        0,
      );
      expect(circle?.getBoundingClientRect().width).toBeCloseTo(64, 0);
      expect(getComputedStyle(circle!).backgroundColor).toBe('rgb(222, 210, 241)');
      expect(getComputedStyle(circle!).borderRadius).toBe('64px');
      expect(getComputedStyle(circle!).padding).toBe('16px');
      expect(glyph?.getBoundingClientRect().width).toBeCloseTo(32, 0);
      expect(title).toHaveTextContent('Нет таких терминов');
      expect(description).toHaveTextContent('Попробуйте изменить параметры поиска');
      expect(outcome.getBoundingClientRect().top - heading.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(144);
    }
    await userEvent.click(clear!);
    await expect(input).toHaveValue('');
    expect(canvasElement.querySelector('[data-desktop-search-clear]')).toBeNull();
    await expect(input).toHaveFocus();
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
  parameters: desktopShellA11yParameters,
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
  parameters: desktopShellA11yParameters,
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
  parameters: desktopShellA11yParameters,
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
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    a11y: { context: { include: ['[data-search-result-filter="filter"]'] } },
  },
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    expect(canvasElement.ownerDocument.defaultView?.devicePixelRatio).toBe(1);
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-controls] input')).not.toBeNull());
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
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

    const resultFilter = filters[0] as HTMLButtonElement;
    expect(resultFilter).toHaveAccessibleName(/фильтр/i);
    expect(resultFilter).toHaveAttribute('aria-controls', 'search-filter-page-sheet');
    expect(resultFilter).toHaveAttribute('aria-expanded', 'false');

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

export const DesktopQueryAtamura: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  parameters: desktopShellA11yParameters,
  render: () => <DesktopSearchStory initialBookSelection />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    expect(canvasElement.ownerDocument.defaultView?.devicePixelRatio).toBe(1);
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
    expect(input).not.toBeNull();
    if (!input) return;
    await userEvent.type(input, 'algorithm');
    await waitFor(() => {
      const filters = [...canvasElement.querySelectorAll<HTMLElement>('[data-desktop-search-filter]')];
      expect(filters.map((filter) => filter.dataset.desktopSearchFilter)).toEqual([
        'filter',
        'book',
        'specification',
        'grade',
        'topic',
      ]);
      expect(filters[1]).toHaveTextContent('Атамұра');
      expect(filters[1].querySelector('svg')).not.toBeNull();
      expect(getComputedStyle(filters[1]).backgroundColor).toBe('rgb(68, 35, 125)');
    });
  },
};

export const DesktopResponsive875: Story = {
  globals: { viewport: { value: 'desktop875x831', isRotated: false } },
  parameters: desktopShellA11yParameters,
  render: () => <DesktopSearchStory fullShell initialBookSelection />,
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument?.fonts?.ready;
    expect(canvasElement.ownerDocument.defaultView?.devicePixelRatio).toBe(1);
    const ownerDocument = canvasElement.ownerDocument;
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
    expect(input).not.toBeNull();
    if (!input) return;
    await userEvent.type(input, 'algorithm');
    await waitFor(() => {
      const count = Number(canvasElement.querySelector('[data-story-search-request-count]')?.textContent ?? 0);
      expect(count).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-results][role="status"]')).toBeNull());
    await waitFor(() => expect(canvasElement.querySelector('[data-term-card-main]')).not.toBeNull());

    const controls = canvasElement.querySelector<HTMLElement>('[data-desktop-search-controls]');
    const rail = canvasElement.querySelector<HTMLElement>('[data-desktop-search-filters]');
    const card = canvasElement.querySelector<HTMLElement>('[data-term-card-main]');
    await waitFor(() => {
      expect(controls).not.toBeNull();
      expect(rail).not.toBeNull();
      expect(card).not.toBeNull();
    });
    if (!controls || !rail || !card) return;
    const geometry = {
      innerWidth: ownerDocument.defaultView?.innerWidth,
      documentWidth: ownerDocument.documentElement.clientWidth,
      controls: Math.round(controls.getBoundingClientRect().width),
      rail: Math.round(rail.getBoundingClientRect().width),
      card: Math.round(card.getBoundingClientRect().width),
    };
    expect(geometry).toEqual({
      innerWidth: 875,
      documentWidth: 875,
      controls: 535,
      rail: 535,
      card: 535,
    });
    expect(ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(875);

    await waitFor(() => expect(canvasElement.querySelector('[data-term-card-title]')).not.toBeNull());
    const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    if (!title) return;
    await userEvent.click(title);
    await waitFor(() => expect(canvasElement.querySelector('[data-term-card-source-panel]')).not.toBeNull());
    const panel = canvasElement.querySelector<HTMLElement>('[data-term-card-source-panel]');
    if (!panel) return;
    expect(panel.getBoundingClientRect().width).toBeCloseTo(535, 0);
    expect(ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(875);
  },
};

export const DesktopLoadMore: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopShellA11yParameters,
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

async function openDesktopFilters(canvasElement: HTMLElement) {
  const trigger = canvasElement.querySelector<HTMLButtonElement>(
    'button[aria-controls="search-filter-page-sheet"]:not([data-search-result-filter])',
  );
  expect(trigger).not.toBeNull();
  if (!trigger) throw new Error('Desktop filter trigger not found');
  await userEvent.click(trigger);
  const body = within(canvasElement.ownerDocument.body);
  return body.findByRole('dialog', { name: /Фильтры/i });
}

async function assertDesktopDialogGeometry(dialog: HTMLElement) {
  await dialog.ownerDocument.fonts?.ready;
  const rect = dialog.getBoundingClientRect();
  expect(rect.x).toBeCloseTo(936, 0);
  expect(rect.y).toBeCloseTo(24, 0);
  expect(rect.width).toBeCloseTo(480, 0);
  expect(rect.height).toBeCloseTo(600, 0);
  expect(getComputedStyle(dialog).borderRadius).toBe('16px');
  expect(getComputedStyle(dialog).padding).toBe('32px');
}

function assertTask5Typography(dialog: HTMLElement) {
  const exactChecks: Array<[string, string, string]> = [
    ['[data-desktop-search-filter-reset]', '18px', '27px'],
    ['[data-desktop-search-filter-apply]', '18px', '27px'],
    ['[data-desktop-search-filter-field="ent"]', '16px', '24px'],
    ['[data-desktop-search-filter-field="book"]', '16px', '24px'],
    ['[data-desktop-search-filter-field="grade"]', '16px', '24px'],
    ['[data-desktop-search-filter-field="section"]', '16px', '24px'],
  ];
  for (const [selector, fontSize, lineHeight] of exactChecks) {
    const element = dialog.querySelector<HTMLElement>(selector);
    expect(element, `Task-5 typography selector missing: ${selector}`).not.toBeNull();
    if (!element) continue;
    const styles = getComputedStyle(element);
    expect(styles.fontSize).toBe(fontSize);
    expect(styles.lineHeight).toBe(lineHeight);
  }
  for (const alert of dialog.querySelectorAll<HTMLElement>('[role="alert"]')) {
    const styles = getComputedStyle(alert);
    if (alert.className.includes('text-[14px]')) {
      expect(styles.fontSize).toBe('14px');
      expect(styles.lineHeight).toBe('20px');
    }
    if (alert.className.includes('text-[16px]')) {
      expect(styles.fontSize).toBe('16px');
      expect(styles.lineHeight).toBe('20px');
    }
  }
}

async function assertEntUncheckedFigma(dialog: HTMLElement) {
  const toggle = dialog.querySelector<HTMLButtonElement>('[data-desktop-search-filter-field="ent"]');
  expect(toggle).not.toBeNull();
  if (!toggle) return;
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const track = toggle.querySelector<HTMLElement>('[aria-hidden="true"]');
  expect(track).not.toBeNull();
  if (!track) return;
  expect(getComputedStyle(track).backgroundColor).toBe('rgb(165, 133, 219)');
}

const desktopFiltersA11yParameters = {
  layout: 'fullscreen',
  a11y: {
    context: {
      include: ['[aria-controls="search-filter-page-sheet"]', '[role="dialog"]'],
      // Exact immutable Figma nodes retain the source colors (#a585db on white = 3.0,
      // #865bcf on #ded2f1 = 3.3). Exclude only those nodes; dynamic alerts, retry,
      // selected options, and dialog content remain covered by axe.
      exclude: [
        '[data-desktop-search-filter-field="book"] > button[aria-haspopup="listbox"] > .truncate',
        '[data-desktop-search-filter-field="grade"] > button[aria-haspopup="listbox"] > .truncate',
        '[data-desktop-search-filter-field="section"] > button[aria-haspopup="listbox"] > .truncate',
        '[data-desktop-search-filter-reset="true"]',
      ],
    },
  },
} as const;

export const DesktopFiltersDefault: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const dialog = await openDesktopFilters(canvasElement);
    await assertEntUncheckedFigma(dialog);
    await assertDesktopDialogGeometry(dialog);
    assertTask5Typography(dialog);
    expect(dialog.querySelectorAll('[data-desktop-search-filter-field]')).toHaveLength(4);
    const selectTriggers = [...dialog.querySelectorAll<HTMLButtonElement>('[aria-haspopup="listbox"]')];
    expect(selectTriggers).toHaveLength(6);
    expect(selectTriggers.map((trigger) => trigger.getAttribute('aria-labelledby'))).toEqual([
      'desktop-search-filter-label-book',
      'desktop-search-filter-label-book',
      'desktop-search-filter-label-grade',
      'desktop-search-filter-label-grade',
      'desktop-search-filter-label-section',
      'desktop-search-filter-label-section',
    ]);
    expect(within(dialog).getAllByRole('button', { name: /Издание/i })[0]).toHaveAttribute(
      'aria-labelledby',
      'desktop-search-filter-label-book',
    );
    expect(within(dialog).getAllByRole('button', { name: /Класс/i })[0]).toHaveAttribute(
      'aria-labelledby',
      'desktop-search-filter-label-grade',
    );
    expect(within(dialog).getAllByRole('button', { name: /Раздел/i })[0]).toHaveAttribute(
      'aria-labelledby',
      'desktop-search-filter-label-section',
    );
  },
};

export const DesktopFiltersEditionMenu: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const dialog = await openDesktopFilters(canvasElement);
    await assertEntUncheckedFigma(dialog);
    await userEvent.click(within(dialog).getAllByRole('button', { name: /Издание/i })[0]);
    const menu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="book"]');
    expect(menu).not.toBeNull();
    if (!menu) return;
    expect(menu.getBoundingClientRect().x).toBeCloseTo(dialog.getBoundingClientRect().x + 32, 0);
    expect(menu.getBoundingClientRect().y).toBeCloseTo(300, 0);
    expect(menu.getBoundingClientRect().height).toBeCloseTo(176, 0);
  },
};

export const DesktopFiltersGradeMenu: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const dialog = await openDesktopFilters(canvasElement);
    await assertEntUncheckedFigma(dialog);
    await userEvent.click(within(dialog).getAllByRole('button', { name: /Класс/i })[0]);
    const menu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="grade"]');
    expect(menu).not.toBeNull();
    if (!menu) return;
    expect(menu.getBoundingClientRect().y).toBeCloseTo(96, 0);
    expect(menu.getBoundingClientRect().height).toBeCloseTo(238, 0);
  },
};

export const DesktopFiltersChapterMenu: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const dialog = await openDesktopFilters(canvasElement);
    await assertEntUncheckedFigma(dialog);
    await userEvent.click(within(dialog).getAllByRole('button', { name: /Раздел/i })[0]);
    const menu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="section"]');
    expect(menu).not.toBeNull();
    if (!menu) return;
    expect(menu.getBoundingClientRect().y).toBeCloseTo(96, 0);
    expect(menu.getBoundingClientRect().height).toBeCloseTo(336, 0);
    expect([...menu.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => option.getBoundingClientRect().height)).toEqual([
      48,
      56,
      56,
      48,
      48,
      56,
    ]);
  },
};

export const DesktopFiltersScrollableMenuContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const dialog = await openDesktopFilters(canvasElement);

    const gradeTrigger = dialog.querySelector<HTMLButtonElement>(
      '[data-desktop-search-filter-field="grade"] button[aria-haspopup="listbox"]',
    );
    expect(gradeTrigger).not.toBeNull();
    for (let index = 0; index < 12 && gradeTrigger !== dialog.ownerDocument.activeElement; index += 1) {
      await userEvent.tab();
    }
    expect(gradeTrigger).toHaveFocus();
    expect(gradeTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(gradeTrigger).toHaveAttribute('aria-controls', 'desktop-search-filter-menu-grade');
    await userEvent.keyboard('{Enter}');
    const gradeMenu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="grade"]');
    expect(gradeMenu).not.toBeNull();
    expect(gradeMenu).toHaveAccessibleName(/Класс/i);
    const gradeOptions = [...gradeMenu!.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    expect(gradeTrigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(gradeOptions[0]).toHaveFocus());
    expect(gradeMenu!.scrollTop).toBe(0);
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(gradeOptions.at(-1)).toHaveFocus());
    expect(gradeMenu!.scrollTop).toBeGreaterThan(0);
    await userEvent.keyboard('{Enter}');
    await expect(gradeOptions.at(-1)).toHaveAttribute('aria-selected', 'true');

    const chapterTrigger = dialog.querySelector<HTMLButtonElement>(
      '[data-desktop-search-filter-field="section"] button[aria-haspopup="listbox"]',
    );
    expect(chapterTrigger).not.toBeNull();
    await userEvent.click(gradeTrigger!);
    for (let index = 0; index < 12 && chapterTrigger !== dialog.ownerDocument.activeElement; index += 1) {
      await userEvent.tab();
    }
    expect(chapterTrigger).toHaveFocus();
    expect(chapterTrigger).toHaveAttribute('aria-controls', 'desktop-search-filter-menu-section');
    await userEvent.keyboard('{End}');
    const chapterMenu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="section"]');
    expect(chapterMenu).not.toBeNull();
    const chapterOptions = [...chapterMenu!.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    await waitFor(() => expect(chapterOptions.at(-1)).toHaveFocus());
    expect(chapterMenu!.scrollTop).toBeGreaterThan(0);
    await userEvent.keyboard(' ');
    await expect(chapterOptions.at(-1)).toHaveAttribute('aria-selected', 'true');
  },
};

export const DesktopFiltersCatalogErrorRetryContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => (
    <DesktopSearchStory bookCatalogFailureRequests={[1]} deferCatalogFailure initialBookSelection />
  ),
  play: async ({ canvasElement }) => {
    const requestCount = () => canvasElement.querySelector('[data-story-book-catalog-request-count]');
    await waitFor(() => expect(requestCount()).toHaveTextContent('1'));
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Release book catalog' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-story-book-catalog-failure-released]')).toHaveTextContent('true'));
    const dialog = await openDesktopFilters(canvasElement);
    const bookTrigger = dialog.querySelector<HTMLButtonElement>(
      '[data-desktop-search-filter-field="book"] button[aria-haspopup="listbox"]',
    );
    expect(bookTrigger).not.toBeNull();
    assertTask5Typography(dialog);
    await userEvent.click(bookTrigger!);
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole('dialog').querySelector('[data-desktop-search-filter-field="book"] button[aria-haspopup="listbox"]')).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(body.queryByRole('region')).not.toBeNull());
    const menu = body.getByRole('region');
    const alert = await within(menu).findByRole('alert');
    assertTask5Typography(dialog);
    expect(alert).toHaveTextContent(/\S/);
    expect(within(menu).queryAllByRole('option')).toHaveLength(0);
    const applyButton = dialog.querySelector<HTMLButtonElement>('[data-desktop-search-filter-apply]');
    expect(applyButton).not.toBeNull();
    if (!applyButton) return;
    expect(applyButton).toBeDisabled();
    await userEvent.click(within(menu).getByRole('button', { name: /Повторить|Қайталау|Retry/i }));
    await waitFor(() => expect(requestCount()).toHaveTextContent('2'));
    await waitFor(() => expect(within(menu).getAllByRole('option').length).toBeGreaterThan(0));
    expect(within(menu).queryByRole('alert')).toBeNull();
    expect(applyButton).not.toBeDisabled();
  },
};

export const DesktopFiltersDraftApplyContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const requestCounter = () => canvasElement.querySelector('[data-story-search-request-count]');
    await waitFor(() => expect(requestCounter()).not.toBeNull());
    const resetCounter = canvasElement.querySelector<HTMLButtonElement>('[data-story-reset-search-request-count]');
    expect(resetCounter).not.toBeNull();
    resetCounter?.click();
    await waitFor(() => expect(requestCounter()).toHaveTextContent('0'));
    const baselineRequests = 0;
    const firstDialog = await openDesktopFilters(canvasElement);
    await userEvent.click(within(firstDialog).getByRole('button', { name: /Есть в спецификации/i }));
    await userEvent.click(within(firstDialog).getByRole('button', { name: /закрыть|close/i }));
    await waitFor(() => expect(firstDialog).not.toBeInTheDocument());
    await waitFor(() => expect(requestCounter()).toHaveTextContent(String(baselineRequests)));

    const secondDialog = await openDesktopFilters(canvasElement);
    const entToggle = within(secondDialog).getByRole('button', { name: /Есть в спецификации/i });
    await userEvent.click(entToggle);
    await waitFor(() => expect(entToggle).toHaveAttribute('aria-pressed', 'true'));
    const applyButton = within(secondDialog).getByRole('button', { name: /Искать/i });
    expect(applyButton).not.toBeDisabled();
    await userEvent.click(applyButton);
    await waitFor(() => expect(useSearchStore.getState().entOnlyFilterActive).toBe(true));
    await waitFor(() => expect(requestCounter()).toHaveTextContent(String(baselineRequests + 1)));

    const thirdDialog = await openDesktopFilters(canvasElement);
    await userEvent.click(within(thirdDialog).getByRole('button', { name: /Искать/i }));
    await waitFor(() => expect(requestCounter()).toHaveTextContent(String(baselineRequests + 1)));
    await openDesktopFilters(canvasElement);
  },
};

export const DesktopFiltersBackdropFocusContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', { name: /Фильтры/i });
    await userEvent.click(trigger);
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: /Фильтры/i });
    const overlay = dialog.parentElement;
    expect(overlay).not.toBeNull();
    if (!overlay) return;
    await userEvent.click(overlay);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
  },
};

export const DesktopFiltersDismissalMatrixContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => <DesktopSearchStory />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLButtonElement>('[aria-controls="search-filter-page-sheet"]');
    expect(trigger).not.toBeNull();
    if (!trigger) return;
    const requestCount = () => canvasElement.querySelector('[data-story-search-request-count]');
    await waitFor(() => expect(requestCount()).toHaveTextContent('0'));

    const dismissAndAssert = async (dismiss: (dialog: HTMLElement) => Promise<void>) => {
      const dialog = await openDesktopFilters(canvasElement);
      const entToggle = dialog.querySelector<HTMLButtonElement>('[data-desktop-search-filter-field="ent"]');
      expect(entToggle).not.toBeNull();
      if (!entToggle) return;
      await userEvent.click(entToggle);
      await expect(entToggle).toHaveAttribute('aria-pressed', 'true');
      await dismiss(dialog);
      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      expect(useSearchStore.getState().entOnlyFilterActive).toBe(false);
      await expect(requestCount()).toHaveTextContent('0');
      await expect(trigger).toHaveFocus();
    };

    await dismissAndAssert(async (dialog) => {
      const closeButton = dialog.querySelector<HTMLButtonElement>('button[aria-label]');
      expect(closeButton).not.toBeNull();
      if (closeButton) await userEvent.click(closeButton);
    });
    await dismissAndAssert(async (dialog) => {
      const overlay = dialog.parentElement;
      expect(overlay).not.toBeNull();
      if (overlay) await userEvent.click(overlay);
    });
    await dismissAndAssert(async () => {
      await userEvent.keyboard('{Escape}');
    });
    await userEvent.click(trigger);
  },
};

export const DesktopFiltersCatalogRefreshInFlightContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => (
    <DesktopSearchStory bookCatalogFailuresBeforeSuccess={1} deferSearch />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
    expect(input).not.toBeNull();
    if (!input) return;
    await userEvent.type(input, 'algorithm');
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-results][role="status"]')).not.toBeNull());
    await waitFor(() => expect(canvasElement.querySelector('[data-story-search-request-count]')).toHaveTextContent('1'));

    const dialog = await openDesktopFilters(canvasElement);
    const bookTrigger = dialog.querySelector<HTMLButtonElement>(
      '[data-desktop-search-filter-field="book"] button[aria-haspopup="listbox"]',
    );
    expect(bookTrigger).not.toBeNull();
    await userEvent.click(bookTrigger!);
    const menu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="book"]');
    expect(menu).not.toBeNull();
    if (!menu) return;
    await within(menu).findByRole('alert');
    await userEvent.click(within(menu).getByRole('button', { name: /Повторить/i }));
    await waitFor(() => expect(canvasElement.querySelector('[data-story-book-catalog-request-count]')).toHaveTextContent('2'));
    await userEvent.click(canvas.getByRole('button', { name: 'Release search request' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-term-card-state]')).not.toBeNull());
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-results][role="status"]')).toBeNull());
  },
};

export const DesktopFiltersCatalogRefreshSelectedRaceContract: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: desktopFiltersA11yParameters,
  render: () => (
    <DesktopSearchStory
      initialBookSelection
      bookCatalogFailureRequests={[2]}
      deferSearch
      deferSearchOnlyWithQuery
      refreshCatalogOnReady
      deferCatalogFailure
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('[data-desktop-search-controls] input');
    expect(input).not.toBeNull();
    if (!input) return;
    await waitFor(() => {
      const count = Number(canvasElement.querySelector('[data-story-book-catalog-request-count]')?.textContent ?? 0);
      expect(count).toBeGreaterThan(0);
    });
    await userEvent.type(input, 'algorithm');
    await waitFor(() => {
      const count = Number(canvasElement.querySelector('[data-story-search-request-count]')?.textContent ?? 0);
      expect(count).toBeGreaterThan(0);
    }, { timeout: 5000 });
    await waitFor(() => expect(canvasElement.querySelector('[data-story-book-catalog-request-count]')).toHaveTextContent('2'));
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Release book catalog' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-story-book-catalog-failure-released]')).toHaveTextContent('true'));
    await waitFor(() => {
      const count = Number(canvasElement.querySelector('[data-story-search-request-count]')?.textContent ?? 0);
      expect(count).toBeGreaterThan(0);
    }, { timeout: 5000 });

    const trigger = canvasElement.querySelector<HTMLButtonElement>('[aria-controls="search-filter-page-sheet"]');
    expect(trigger).not.toBeNull();
    if (!trigger) return;
    await userEvent.click(trigger);
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    const bookMenuTrigger = dialog.querySelector<HTMLButtonElement>(
      '[data-desktop-search-filter-field="book"] button[aria-haspopup="listbox"]',
    );
    expect(bookMenuTrigger).not.toBeNull();
    await userEvent.click(bookMenuTrigger!);
    await waitFor(() => expect(dialog.querySelector('[data-desktop-filter-menu="book"]')).not.toBeNull());
    const menu = dialog.querySelector<HTMLElement>('[data-desktop-filter-menu="book"]');
    expect(menu).not.toBeNull();
    if (!menu) return;
    await waitFor(() => expect(within(menu).getByRole('alert')).toBeInTheDocument());
    assertTask5Typography(dialog);
    expect(within(menu).getAllByRole('option').length).toBeGreaterThan(0);
    await userEvent.click(within(menu).getByRole('button', { name: /retry|қайта|повторить/i }));
    await waitFor(() => expect(canvasElement.querySelector('[data-story-book-catalog-request-count]')).toHaveTextContent('3'));
    await waitFor(() => {
      const currentMenu = canvasElement.ownerDocument.body.querySelector<HTMLElement>('[data-desktop-filter-menu="book"]');
      if (currentMenu) expect(within(currentMenu).queryByRole('alert')).toBeNull();
      else expect(canvasElement.ownerDocument.body.querySelector('[role="alert"]')).toBeNull();
    });
    await expect(canvasElement.querySelector('[data-story-search-abort-count]')).toHaveTextContent('0');
    await userEvent.click(canvas.getByRole('button', { name: 'Release search request' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-story-last-search-books]')).toHaveTextContent('book:signed:atamura:10'));
    await waitFor(() => expect(canvasElement.querySelector('[data-desktop-search-results][role="status"]')).toBeNull());
    expect(canvasElement.querySelector('[data-story-last-search-books]')).toHaveTextContent('book:signed:atamura:10');
  },
};
