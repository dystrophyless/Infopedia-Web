import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta = {
  title: 'Atoms/Chip',
  component: Chip,
  args: { children: 'Алгоритмы' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'brand', 'success', 'danger'] },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {(['neutral', 'brand', 'success', 'danger'] as const).map((tone) => (
        <Chip {...args} key={tone} tone={tone}>{tone}</Chip>
      ))}
    </div>
  ),
};

export const Selected: Story = {
  args: { selected: true, children: 'Выбрано' },
};

export const LocalizedLongValues: Story = {
  render: () => (
    <div style={{ display: 'flex', maxWidth: 360, flexWrap: 'wrap', gap: 8 }}>
      <Chip>Практическое применение алгоритмов поиска</Chip>
      <Chip tone="brand" lang="kk">Іздеу алгоритмдерін практикалық есептерде қолдану</Chip>
    </div>
  ),
};
