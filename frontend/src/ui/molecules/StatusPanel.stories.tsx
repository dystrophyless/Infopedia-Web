import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../atoms';
import { StatusPanel } from './StatusPanel';

const retry = fn();

const meta = {
  title: 'Molecules/StatusPanel',
  component: StatusPanel,
  args: {
    title: 'A few topics need review',
    description: 'Review weak topics before starting the next test.',
    tone: 'review',
    className: 'w-[360px]',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'brand', 'success', 'danger', 'low', 'review', 'good', 'excellent'],
    },
    announce: { control: 'inline-radio', options: ['off', 'polite', 'assertive'] },
  },
} satisfies Meta<typeof StatusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Review: Story = {};

export const Action: Story = {
  args: {
    tone: 'danger',
    title: 'Results could not be loaded',
    action: <Button onClick={retry}>Try again</Button>,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
    await expect(retry).toHaveBeenCalled();
  },
};
