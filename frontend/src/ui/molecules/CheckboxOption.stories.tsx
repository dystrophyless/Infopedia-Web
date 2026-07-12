import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { CheckboxOption } from './CheckboxOption';

const meta = {
  title: 'Molecules/CheckboxOption',
  component: CheckboxOption,
  args: {
    children: 'Grade 11',
    description: 'Use questions from the selected grade.',
    variant: 'outlined',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['surface', 'outlined', 'plain'] },
    inputPosition: { control: 'inline-radio', options: ['start', 'end'] },
  },
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
} satisfies Meta<typeof CheckboxOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selection: Story = {
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox', { name: /^Grade 11/ });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toHaveAccessibleDescription('Use questions from the selected grade.');
  },
};

export const Mixed: Story = {
  args: { indeterminate: true, inputPosition: 'end' },
};
