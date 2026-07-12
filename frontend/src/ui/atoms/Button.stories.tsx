import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: {
    children: 'Продолжить',
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost', 'surface'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {(['primary', 'secondary', 'danger', 'ghost', 'surface'] as const).map((variant) => (
        <Button {...args} key={variant} variant={variant}>{variant}</Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Button {...args} key={size} size={size}>{size.toUpperCase()}</Button>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Недоступно' },
};

export const Loading: Story = {
  args: { loading: true, children: 'Сохраняем…' },
};

export const LocalizedLongLabels: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <Button {...args} fullWidth>Перейти к подробным результатам анализа</Button>
      <Button {...args} fullWidth variant="secondary" lang="kk">Тақырып бойынша практикалық тапсырмаларды бастау</Button>
    </div>
  ),
};

export const KeyboardActivation: Story = {
  args: { children: 'Сохранить изменения', onClick: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.tab();
    const button = canvas.getByRole('button', { name: 'Сохранить изменения' });
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
