import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  args: {
    className: 'h-16 w-64',
    label: 'Loading result',
  },
  argTypes: {
    shape: { control: 'inline-radio', options: ['text', 'rect', 'rounded', 'circle'] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Announced: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveAccessibleName('Loading result');
  },
};

export const Decorative: Story = {
  args: { label: undefined },
};
