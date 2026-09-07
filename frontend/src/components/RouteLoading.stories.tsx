import '../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { RouteLoading } from './RouteLoading';

const meta = {
  title: 'Patterns/Route loading',
  component: RouteLoading,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RouteLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(status.querySelectorAll('[aria-hidden="true"]')).not.toHaveLength(0);
  },
};
