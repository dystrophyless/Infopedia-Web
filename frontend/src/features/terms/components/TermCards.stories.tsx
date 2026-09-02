import '../../../i18n';
import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
  name: 'Алгоритмы поиска',
  text: 'Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру және олардың тиімділігін әртүрлі деректер жиынтығында салыстыру.',
  page: 142,
  topic: { name: 'Алгоритмы поиска и практическое применение вычислительных методов', book: { publisher: 'Арман-ПВ', grade: 10 } },
};
const term: Term = { public_id: 'search-algorithms', name: 'Алгоритмы поиска', definitions: [longDefinition] };
const shortTerm: Term = { public_id: 'ram', name: 'RAM', definitions: [{ name: 'RAM', text: 'Fast temporary memory.', page: 12, topic: { name: 'Memory', book: { publisher: 'Infopedia', grade: 10 } } }] };
const sourceNamedTerm: Term = {
  public_id: 'term_ram',
  name: 'Жедел жад',
  definitions: [{
    public_id: 'definition_zhzhq',
    name: 'ЖЖҚ',
    text: 'Source definition',
    page: 17,
    topic: { name: 'Компьютерлік жад', book: { publisher: 'Атамұра', grade: 7 } },
  }],
};
const descenderTerm: Term = { ...shortTerm, public_id: 'pygame-surface', name: 'Pygame.surface \u043c\u043e\u0434\u0443\u043b\u0456', definitions: [{ ...shortTerm.definitions![0], name: 'Pygame.surface модулі' }] };
const longTitleTerm: Term = { ...shortTerm, public_id: 'long-title', name: 'A very long desktop term title that uses compact 20px typography', definitions: [{ ...shortTerm.definitions![0], name: 'A very long desktop term title that uses compact 20px typography' }] };
const fiveLineTerm: Term = { ...shortTerm, public_id: 'five-lines', name: 'Five line definition', definitions: [{ name: 'Five line definition', text: 'Line one of the exact five line definition.\nLine two of the exact five line definition.\nLine three of the exact five line definition.\nLine four of the exact five line definition.\nLine five of the exact five line definition.', page: 1 }] };
const overflowTerm: Term = { ...shortTerm, public_id: 'overflow-definition', name: 'Overflow definition', definitions: [{ name: 'Overflow definition', text: 'Line one of the overflow definition.\nLine two of the overflow definition.\nLine three of the overflow definition.\nLine four of the overflow definition.\nLine five of the overflow definition.\nLine six must trigger the fade overlay.', page: 1 }] };
const mobileSevenLineTerm: Term = { ...shortTerm, public_id: 'mobile-seven-lines', name: 'Жеті жолды анықтама', definitions: [{ name: 'Жеті жолды анықтама', text: 'Бірінші жол анықтама мәтіні.\nЕкінші жол анықтама мәтіні.\nҮшінші жол анықтама мәтіні.\nТөртінші жол анықтама мәтіні.\nБесінші жол анықтама мәтіні.\nАлтыншы жол анықтама мәтіні.\nЖетінші жол градиентті іске қосады.', page: 2 }] };
const mobileUnbrokenTerm: Term = { ...shortTerm, public_id: 'mobile-unbroken', name: 'Unbroken token definition', definitions: [{ name: 'Unbroken token definition', text: 'X'.repeat(4000), page: 3 }] };
const mobileRussianTerm: Term = { ...shortTerm, public_id: 'mobile-russian-long', name: 'Длинное русское определение', definitions: [{ name: 'Длинное русское определение', text: 'Русское определение должно занимать больше шести строк на узком мобильном экране.\nВторая строка проверяет перенос текста.\nТретья строка сохраняет читаемый ритм.\nЧетвёртая строка продолжает длинное описание.\nПятая строка остаётся внутри карточки.\nШестая строка касается нижней границы.\nСедьмая строка включает градиент.', page: 4 }] };
const mobileKazakhTerm: Term = { ...shortTerm, public_id: 'mobile-kazakh-long', name: 'Қазақша ұзын анықтама', definitions: [{ name: 'Қазақша ұзын анықтама', text: 'Қазақша анықтама мобильді карточкада алты жолдық шектен асады.\nЕкінші жол мәтіннің дұрыс оралуын тексереді.\nҮшінші жол мазмұнның ретін сақтайды.\nТөртінші жол карточка енін ескереді.\nБесінші жол төменгі аймаққа жақындайды.\nАлтыншы жол шектеудің алдында қалады.\nЖетінші жол градиентті іске қосады.', page: 5 }] };

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

