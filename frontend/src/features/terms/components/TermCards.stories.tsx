import '../../../i18n';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, waitFor, within } from 'storybook/test';
import { SkeletonCard } from '../../../components/SkeletonCard';
import type { Definition, Term } from '../../../types';
import { FavoriteToggle } from '../../favorites/components';
import { useFavoritesStore } from '../../favorites/model';
import { useAuthStore } from '../../../stores/authStore';
import { DefinitionMetadata } from './DefinitionMetadata';
import { FeaturedTermCard, type FeaturedTermCardVariant } from './FeaturedTermCard';
import { MobileSearchTermCard } from './MobileSearchTermCard';
import { SemanticResultCard } from './SemanticResultCard';
import { TermCard } from './TermCard';

const longDefinition: Definition = {
  public_id: 'definition-long',
  text: 'Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру және олардың тиімділігін әртүрлі деректер жиынтығында салыстыру.',
  page: 142,
  topic: { name: 'Алгоритмы поиска и практическое применение вычислительных методов', book: { publisher: 'Арман-ПВ', grade: 10 } },
};
const term: Term = { public_id: 'search-algorithms', name: 'Алгоритмы поиска', definitions: [longDefinition] };

const meta = {
  title: 'Features/Terms/Cards',
  component: TermCard,
  decorators: [(Story) => <MemoryRouter><div className="w-[min(760px,100vw)] p-6"><Story /></div></MemoryRouter>],
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

export const LongRussianKazakh: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: /Алгоритмы поиска/ })).toHaveAttribute('href', '/terms/search-algorithms');
    await expect(canvas.getByText(/Арман-ПВ/)).toBeVisible();
  },
};

export const MissingMetadata: Story = {
  render: () => <DefinitionMetadata definition={{ text: 'Без метаданных', page: 0, topic: undefined }} showPage={false} />,
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

export const SemanticResult: Story = {
  render: () => <SemanticResultCard definition={longDefinition} />,
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
