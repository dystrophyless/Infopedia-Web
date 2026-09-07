import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Progress } from './Progress';

const meta = {
  title: 'Atoms/Progress',
  component: Progress,
  decorators: [
    (Story) => (
      <div style={{ width: 320, background: '#fff', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
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
type Story = StoryObj<{
  value?: number;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'success' | 'danger' | 'correct' | 'incorrect';
  valueText?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}>;

export const Determinate: Story = {
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole('progressbar', {
      name: 'Test completion',
    });
    await expect(progress).toHaveAttribute('aria-valuenow', '68');
    await expect((progress.querySelector('span') as HTMLElement).style.width).toBe('68%');
  },
};

export const Zero: Story = {
  args: {
    value: 0,
    'aria-label': 'Zero progress',
  },
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole('progressbar', { name: 'Zero progress' });
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await expect((progress.querySelector('span') as HTMLElement).style.width).toBe('0%');
  },
};

export const CustomRange: Story = {
  args: {
    min: 1,
    max: 10,
    value: 7,
    valueText: '7 of 10 questions',
  },
  play: async ({ canvasElement }) => {
    const progress = within(canvasElement).getByRole('progressbar', { name: 'Test completion' });
    await expect(progress).toHaveAttribute('aria-valuemin', '1');
    await expect(progress).toHaveAttribute('aria-valuemax', '10');
    await expect(progress).toHaveAttribute('aria-valuenow', '7');
    await expect(progress).toHaveAttribute('aria-valuetext', '7 of 10 questions');
    const width = Number.parseFloat((progress.querySelector('span') as HTMLElement).style.width);
    await expect(width).toBeGreaterThan(66.6);
    await expect(width).toBeLessThan(66.7);
  },
};

export const FigmaTrack: Story = {
  args: {
    value: 0,
    size: 'md',
    'aria-label': 'Section progress',
    trackClassName: '!rounded-[8px] !bg-[rgba(106,55,195,0.25)]',
    indicatorClassName: '!rounded-[8px] !bg-[#6a37c3]',
  },
};
