import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';

const meta = {
  title: 'Atoms/Divider',
  component: Divider,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div style={{ width: 'min(80vw, 640px)' }}><Story /></div>],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InContent: Story = {
  render: () => (
    <section>
      <p>Основная информация</p>
      <Divider />
      <p>Дополнительные материалы</p>
    </section>
  ),
};
