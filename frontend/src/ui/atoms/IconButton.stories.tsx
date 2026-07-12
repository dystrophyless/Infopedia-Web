import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { expect, fn } from 'storybook/test';
import { IconButton, type IconButtonProps } from './IconButton';

const searchIcon = <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />;

function withAccessibleName(args: IconButtonProps, label: string): IconButtonProps {
  return { ...args, 'aria-label': label, 'aria-labelledby': undefined } as IconButtonProps;
}

const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  args: {
    'aria-label': 'Поиск',
    children: searchIcon,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['ghost', 'surface', 'primary'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12 }}>
      {(['ghost', 'surface', 'primary'] as const).map((variant) => (
        <IconButton {...withAccessibleName(args, `Поиск · ${variant}`)} key={variant} variant={variant} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <IconButton {...withAccessibleName(args, `Поиск · ${size}`)} key={size} size={size} />
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, 'aria-label': 'Назад — недоступно', children: <HugeiconsIcon icon={ArrowLeft01Icon} size={20} aria-hidden="true" /> },
};

export const KeyboardActivation: Story = {
  args: { 'aria-label': 'Открыть поиск', onClick: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.tab();
    const button = canvas.getByRole('button', { name: 'Открыть поиск' });
    await expect(button).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
