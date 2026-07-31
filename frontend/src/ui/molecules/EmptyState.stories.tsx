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

export const Outcome: Story = {
  args: {
    variant: 'outcome',
    role: 'alert',
    'data-empty-state-story': 'outcome',
    icon: <span aria-hidden="true">?</span>,
    actionLabel: undefined,
    onAction: undefined,
    action: <Button fullWidth>Change parameters</Button>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const outcome = canvas.getByRole('alert');
    const titleId = outcome.getAttribute('aria-labelledby');
    const descriptionId = outcome.getAttribute('aria-describedby');

    await expect(outcome).toHaveAttribute('data-empty-state-story', 'outcome');
    await expect(titleId).toBeTruthy();
    await expect(descriptionId).toBeTruthy();
    await expect(outcome.querySelector(`#${CSS.escape(titleId ?? '')}`)).toHaveTextContent('No saved terms');
    await expect(outcome.querySelector(`#${CSS.escape(descriptionId ?? '')}`)).toHaveTextContent('Save a term to review it later.');
    await expect(canvas.getByRole('button', { name: 'Change parameters' })).toBeVisible();
  },
};
