import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  args: { id: 'terms', name: 'terms', value: 'accepted' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithExternalLabel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox {...args} />
      <label htmlFor="terms">Accept terms</label>
    </div>
  ),
};

export const DefaultChecked: Story = {
  args: { id: 'default-checked', defaultChecked: true },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox {...args} />
      <label htmlFor="default-checked">Receive updates</label>
    </div>
  ),
};

export const Disabled: Story = {
  args: { id: 'disabled-checkbox', disabled: true, defaultChecked: true },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox {...args} />
      <label htmlFor="disabled-checkbox">Unavailable setting</label>
    </div>
  ),
};

export const Mixed: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Checkbox
          id="mixed-checkbox"
          checked={checked}
          indeterminate={!checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <label htmlFor="mixed-checkbox">Select all topics</label>
      </div>
    );
  },
};

export const KeyboardFocus: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox id="keyboard-checkbox" />
      <label htmlFor="keyboard-checkbox">Keyboard control</label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: 'Keyboard control' });
    await userEvent.tab();
    await expect(checkbox).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(checkbox).toBeChecked();
  },
};
