import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { RadioOption } from './RadioOption';

const meta = {
  title: 'Molecules/RadioOption',
  component: RadioOption,
  args: { name: 'mode', value: 'practice', children: 'Practice mode' },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof RadioOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState('exam');
    return (
      <RadioOption
        {...args}
        checked={selected === args.value}
        onChange={(event) => setSelected(event.currentTarget.value)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const option = within(canvasElement).getByRole('radio', { name: 'Practice mode' });
    await userEvent.click(option);
    await expect(option).toBeChecked();
  },
};

export const Disabled: Story = { args: { disabled: true } };
