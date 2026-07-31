import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { EmptyState } from '../molecules';
import { BetweenBlocks } from './BetweenBlocks';

const meta = {
  title: 'Patterns/BetweenBlocks',
  component: BetweenBlocks,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BetweenBlocks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: { children: null },
  render: () => (
    <div className="flex min-h-[640px] flex-col bg-canvas p-6">
      <div data-between-blocks-boundary className="rounded-[var(--radius-surface)] bg-surface p-4">
        Previous structural block
      </div>
      <BetweenBlocks outcomeClassName="flex justify-center py-4">
        <EmptyState
          variant="outcome"
          title="No results"
          description="Adjust the preceding controls and try again."
        />
      </BetweenBlocks>
      <div data-between-blocks-boundary className="rounded-[var(--radius-surface)] bg-surface p-4">
        Next structural block
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const boundaries = canvasElement.querySelectorAll('[data-between-blocks-boundary]');
    const outcome = canvas.getByRole('heading', { name: 'No results' }).closest('section');
    const previous = boundaries[0]?.getBoundingClientRect();
    const next = boundaries[1]?.getBoundingClientRect();
    const paint = outcome?.getBoundingClientRect();

    await expect(boundaries).toHaveLength(2);
    await expect(outcome).toBeVisible();
    await expect(Math.abs(((paint?.top ?? 0) + (paint?.bottom ?? 0)) / 2 - ((previous?.bottom ?? 0) + (next?.top ?? 0)) / 2)).toBeLessThanOrEqual(1);
  },
};
