import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { FeaturedTerm } from '../../../types';
import { TermCardCarouselView } from './TermCardCarouselView';

const mobileGuestTerms = [1, 2, 3, 4].map((index) => ({
  term: { public_id: `guest-term-${index}`, name: `Гостевой термин ${index}` },
  featured_definition: {
    public_id: `guest-definition-${index}`,
    name: `Гостевой термин ${index}`,
    text: 'Первая строка определения для гостевой карточки. Вторая строка с источником. Третья строка с пояснением. Четвёртая строка полностью видима. Пятая строка должна быть скрыта.',
    page: 20 + index,
    topic: { name: 'Алгоритмы', book: { publisher: 'Мектеп', grade: 10 } },
  },
} satisfies FeaturedTerm));

const meta = {
  title: 'Features/Terms/Featured carousel',
  component: TermCardCarouselView,
  decorators: [(Story) => <MemoryRouter><div className="w-[calc(100vw-32px)] max-w-[1120px] min-w-0 overflow-hidden py-6"><Story /></div></MemoryRouter>],
  args: { terms: mobileGuestTerms, variant: 'guestLanding' },
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
} satisfies Meta<typeof TermCardCarouselView>;

export default meta;
type Story = StoryObj<typeof meta>;

async function assertLoadingAnatomy(canvasElement: HTMLElement, cardWidth: number, gap: string, padding: string) {
  const status = canvasElement.querySelector<HTMLElement>('[role="status"]');
  if (!status) throw new Error('Carousel loading status is missing');
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(status.querySelector('.sr-only')).toHaveTextContent('Загрузка...');
  const skeletonLayer = status.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!skeletonLayer) throw new Error('Carousel loading skeleton layer is missing');
  const track = skeletonLayer.querySelector<HTMLElement>('ul');
  if (!track) throw new Error('Carousel loading track is missing');
  const shells = Array.from(track.querySelectorAll<HTMLElement>('li'));
  await expect(shells).toHaveLength(4);
  await expect(track).toHaveStyle({ columnGap: gap, paddingLeft: padding });
  for (const shell of shells) {
    await expect(shell.getBoundingClientRect().width).toBe(cardWidth);
    await expect(shell.getBoundingClientRect().height).toBe(168);
    await expect(getComputedStyle(shell).backgroundColor).toBe('rgb(255, 255, 255)');
    await expect(shell.querySelector('[data-carousel-skeleton-title]')).not.toBeNull();
    await expect(shell.querySelectorAll('[data-carousel-skeleton-definition]')).toHaveLength(1);
    await expect(shell.querySelector('[data-carousel-skeleton-source]')).not.toBeNull();
  }
}

export const LoadingDesktop: Story = {
  args: { loading: true, terms: [], variant: 'guestLanding' },
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  play: ({ canvasElement }) => assertLoadingAnatomy(canvasElement, 262, '24px', '0px'),
};

export const LoadingMobile: Story = {
  args: { loading: true, terms: [], variant: 'guest' },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  play: ({ canvasElement }) => assertLoadingAnatomy(canvasElement, 216, '16px', '32px'),
};
export const RequestError: Story = {
  args: {
    error: true,
    terms: [],
    onRetry: fn(),
  },
};
export const Empty: Story = { args: { terms: [] } };

export const GuestMobileFourLinePreview: Story = {
  args: { terms: mobileGuestTerms, variant: 'guest' },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link');
    await expect(links).toHaveLength(4);
    await expect(links[0]).toHaveAttribute('href', '/terms/guest-term-1');
    const firstCard = links[0].getBoundingClientRect();
    await expect(firstCard.width).toBe(216);
    await expect(firstCard.height).toBe(168);
    await expect(links[0].querySelector('[data-measured-text-max-height="56"]')).not.toBeNull();
  },
};

export const GuestLandingFourLinePreview: Story = {
  args: { terms: mobileGuestTerms, variant: 'guestLanding' },
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link');
    await expect(links).toHaveLength(4);
    await expect(links[0]).toHaveAttribute('href', '/terms/guest-term-1');
    const firstCard = links[0].getBoundingClientRect();
    await expect(firstCard.width).toBe(262);
    await expect(firstCard.height).toBe(168);
    await expect(canvasElement.querySelectorAll('[data-carousel-item^="clone-"]')).toHaveLength(4);
    await expect(canvasElement.querySelectorAll('[data-carousel-item^="clone-"] > [aria-hidden="true"]')).toHaveLength(4);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-carousel-item="orig-0"]')?.parentElement?.parentElement;
    if (!scroller) throw new Error('Carousel scroller not found');
    await userEvent.hover(scroller.parentElement ?? scroller);
    await userEvent.unhover(scroller.parentElement ?? scroller);
  },
};
