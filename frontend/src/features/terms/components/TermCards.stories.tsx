import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, within } from 'storybook/test';
import type { Definition, Term } from '../../../types';
import { DefinitionMetadata } from './DefinitionMetadata';
import { FeaturedTermCard, type FeaturedTermCardVariant } from './FeaturedTermCard';
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
  decorators: [(Story) => <MemoryRouter><div className="w-[min(760px,95vw)] p-6"><Story /></div></MemoryRouter>],
  args: { term },
} satisfies Meta<typeof TermCard>;

export default meta;
type Story = StoryObj<typeof meta>;

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
