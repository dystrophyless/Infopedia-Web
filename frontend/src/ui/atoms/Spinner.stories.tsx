import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: {
    docs: {
      description: {
        component: 'The glyph is decorative. Place it inside a named status region when loading state needs to be announced.',
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Decorative: Story = {};

export const AccessibleLoadingStatus: Story = {
  render: () => (
    <div role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Spinner />
      <span>Загрузка результатов…</span>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div
      role="group"
      aria-label="Spinner size examples"
      style={{ display: 'flex', alignItems: 'center', gap: 16 }}
    >
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
    </div>
  ),
};
