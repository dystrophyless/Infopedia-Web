import '../../../i18n';
import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SkeletonCard } from '../../../components/SkeletonCard';
import type { Definition, Term } from '../../../types';
import { FavoriteToggle } from '../../favorites/components';
import { useFavoritesStore } from '../../favorites/model';
import { useAuthStore } from '../../../stores/authStore';
import { DefinitionMetadata } from './DefinitionMetadata';
import { FeaturedTermCard, type FeaturedTermCardVariant } from './FeaturedTermCard';
import { MobileSearchTermCard } from './MobileSearchTermCard';
import { TermCard } from './TermCard';

const longDefinition: Definition = {
  public_id: 'definition-long',
  text: 'Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру және олардың тиімділігін әртүрлі деректер жиынтығында салыстыру.',
  page: 142,
  topic: { name: 'Алгоритмы поиска и практическое применение вычислительных методов', book: { publisher: 'Арман-ПВ', grade: 10 } },
};
const term: Term = { public_id: 'search-algorithms', name: 'Алгоритмы поиска', definitions: [longDefinition] };
const shortTerm: Term = { public_id: 'ram', name: 'RAM', definitions: [{ text: 'Fast temporary memory.', page: 12, topic: { name: 'Memory', book: { publisher: 'Infopedia', grade: 10 } } }] };
const descenderTerm: Term = { ...shortTerm, public_id: 'pygame-surface', name: 'Pygame.surface \u043c\u043e\u0434\u0443\u043b\u0456' };
const longTitleTerm: Term = { ...shortTerm, public_id: 'long-title', name: 'A very long desktop term title that uses compact 20px typography' };
const fiveLineTerm: Term = { ...shortTerm, public_id: 'five-lines', name: 'Five line definition', definitions: [{ text: 'Line one of the exact five line definition.\nLine two of the exact five line definition.\nLine three of the exact five line definition.\nLine four of the exact five line definition.\nLine five of the exact five line definition.', page: 1 }] };
const overflowTerm: Term = { ...shortTerm, public_id: 'overflow-definition', name: 'Overflow definition', definitions: [{ text: 'Line one of the overflow definition.\nLine two of the overflow definition.\nLine three of the overflow definition.\nLine four of the overflow definition.\nLine five of the overflow definition.\nLine six must trigger the fade overlay.', page: 1 }] };

const meta = {
  title: 'Features/Terms/Cards',
  component: TermCard,
  decorators: [(Story) => <MemoryRouter><div className="w-full max-w-none p-6"><Story /></div></MemoryRouter>],
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  args: { term },
} satisfies Meta<typeof TermCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function FavoriteToggleStates() {
  useEffect(() => {
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token' });
    useFavoritesStore.setState({
      statusByTermRef: { saved: true },
      pendingByTermRef: { pending: true },
      errorByTermRef: { failed: 'story-error' },
    });
    return () => {
      useAuthStore.setState({ isAuthenticated: false, token: null });
      useFavoritesStore.getState().reset();
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <FavoriteToggle termRef="unsaved" termName="Несохранённый термин" ensureStatus={false} />
      <FavoriteToggle termRef="saved" termName="Сохранённый термин" ensureStatus={false} />
      <FavoriteToggle termRef="pending" termName="Ожидающий термин" ensureStatus={false} />
      <FavoriteToggle termRef="failed" termName="Термин с ошибкой" ensureStatus={false} />
    </div>
  );
}

function AuthenticatedMobileCardsStory() {
  useEffect(() => {
    const previous = useAuthStore.getState();
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token' });
    return () => {
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
    };
  }, []);

  return (
    <div className="grid gap-4 bg-[#efebf6]">
      <section aria-label="Populated mobile term card">
        <MobileSearchTermCard term={term} />
      </section>
      <section aria-label="Loading mobile term card">
        <SkeletonCard variant="mobile-term-card" />
      </section>
    </div>
  );
}

function ControlledDesktopClickedStory() {
  const [selected, setSelected] = useState(true);
  return <TermCard term={term} selected={selected} onSelectedChange={setSelected} />;
}

function AuthenticatedDesktopStory({ children }: { children: ReactNode }) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    const previous = useAuthStore.getState();
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token', refreshToken: 'storybook-refresh-token' });
    return () => {
      useAuthStore.setState({ isAuthenticated: previous.isAuthenticated, token: previous.token, refreshToken: previous.refreshToken, user: previous.user });
    };
  }, []);
  return authenticated ? <>{children}</> : null;
}

export const LongRussianKazakh: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Алгоритмы поиска/ })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /Узнать подробнее/ })).toHaveAttribute('href', '/terms/search-algorithms');
  },
};

export const DesktopDefault: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={term} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    const definition = canvasElement.querySelector<HTMLElement>('[data-measured-text-preview]');
    await waitFor(() => expect(definition).toHaveStyle({ color: 'rgb(140, 134, 152)' }));
  },
};

