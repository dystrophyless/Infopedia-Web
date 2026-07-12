import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Input } from './Input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  args: {
    'aria-label': 'Тема',
    placeholder: 'Введите тему',
    onChange: fn(),
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithValue: Story = {
  args: { defaultValue: 'Алгоритмы поиска' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Редактирование недоступно' },
};

export const Invalid: Story = {
  args: { invalid: true, 'aria-describedby': 'topic-error' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 6, width: 320 }}>
      <label htmlFor="topic-invalid" style={{ fontWeight: 500 }}>Название темы</label>
      <Input {...args} id="topic-invalid" aria-label={undefined} />
      <span id="topic-error" style={{ color: 'var(--color-danger)', fontSize: 14 }}>Укажите название темы</span>
    </div>
  ),
};

export const LongLocalizedPlaceholder: Story = {
  args: {
    lang: 'kk',
    'aria-label': 'Іздеу сұрауы',
    placeholder: 'Практикалық есептерді шешуге арналған тақырыпты енгізіңіз',
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};

export const KeyboardInput: Story = {
  args: { 'aria-label': 'Поисковый запрос', onChange: fn() },
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    const input = canvas.getByRole('textbox', { name: 'Поисковый запрос' });
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'алгоритм');
    await expect(input).toHaveValue('алгоритм');
  },
};
