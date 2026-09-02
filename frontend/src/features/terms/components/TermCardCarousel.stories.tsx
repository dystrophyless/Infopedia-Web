import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { FeaturedTerm } from '../../../types';
import { TermCardCarouselView } from './TermCardCarouselView';

const featured = (index: number): FeaturedTerm => ({
  term: { public_id: `term-${index}`, name: `Термин ${index}` },
  featured_definition: {
    public_id: `definition-${index}`,
    name: `Термин ${index}`,
    text: `Определение ${index} с текстом для проверки доступного пространства карточки.`,
    page: 10 + index,
    topic: { name: 'Алгоритмы', book: { publisher: 'Мектеп', grade: 10 } },
  },
});
const terms = [featured(1), featured(2), featured(3)];
const sourceNamedFeatured: FeaturedTerm = {
  term: { public_id: 'term_ram', name: 'Жедел жад' },
  featured_definition: {
    public_id: 'definition_ram',
    name: 'RAM',
    text: 'Source definition',
    page: 17,
    topic: { name: 'Компьютерлік жад', book: { publisher: 'Атамұра', grade: 7 } },
  },
};
const mobileGuestTerms = [1, 2, 3, 4].map((index) => ({
  term: { public_id: `guest-term-${index}`, name: `Гостевой термин ${index}` },
  featured_definition: {
    public_id: `guest-definition-${index}`,
    name: `Гостевой термин ${index}`,
    text: 'Первая строка определения для гостевой карточки. Вторая строка с источником. Третья строка с пояснением. Четвёртая строка полностью видима. Пятая строка должна быть скрыта.',
    page: 20 + index,
    topic: { name: 'Алгоритмы', book: { publisher: 'Мектеп', grade: 10 }, },
  },
} satisfies FeaturedTerm));

const meta = {
  title: 'Features/Terms/Featured carousel',
  component: TermCardCarouselView,
  decorators: [(Story) => <MemoryRouter><div className="w-screen max-w-[1100px] overflow-hidden py-6"><Story /></div></MemoryRouter>],
  args: { terms, variant: 'desktop' },
} satisfies Meta<typeof TermCardCarouselView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { loading: true, terms: [] } };
export const RequestError: Story = {
  args: {
    error: true,
    terms: [],
    onRetry: fn(),
  },
};
export const Empty: Story = { args: { terms: [] } };
export const Single: Story = { args: { terms: [terms[0]] } };
export const MatchedSourceName: Story = {
  args: { terms: [sourceNamedFeatured], variant: 'desktop' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'RAM' })).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Жедел жад' })).not.toBeInTheDocument();
  },
};
export const MultipleWithClonesAndPause: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link');
    await expect(links).toHaveLength(3);
    const region = links[0].closest('div.relative');
    if (!region) throw new Error('Carousel interaction region not found');
    await userEvent.hover(region);
    await expect(canvasElement.querySelectorAll('[data-carousel-item^="clone-"]')).toHaveLength(3);
    await userEvent.unhover(region);
  },
};
export const MobileFinite: Story = { args: { variant: 'mobile' }, globals: { viewport: { value: 'mobile430', isRotated: false } } };
export const GuestMobileFourLinePreview: Story = {
  args: { terms: mobileGuestTerms, variant: 'guest' },
  globals: { viewport: { value: 'mobile390', isRotated: false } },
};
export const GuestLandingFourLinePreview: Story = {
  args: { terms: mobileGuestTerms, variant: 'guestLanding' },
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
};
