import type { Meta, StoryObj } from '@storybook/react-vite';
import { Surface } from './Surface';

const meta = {
  title: 'Atoms/Surface',
  component: Surface,
  args: {
    children: 'Semantic surface content',
    className: 'p-6',
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['plain', 'card', 'canvas', 'soft', 'subtle', 'inverse', 'transparent'],
    },
    variant: { control: 'inline-radio', options: ['default', 'mobile-flat'] },
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'aside', 'nav', 'main', 'header', 'footer'],
    },
  },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const SemanticTones: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="grid w-[min(90vw,760px)] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      {(['plain', 'card', 'canvas', 'subtle', 'inverse'] as const).map((tone) => (
        <Surface {...args} key={tone} tone={tone}>
          <strong>{tone}</strong>
          <p className="mt-2">A surface uses semantic background and foreground roles.</p>
        </Surface>
      ))}
    </div>
  ),
};

export const MobileFlatArticle: Story = {
  args: {
    as: 'article',
    tone: 'card',
    variant: 'mobile-flat',
  },
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
};

export const MobileSurfaceBehavior: Story = {
  globals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-4 bg-bg p-4">
      <Surface tone="card" className="p-6">
        <strong>Card</strong>
        <p className="mt-2">The card stays rounded on mobile without its desktop shadow.</p>
      </Surface>
      <Surface tone="card" variant="mobile-flat" className="p-6">
        <strong>Mobile flat</strong>
        <p className="mt-2">This opt-in surface removes its radius and shadow on mobile.</p>
      </Surface>
      <Surface tone="plain" className="border border-[#6a37c3] p-6">
        <strong>Explicit border</strong>
        <p className="mt-2">Explicit component borders remain visible on mobile.</p>
      </Surface>
    </div>
  ),
};
