import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from '../atoms';
import { StatCard } from './StatCard';

const meta = {
  title: 'Molecules/StatCard',
  component: StatCard,
  args: {
    label: 'Accuracy',
    value: '82%',
    description: 'Up 6 points from the previous attempt.',
    badge: <Chip tone="success">Improving</Chip>,
    className: 'w-[280px]',
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'brand', 'inverse', 'success', 'danger'],
    },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Summary: Story = {};

export const Inverse: Story = {
  args: { tone: 'inverse', value: '14 / 20' },
};
