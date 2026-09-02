import '../../../i18n';
import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../i18n';
import { DesktopSidebar } from '../../../components/DesktopSidebar';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../../favorites/model';
import type { Term } from '../../../types';
import { TermDetailView } from './TermDetailView';

const term: Term = {
  public_id: 'binary-search',
  name: 'Бинарный поиск',
  definitions: [
    { public_id: 'd1', name: 'Бинарный поиск', text: 'Алгоритм поиска элемента в отсортированном массиве.', page: 42, topic: { name: 'Алгоритмы поиска', book: { publisher: 'Арман-ПВ', grade: 10 } } },
    { public_id: 'd2', name: 'Бинарный поиск (каз.)', text: 'Екілік іздеу әр қадамда іздеу аралығын екі есе қысқартады.', page: 43, topic: { name: 'Іздеу алгоритмдері', book: { publisher: 'Мектеп', grade: 10 } } },
  ],
};

function RussianLocale({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void i18n.changeLanguage('ru').then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready ? children : null;
}

const meta = {
  title: 'Features/Terms/Detail',
  component: TermDetailView,
  decorators: [(Story) => <MemoryRouter><RussianLocale><Story /></RussianLocale></MemoryRouter>],
  args: {
    term,
    backTo: '/search',
    relatedTerms: [
      { public_id: 'linear-search', name: 'Линейный поиск' },
      { public_id: 'interpolation-search', name: 'Интерполяционный поиск' },
      { public_id: 'search-tree', name: 'Дерево поиска' },
    ],
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TermDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

const desktopStoryUser = { id: 2, username: 'storybook-term', email: 'storybook-term@example.com', language: 'ru' as const, grade: 'undefined' as const, role: 'user' as const };
function DesktopStoryShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token', refreshToken: null, user: desktopStoryUser });
    useFavoritesStore.setState({ statusByTermRef: { computer: false }, pendingByTermRef: {}, errorByTermRef: {} });
    return () => { useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null }); useFavoritesStore.setState({ statusByTermRef: {}, pendingByTermRef: {}, errorByTermRef: {} }); };
  }, []);
  return <div className="min-h-dvh flex flex-col bg-bg md:min-h-screen md:flex-row"><DesktopSidebar activeItem="search" onLogout={() => undefined} user={desktopStoryUser} /><main className="min-w-0 flex-1 w-full">{children}</main></div>;
}

const relatedByDefinition = {
  d1: [
    { public_id: 'linear-search', name: 'Линейный поиск' },
    { public_id: 'interpolation-search', name: 'Интерполяционный поиск' },
    { public_id: 'search-tree', name: 'Дерево поиска' },
  ],
  d2: [
    { public_id: 'hash-search', name: 'Хеш-іздеу' },
    { public_id: 'index-search', name: 'Индекстік іздеу' },
    { public_id: 'graph-search', name: 'Графтан іздеу' },
  ],
};

function DefinitionSwitchingStory() {
  const [definitionRef, setDefinitionRef] = useState<keyof typeof relatedByDefinition>('d1');
  return (
    <TermDetailView
      term={term}
      backTo="/search"
      selectedDefinitionPublicId={definitionRef}
      relatedTerms={relatedByDefinition[definitionRef]}
      onDefinitionChange={(next) => setDefinitionRef(next as keyof typeof relatedByDefinition)}
    />
  );
}

