import '../../../i18n';
import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
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
    { public_id: 'd1', text: 'Алгоритм поиска элемента в отсортированном массиве.', page: 42, topic: { name: 'Алгоритмы поиска', book: { publisher: 'Арман-ПВ', grade: 10 } } },
    { public_id: 'd2', text: 'Екілік іздеу әр қадамда іздеу аралығын екі есе қысқартады.', page: 43, topic: { name: 'Іздеу алгоритмдері', book: { publisher: 'Мектеп', grade: 10 } } },
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
        { public_id: 'computer-1', text: 'Бұл электрондық құрылғы және өзімізге қажетті техникалық құрылғылардың жиынтығы (аналық тақша, бейнекарта, ЖЖҚ және т.б.).', page: 56, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
        { public_id: 'computer-2', text: 'Компьютер ақпаратты өңдеуге арналған әмбебап электрондық құрылғы.', page: 57, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
        { public_id: 'computer-3', text: 'Компьютер бағдарламалар арқылы деректерді сақтайды және өңдейді.', page: 58, topic: { name: '2.3. Компьютер құнын есептеу', book: { publisher: 'Атамұра', grade: 9 } } },
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
};
export const Loading: Story = { args: { term: null, loadState: 'loading' } };
export const Error: Story = { args: { term: null, loadState: 'error' } };
export const EmptyDefinitions: Story = { args: { term: { public_id: 'empty', name: 'Пустой термин', definitions: [] } } };
