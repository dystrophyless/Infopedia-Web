import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TestResultView } from './TestResultView';

const weakTopic = {
  topicId: 'algorithms',
  topicTitle: 'Алгоритмдер және программалау',
  mistakeCount: 2,
  questionCount: 10,
  estimatedMinutes: 5,
};

const meta = {
  title: 'Features/Tests/Result',
  component: TestResultView,
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Обычный тест',
    correctAnswerCount: 7,
    totalQuestions: 10,
    scorePercent: 70,
    durationSeconds: 400,
    averagePaceSeconds: 40,
    weakTopicResult: weakTopic,
    onBack: fn(),
    onRestart: fn(),
  },
} satisfies Meta<typeof TestResultView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = { args: { correctAnswerCount: 0, scorePercent: 0 } };
export const LowerBoundary: Story = { args: { correctAnswerCount: 1, scorePercent: 10 } };
export const MiddleBoundary: Story = { args: { correctAnswerCount: 5, scorePercent: 50 } };
export const UpperBoundary: Story = { args: { correctAnswerCount: 9, scorePercent: 90 } };
export const Perfect: Story = { args: { correctAnswerCount: 10, scorePercent: 100, weakTopicResult: null } };
export const WithWeakTopic: Story = {};
export const WithoutWeakTopic: Story = { args: { weakTopicResult: null } };
