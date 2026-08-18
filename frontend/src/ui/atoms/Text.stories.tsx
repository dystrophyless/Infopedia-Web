import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta = {
  title: 'Atoms/Text',
  component: Text,
  args: { children: 'Краткое пояснение к результату.' },
  argTypes: {
    as: { control: 'inline-radio', options: ['p', 'span'] },
    tone: { control: 'inline-radio', options: ['body', 'muted', 'danger', 'success'] },
    size: { control: 'inline-radio', options: ['body', 'helper', 'caption'] },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 8 }}>
      {(['body', 'muted', 'danger', 'success'] as const).map((tone) => (
        <Text {...args} key={tone} tone={tone}>{tone}: {args.children}</Text>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 8 }}>
      {(['body', 'helper', 'caption'] as const).map((size) => (
        <Text {...args} key={size} size={size}>{size}: {args.children}</Text>
      ))}
    </div>
  ),
};

export const LongRussianAndKazakhCopy: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <Text>Выберите тему, чтобы перейти к практическим заданиям и проверить понимание материала.</Text>
      <Text lang="kk">Материалды қаншалықты түсінгеніңізді тексеру үшін тақырыпты таңдап, практикалық тапсырмаларға өтіңіз.</Text>
    </div>
  ),
};
