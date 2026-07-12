import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../atoms';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  args: {
    title: 'No saved terms',
    description: 'Save a term to review it later.',
    actionLabel: 'Find terms',
    onAction: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LegacyAction: Story = {
  args: { onAction: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Find terms' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

export const ActionSlot: Story = {
  args: {
    actionLabel: undefined,
    onAction: undefined,
    action: <Button variant="secondary">Import a list</Button>,
  },
};
