import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { PasswordField } from './PasswordField';

function PasswordFieldDemo(props: React.ComponentProps<typeof PasswordField>) {
  const [value, setValue] = useState(props.value);
  const [visible, setVisible] = useState(props.visible);

  return (
    <PasswordField
      {...props}
      value={value}
      visible={visible}
      onChange={(nextValue) => {
        setValue(nextValue);
        props.onChange(nextValue);
      }}
      onToggle={() => {
        setVisible((current) => !current);
        props.onToggle();
      }}
    />
  );
}

const meta = {
  title: 'Molecules/PasswordField',
  component: PasswordField,
  args: {
    label: 'Пароль',
    value: '',
    visible: false,
    toggleLabel: 'Показать пароль',
    onChange: fn(),
    onToggle: fn(),
  },
  render: (args) => <PasswordFieldDemo {...args} />,
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
  args: { value: '123', error: 'Пароль должен содержать не менее 8 символов.' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'strong-password' },
};

export const KeyboardAndVisibility: Story = {
  args: { onChange: fn(), onToggle: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const input = canvas.getByLabelText('Пароль');
    await userEvent.click(input);
    await userEvent.type(input, 'құпиясөз');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(args.onChange).toHaveBeenCalled();

    const toggle = canvas.getByRole('button', { name: 'Показать пароль' });
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute('type', 'text');
    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
};
