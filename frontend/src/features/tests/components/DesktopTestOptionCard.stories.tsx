import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { DesktopTestOptionCard } from './DesktopTestOptionCard';

const meta = {
  title: 'Features/Tests/Desktop Test Option Card',
  component: DesktopTestOptionCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    a11y: {
      test: 'error',
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
} satisfies Meta<typeof DesktopTestOptionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WeakPreAnalysis: Story = {
  args: {
    mode: 'weak',
    title: 'Слабые темы',
    description: 'Проанализируйте результаты ЕНТ, чтобы определить слабые темы',
    statusBadge: 'После анализа ЕНТ',
    to: '/analyze',
    contract: 'weak-pre-analysis',
  },
  render: (args) => (
    <div className="w-[320px] h-[196px]" data-option-card-story="weak-pre-analysis">
      <DesktopTestOptionCard {...args} />
    </div>
  ),
};

export const MockInactive: Story = {
  args: {
    mode: 'mock',
    title: 'Пробный тест',
    description: 'Подборка из 40 вопросов в формате настоящего ЕНТ',
    statusBadge: 'В процессе разработки',
    contract: 'mock-inactive',
  },
  render: (args) => (
    <div className="w-[655px] h-[180px]" data-option-card-story="mock-inactive">
      <DesktopTestOptionCard {...args} />
    </div>
  ),
};
