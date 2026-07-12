import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Progress } from './Progress';

const meta = {
  title: 'Atoms/Progress',
  component: Progress,
  args: {
    value: 68,
    'aria-label': 'Test completion',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: {
      control: 'inline-radio',
      options: ['brand', 'success', 'danger', 'correct', 'incorrect'],
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole('progressbar', {
      name: 'Test completion',
    });
    await expect(progress).toHaveAttribute('aria-valuenow', '68');
  },
};

export const CustomRange: Story = {
  args: {
    min: 1,
    max: 10,
    value: 7,
    valueText: '7 of 10 questions',
  },
};
