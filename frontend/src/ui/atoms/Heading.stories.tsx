import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';

const meta = {
  title: 'Atoms/Heading',
  component: Heading,
  args: { children: 'Результаты анализа' },
  argTypes: {
    level: { control: 'inline-radio', options: [1, 2, 3, 4] },
    size: { control: 'inline-radio', options: ['screen', 'section', 'card'] },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Hierarchy: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Heading level={1} size="screen">Экранный заголовок</Heading>
      <Heading level={2} size="section">Заголовок раздела</Heading>
      <Heading level={3} size="card">Заголовок карточки</Heading>
    </div>
  ),
};

export const LongKazakhTitle: Story = {
  args: {
    level: 1,
    size: 'screen',
    lang: 'kk',
    children: 'Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру',
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};
