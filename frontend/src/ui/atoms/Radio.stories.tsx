import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Radio } from './Radio';

const meta = {
  title: 'Atoms/Radio',
  component: Radio,
  args: { name: 'search-mode', value: 'terms' },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithExternalLabel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Radio {...args} id="search-terms" />
      <label htmlFor="search-terms">Terms</label>
    </div>
  ),
};

export const DefaultChecked: Story = {
  args: { id: 'default-radio', defaultChecked: true },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Radio {...args} />
      <label htmlFor="default-radio">Definitions</label>
    </div>
  ),
};

export const Disabled: Story = {
  args: { id: 'disabled-radio', disabled: true, defaultChecked: true },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Radio {...args} />
      <label htmlFor="disabled-radio">Unavailable mode</label>
    </div>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Radio id="keyboard-radio" name="keyboard-mode" />
      <label htmlFor="keyboard-radio">Keyboard radio</label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio = canvas.getByRole('radio', { name: 'Keyboard radio' });
    await userEvent.tab();
    await expect(radio).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(radio).toBeChecked();
  },
};