function AuthenticatedMobileOverflowStory() {
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

  const fixtures: Array<[string, Term]> = [
    ['Short definition', shortTerm],
    ['Seven-line definition', mobileSevenLineTerm],
    ['Unbroken definition', mobileUnbrokenTerm],
    ['Russian definition', mobileRussianTerm],
    ['Kazakh definition', mobileKazakhTerm],
  ];

  return (
    <div className="grid gap-4 bg-[#efebf6]">
      {fixtures.map(([label, fixture]) => (
        <section key={label} aria-label={label}>
          <MobileSearchTermCard term={fixture} />
        </section>
      ))}
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

function SelectedDefinitionProbe() {
  const location = useLocation();
  const selectedDefinitionPublicId = (location.state as { selectedDefinitionPublicId?: string } | null)?.selectedDefinitionPublicId;
  return <output data-selected-definition-public-id>{selectedDefinitionPublicId ?? 'none'}</output>;
}

export const LongRussianKazakh: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Алгоритмы поиска/ })).toBeVisible();
    await expect(canvas.getByRole('link', { name: /Узнать подробнее/ })).toHaveAttribute('href', '/terms/search-algorithms');
  },
};

export const MatchedSourceNameSearchCards: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => (
    <div className="grid gap-4">
      <TermCard term={sourceNamedTerm} />
      <MobileSearchTermCard term={sourceNamedTerm} />
      <SelectedDefinitionProbe />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const desktopTitle = canvasElement.querySelector<HTMLElement>('[data-term-card-title]');
    const mobileTitle = canvasElement.querySelector<HTMLElement>('h2');
    await waitFor(() => {
      expect(desktopTitle?.textContent).toContain('ЖЖҚ');
      expect(desktopTitle?.textContent).not.toContain('Жедел жад');
      expect(mobileTitle?.textContent).toBe('ЖЖҚ');
      expect(mobileTitle?.textContent).not.toBe('Жедел жад');
    });

    const links = Array.from(canvasElement.querySelectorAll<HTMLAnchorElement>('a[href="/terms/term_ram"]'));
    expect(links).toHaveLength(2);
    await userEvent.click(links[0]);
    await waitFor(() => expect(canvasElement.querySelector('[data-selected-definition-public-id]')?.textContent).toBe('definition_zhzhq'));
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
  render: () => <DefinitionMetadata definition={{ name: 'Без метаданных', text: 'Без метаданных', page: 0, topic: undefined }} showPage={false} />,
};

export const DesktopMissingMetadata: Story = {
  render: () => <TermCard term={{ ...shortTerm, definitions: [{ name: 'No source metadata.', text: 'No source metadata.', page: 0, topic: undefined }] }} selected />,
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

async function assertMobileOverflowContract(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const expectations = [
    ['Short definition', false],
    ['Seven-line definition', true],
    ['Unbroken definition', true],
    ['Russian definition', true],
    ['Kazakh definition', true],
  ] as const;

  await waitFor(() => {
    for (const [label, shouldFade] of expectations) {
      const section = canvas.getByRole('region', { name: label });
      const card = section.querySelector<HTMLElement>('article');
      const preview = section.querySelector<HTMLElement>('[data-mobile-definition-preview]');
      const paragraph = preview?.querySelector<HTMLElement>('p');
      const metadata = section.querySelector<HTMLElement>('[data-mobile-definition-metadata]');
      const cta = section.querySelector<HTMLAnchorElement>('a');
      if (!card || !preview || !paragraph || !metadata || !cta) {
        throw new Error(`${label} fixture is missing mobile geometry probes`);
      }

      expect(preview.getBoundingClientRect().height).toBe(96);
      expect(getComputedStyle(paragraph).fontSize).toBe('16px');
      expect(getComputedStyle(paragraph).lineHeight).toBe('16px');
      expect(section.querySelector('[data-mobile-definition-fade]') !== null, `${label} fade visibility`).toBe(shouldFade);
      expect(metadata.getBoundingClientRect().height).toBe(24);
      expect(cta.getBoundingClientRect().height).toBe(40);
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    }
  });
}

export const MobileOverflowContract320: Story = {
  globals: { viewport: { value: 'mobile320', isRotated: false } },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  render: () => <AuthenticatedMobileOverflowStory />,
  play: ({ canvasElement }) => assertMobileOverflowContract(canvasElement),
};

export const MobileOverflowContract360: Story = {
  ...MobileOverflowContract320,
  globals: { viewport: { value: 'mobile360', isRotated: false } },
};

export const MobileOverflowContract390: Story = {
  ...MobileOverflowContract320,
  globals: { viewport: { value: 'mobile390', isRotated: false } },
};

export const MobileOverflowContract430: Story = {
  ...MobileOverflowContract320,
  globals: { viewport: { value: 'mobile430', isRotated: false } },
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
