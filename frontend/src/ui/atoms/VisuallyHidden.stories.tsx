import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Atoms/VisuallyHidden',
  component: VisuallyHidden,
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScreenReaderLabel: Story = {
  render: () => (
    <button type="button">
      <span aria-hidden="true">×</span>
      <VisuallyHidden>Close search</VisuallyHidden>
    </button>
  ),
};
