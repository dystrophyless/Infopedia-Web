import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Textarea } from './Textarea';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  args: {
    'aria-label': 'Search query',
    placeholder: 'Describe what you want to find',
    onChange: fn(),
    rows: 5,
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 6, width: 360 }}>
      <label htmlFor="textarea-label" style={{ fontWeight: 500 }}>Search request</label>
      <Textarea {...args} id="textarea-label" aria-label={undefined} />
    </div>
  ),
};

export const Invalid: Story = {
  args: { invalid: true, 'aria-describedby': 'textarea-error' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 6, width: 360 }}>
      <label htmlFor="textarea-invalid" style={{ fontWeight: 500 }}>Search request</label>
      <Textarea {...args} id="textarea-invalid" aria-label={undefined} />
      <span id="textarea-error" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
        Enter at least ten characters.
      </span>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'This request is unavailable.' },
};

export const KeyboardInput: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    const textarea = canvas.getByRole('textbox', { name: 'Search query' });
    await expect(textarea).toHaveFocus();
    await userEvent.type(textarea, 'Algorithms');
    await expect(textarea).toHaveValue('Algorithms');
  },
};
