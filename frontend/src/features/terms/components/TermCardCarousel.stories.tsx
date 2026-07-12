import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import type { FeaturedTerm } from '../../../types';
import { TermCardCarouselView } from './TermCardCarouselView';

const featured = (index: number): FeaturedTerm => ({
  term: { public_id: `term-${index}`, name: `Термин ${index}` },
  featured_definition: {
    public_id: `definition-${index}`,
    text: `Определение ${index} с текстом для проверки доступного пространства карточки.`,
    page: 10 + index,
    topic: { name: 'Алгоритмы', book: { publisher: 'Мектеп', grade: 10 } },
  },
});
const terms = [featured(1), featured(2), featured(3)];

const meta = {
  title: 'Features/Terms/Featured carousel',
  component: TermCardCarouselView,
  decorators: [(Story) => <MemoryRouter><div className="w-screen max-w-[1100px] overflow-hidden py-6"><Story /></div></MemoryRouter>],
  args: { terms, variant: 'desktop' },
} satisfies Meta<typeof TermCardCarouselView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { loading: true, terms: [] } };
export const Empty: Story = { args: { terms: [] } };
export const Single: Story = { args: { terms: [terms[0]] } };
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