export const DesktopShortTitle: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <AuthenticatedDesktopStory><TermCard term={descenderTerm} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
      const titleText = title?.querySelector<HTMLElement>('span');
      const actions = canvasElement.querySelector<HTMLElement>('[data-term-card-header-actions]');
      expect(titleText?.textContent).toBe('Pygame.surface \u043c\u043e\u0434\u0443\u043b\u0456');
      expect(titleText?.getBoundingClientRect().height).toBe(24);
      expect(getComputedStyle(titleText as HTMLElement).lineHeight).toBe('24px');
      expect(getComputedStyle(titleText as HTMLElement).whiteSpace).toBe('nowrap');
      expect(getComputedStyle(titleText as HTMLElement).textOverflow).toBe('ellipsis');
      expect(getComputedStyle(titleText as HTMLElement).overflow).toBe('hidden');
      expect((actions?.getBoundingClientRect().left ?? 0) - (title?.getBoundingClientRect().right ?? 0)).toBe(48);
    });
  },
};

export const DesktopCollapsedAndLoading: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => (
    <AuthenticatedDesktopStory>
      <div className="grid w-max grid-cols-[684px_684px] gap-6 bg-[#efebf6]" data-desktop-card-comparison>
        <section aria-label="Collapsed desktop term card" data-comparison-real><TermCard term={descenderTerm} /></section>
        <section aria-label="Loading desktop term card" data-comparison-skeleton><SkeletonCard /></section>
      </div>
    </AuthenticatedDesktopStory>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const real = canvasElement.querySelector<HTMLElement>('[data-comparison-real] [data-term-card-main]');
      const skeleton = canvasElement.querySelector<HTMLElement>('[data-comparison-skeleton] [data-skeleton-card]');
      expect(real).toBeTruthy();
      expect(skeleton).toBeTruthy();
      for (const card of [real, skeleton]) {
        expect(card?.getBoundingClientRect().width).toBe(684);
        expect(card?.getBoundingClientRect().height).toBe(208);
        expect(getComputedStyle(card as HTMLElement).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(card as HTMLElement).borderRadius).toBe('16px');
        expect(getComputedStyle(card as HTMLElement).borderTopWidth).toBe('0px');
      }
    });
  },
};

export const DesktopLongTitle: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={longTitleTerm} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    const actions = canvasElement.querySelector<HTMLElement>('[data-term-card-header-actions]');
    const titleText = title?.querySelector<HTMLElement>('span');
    await waitFor(() => {
      expect(title).toBeTruthy();
      expect(actions).toBeTruthy();
      expect(titleText?.scrollWidth).toBeGreaterThan(titleText?.clientWidth ?? 0);
      expect(titleText?.clientHeight).toBe(20);
      expect(getComputedStyle(titleText as HTMLElement).whiteSpace).toBe('nowrap');
      expect(getComputedStyle(titleText as HTMLElement).textOverflow).toBe('ellipsis');
      expect(getComputedStyle(titleText as HTMLElement).overflow).toBe('hidden');
      expect((actions?.getBoundingClientRect().left ?? 0) - (title?.getBoundingClientRect().right ?? 0)).toBe(48);
    });
  },
};

export const DesktopLongTitle1440: Story = {
  ...DesktopLongTitle,
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
};

export const DesktopLongTitle1280: Story = {
  ...DesktopLongTitle,
  globals: { viewport: { value: 'desktop1280', isRotated: false } },
};

export const DesktopLongTitle1024: Story = {
  ...DesktopLongTitle,
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
};

function FillParentClickedStory() {
  return <AuthenticatedDesktopStory><TermCard term={fiveLineTerm} selected expansion="fill-parent" /></AuthenticatedDesktopStory>;
}

async function assertFillParentGeometry(canvasElement: HTMLElement, stacked = false) {
  await waitFor(() => {
    const root = canvasElement.querySelector<HTMLElement>('[data-term-card-state]');
    const main = canvasElement.querySelector<HTMLElement>('[data-term-card-main]');
    const panel = canvasElement.querySelector<HTMLElement>('[data-term-card-source-panel]');
    expect(root).toBeTruthy();
    expect(main).toBeTruthy();
    expect(panel).toBeTruthy();
    expect(main?.getBoundingClientRect().width).toBe(684);
    if (stacked) {
      expect(panel?.getBoundingClientRect().top).toBeGreaterThanOrEqual((main?.getBoundingClientRect().bottom ?? 0) - 1);
      expect(panel?.getBoundingClientRect().height).toBeGreaterThanOrEqual(208);
    } else {
      expect(panel?.getBoundingClientRect().height).toBe(main?.getBoundingClientRect().height);
    }
    expect(panel?.getBoundingClientRect().right).toBe(root?.getBoundingClientRect().right);
  });
}

export const DesktopFillParentClicked1440: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <FillParentClickedStory />,
  play: ({ canvasElement }) => assertFillParentGeometry(canvasElement),
};

