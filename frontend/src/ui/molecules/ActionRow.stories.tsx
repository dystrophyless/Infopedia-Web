import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ActionRow } from './ActionRow';

const meta = {
  title: 'Molecules/ActionRow',
  component: ActionRow,
  args: {
    title: 'Search settings',
    description: 'Choose subjects and classes',
    trailing: <span aria-hidden="true">›</span>,
    onClick: fn(),
  },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof ActionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const action = within(canvasElement).getByRole('button', { name: /Search settings/i });
    await userEvent.click(action);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Disabled: Story = { args: { disabled: true } };