export const Mobile430Multiple: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <DefinitionSwitchingStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Термин' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Линейный поиск' })).toBeVisible();
    const nextButtons = canvas.getAllByRole('button', { name: /Далее/i });
    await userEvent.click(nextButtons[0]);
    await expect(canvas.getAllByText(/Екілік іздеу/)[0]).toBeVisible();
    await expect(canvas.queryByRole('link', { name: 'Линейный поиск' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Хеш-іздеу' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Индекстік іздеу' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Графтан іздеу' })).toBeVisible();
  },
};
export const Mobile320: Story = { globals: { viewport: { value: 'mobile320', isRotated: false } } };
export const Mobile360: Story = { globals: { viewport: { value: 'mobile360', isRotated: false } } };
export const Mobile390: Story = { globals: { viewport: { value: 'mobile390', isRotated: false } } };
export const Desktop1440: Story = { globals: { viewport: { value: 'desktop1440', isRotated: false } } };
export const DesktopFigma13885656: Story = {
  args: {
    term: {
      public_id: 'computer',
      name: 'Компьютер',
      definitions: [
        { public_id: 'computer-1', name: 'Компьютер', text: 'Бұл электрондық құрылғы және өзімізге қажетті техникалық құрылғылардың жиынтығы (аналық тақша, бейнекарта, ЖЖҚ және т.б.).', page: 56, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
        { public_id: 'computer-2', name: 'Компьютер', text: 'Компьютер ақпаратты өңдеуге арналған әмбебап электрондық құрылғы.', page: 57, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
        { public_id: 'computer-3', name: 'Компьютер', text: 'Компьютер бағдарламалар арқылы деректерді сақтайды және өңдейді.', page: 58, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
      ],
    },
    relatedTerms: [
      { public_id: 'office-computer', name: 'Офистік компьютер' },
      { public_id: 'personal-computer', name: 'Дербес компьютер' },
      { public_id: 'system-unit', name: 'Жүйелік блок' },
    ],
  },
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: (args) => <DesktopStoryShell><TermDetailView {...args} /></DesktopStoryShell>,
  play: async ({ canvasElement }) => {
    const { page } = await import('vitest/browser');
    const desktop = canvasElement.querySelector<HTMLElement>('[data-term-detail-desktop]');
    await waitFor(() => expect(desktop).not.toBeNull());

    const testTitle = desktop!.querySelector<HTMLElement>('[data-term-detail-test-title]');
    const testMeta = desktop!.querySelector<HTMLElement>('[data-term-detail-test-meta]');
    const relatedLinks = desktop!.querySelectorAll<HTMLElement>('[data-term-detail-related-link]');
    expect(testTitle).not.toBeNull();
    expect(testMeta).not.toBeNull();
    expect(relatedLinks).toHaveLength(3);
    expect(getComputedStyle(testTitle!).fontSize).toBe('18px');
    expect(getComputedStyle(testTitle!).fontWeight).toBe('400');
    expect(testMeta!.getBoundingClientRect().top - testTitle!.getBoundingClientRect().bottom).toBe(8);

    const relatedTitle = relatedLinks[0].querySelector<HTMLElement>('[data-term-detail-related-title]');
    const relatedLeading = relatedLinks[0].querySelector<HTMLElement>('[data-term-detail-related-leading]');
    const relatedArrow = relatedLinks[0].querySelector<HTMLElement>('[data-term-detail-related-arrow]');
    expect(relatedTitle).not.toBeNull();
    expect(relatedLeading).not.toBeNull();
    expect(relatedArrow).not.toBeNull();
    expect(getComputedStyle(relatedTitle!).fontWeight).toBe('400');
    expect(getComputedStyle(relatedTitle!).color).toBe('rgb(22, 21, 25)');
    expect(getComputedStyle(relatedLeading!).transitionProperty).toBe('transform');
    expect(getComputedStyle(relatedLeading!).transitionDuration).toBe('0.16s');
    expect(getComputedStyle(relatedLeading!).transitionTimingFunction).toBe('ease');

    const leadingX = relatedLeading!.getBoundingClientRect().x;
    const arrowX = relatedArrow!.getBoundingClientRect().x;
    await page.elementLocator(relatedLinks[0]).hover();
    await waitFor(() => expect(relatedLeading!.getBoundingClientRect().x - leadingX).toBeCloseTo(3, 1));
    expect(relatedArrow!.getBoundingClientRect().x - arrowX).toBeCloseTo(0, 1);

    const back = desktop!.querySelector<HTMLElement>('[data-term-detail-desktop-back]');
    expect(back).not.toBeNull();
    const backIcon = back!.querySelector<SVGElement>('svg');
    expect(backIcon).not.toBeNull();
    expect(getComputedStyle(back!).color).toBe('rgb(110, 103, 121)');
    expect(getComputedStyle(back!).backgroundColor).toBe('rgb(246, 245, 247)');
    expect(getComputedStyle(backIcon!).color).toBe('rgb(110, 103, 121)');
    await page.elementLocator(back!).hover();
    await waitFor(() => {
      expect(getComputedStyle(back!).color).toBe('rgb(22, 21, 25)');
      expect(getComputedStyle(back!).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(backIcon!).color).toBe('rgb(22, 21, 25)');
    });
  },
};
export const Loading: Story = { args: { term: null, loadState: 'loading' } };
export const Error: Story = { args: { term: null, loadState: 'error' } };
export const EmptyDefinitions: Story = { args: { term: { public_id: 'empty', name: 'Пустой термин', definitions: [] } } };