export const DesktopFillParentClicked1280: Story = {
  globals: { viewport: { value: 'desktop1280', isRotated: false } },
  render: () => <FillParentClickedStory />,
  play: ({ canvasElement }) => assertFillParentGeometry(canvasElement),
};

export const DesktopFillParentClicked1024: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  render: () => <FillParentClickedStory />,
  play: ({ canvasElement }) => assertFillParentGeometry(canvasElement, true),
};

export const DesktopFiveLineDefinition: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={fiveLineTerm} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-measured-text-preview]')).toBeTruthy());
    await waitFor(() => expect(canvasElement.querySelector('[data-measured-text-fade]')).toBeNull());
  },
};

export const DesktopFiveLineClicked: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={fiveLineTerm} selected /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const main = canvasElement.querySelector<HTMLElement>('[data-term-card-main]');
      const panel = canvasElement.querySelector<HTMLElement>('[data-term-card-source-panel]');
      expect(main).toBeTruthy();
      expect(panel).toBeTruthy();
      expect(main?.getBoundingClientRect().height).toBe(240);
      expect(panel?.getBoundingClientRect().height).toBe(240);
      expect(panel?.getBoundingClientRect().height).toBe(main?.getBoundingClientRect().height);
    });
  },
};

export const DesktopOverflowDefinition: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={overflowTerm} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-measured-text-preview]')).toBeTruthy());
    await waitFor(() => expect(canvasElement.querySelector('[data-measured-text-fade]')).toBeTruthy());
  },
};

export const DesktopHover: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={term} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const main = canvasElement.querySelector<HTMLElement>('[data-term-card-main]');
    if (!main) throw new Error('TermCard main not found');
    await userEvent.hover(main);
    await userEvent.tab();
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Показать источник определения' })).toBeVisible());
  },
};

export const DesktopFocus: Story = {
  render: () => <AuthenticatedDesktopStory><TermCard term={term} /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: term.name })).toHaveFocus();
  },
};

export const DesktopClicked: Story = {
  render: () => <AuthenticatedDesktopStory><ControlledDesktopClickedStory /></AuthenticatedDesktopStory>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('complementary')).toBeVisible();
    await expect(canvas.getByText('Источник определения')).toBeVisible();
  },
};

export const MissingMetadata: Story = {
  render: () => <DefinitionMetadata definition={{ text: 'Без метаданных', page: 0, topic: undefined }} showPage={false} />,
};

export const DesktopMissingMetadata: Story = {
  render: () => <TermCard term={{ ...shortTerm, definitions: [{ text: 'No source metadata.', page: 0, topic: undefined }] }} selected />,
};

export const FavoriteStates: Story = {
  render: () => <FavoriteToggleStates />,
};

export const MobilePopulatedAndLoading: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => <AuthenticatedMobileCardsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const populated = canvas.getByRole('region', { name: 'Populated mobile term card' });
    const loading = canvas.getByRole('region', { name: 'Loading mobile term card' });
    const favorite = await within(populated).findByRole('button');
    const details = within(populated).getByRole('link');
    const populatedCard = populated.querySelector<HTMLElement>('article');
    const skeletonCard = loading.querySelector<HTMLElement>('[aria-hidden="true"]');
    const skeletonFavorite = loading.querySelector<HTMLElement>('[data-skeleton-favorite]');
    const skeletonHeader = skeletonFavorite?.parentElement;
    const skeletonCta = loading.querySelector<HTMLElement>('[data-skeleton-cta]');

    if (!populatedCard || !skeletonCard || !skeletonFavorite || !skeletonHeader || !skeletonCta) {
      throw new Error('Mobile populated/loading story is missing required geometry probes');
    }

    await expect(favorite).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await expect(details).toBeVisible();
    await expect(details).toHaveAttribute('href', '/terms/search-algorithms');
    await waitFor(() => {
      expect(favorite.getBoundingClientRect().height).toBe(44);
      expect(details.getBoundingClientRect().height).toBe(40);
      expect(skeletonFavorite.getBoundingClientRect().height).toBe(44);
      expect(skeletonHeader.getBoundingClientRect().height).toBe(20);
      expect(skeletonCta.getBoundingClientRect().height).toBe(40);
      expect(populatedCard.getBoundingClientRect().height).toBe(324);
      expect(skeletonCard.getBoundingClientRect().height).toBe(populatedCard.getBoundingClientRect().height);
    });
  },
};

export const FiveFeaturedVariants: Story = {
  render: () => (
    <div className="grid gap-8 overflow-hidden">
      {(['desktop', 'mobile', 'home', 'guest', 'guestDesktop'] satisfies FeaturedTermCardVariant[]).map((variant) => (
        <section key={variant} aria-label={variant}><FeaturedTermCard featuredTerm={{ term, featured_definition: longDefinition }} variant={variant} /></section>
      ))}
    </div>
  ),
};
