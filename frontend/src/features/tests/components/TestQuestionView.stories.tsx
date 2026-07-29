import '../../../i18n';
import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { TestQuestion } from '../../../api/tests';
import { getTestRunnerMetrics } from '../model';
import { useTestRunner } from '../hooks';
import { TestQuestionView } from './TestQuestionView';
import { TestResultView } from './TestResultView';

const question: TestQuestion = {
  id: 'q-1',
  prompt: 'Екілік кодтағы ақпаратты уақытша сақтайтын құрылғы қалай аталады?',
  options: [
    { id: 'a', label: 'A', text: 'Мыс өткізгіштер' },
    { id: 'b', label: 'B', text: 'Регистрлер' },
    { id: 'c', label: 'C', text: 'Шина' },
    { id: 'd', label: 'D', text: 'Жергілікті жад' },
  ],
  correctOptionId: 'b',
  explanation: 'Регистрлер екілік кодтағы ақпаратты жазуға, сақтауға және түрлендіруге арналған.',
  topic: { id: 'hardware', title: 'Компьютер құрылғылары', questionCount: 10, estimatedMinutes: 5 },
};

const meta = {
  title: 'Features/Tests/Question',
  component: TestQuestionView,
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Обычный тест',
    question,
    currentQuestionIndex: 0,
    totalQuestions: 10,
    progressPercent: 10,
    selectedOptionId: null,
    checkedOptionId: null,
    checked: false,
    checkDisabled: true,
    onBack: fn(),
    onSelectOption: fn(),
    onPrimaryAction: fn(),
  },
} satisfies Meta<typeof TestQuestionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Selected: Story = { args: { selectedOptionId: 'b', checkDisabled: false } };
export const CorrectFeedback: Story = {
  args: { selectedOptionId: 'b', checkedOptionId: 'b', checked: true, checkDisabled: false },
};
export const IncorrectFeedback: Story = {
  args: { selectedOptionId: 'a', checkedOptionId: 'a', checked: true, checkDisabled: false },
};
export const LongKazakhContent: Story = {
  args: {
    question: {
      ...question,
      prompt: 'Практикалық есептерді шешу үшін іздеу алгоритмдерін іске асыру кезінде деректер құрылымын таңдаудың негізгі себебін көрсетіңіз.',
      options: question.options.map((option, index) => ({
        ...option,
        text: index === 0
          ? 'Элементтерді сақтау, салыстыру және қажетті мәнді тиімді табу үшін қолданылатын өте ұзақ жауап нұсқасы'
          : option.text,
      })),
    },
  },
};

export const DesktopFlow: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  render: () => <TestFlowDemo />,
};

const flowQuestions = [question, { ...question, id: 'q-2', prompt: 'Келесі сұрақ' }];

function TestFlowDemo() {
  const { state, resetTestState, selectOption, runPrimaryAction } = useTestRunner();
  const metrics = useMemo(() => getTestRunnerMetrics(state, flowQuestions, Date.now()), [state]);

  if (state.resultVisible) {
    return (
      <TestResultView
        title="Обычный тест"
        correctAnswerCount={metrics.correctAnswerCount}
        totalQuestions={metrics.totalQuestions}
        scorePercent={metrics.scorePercent}
        durationSeconds={metrics.durationSeconds}
        averagePaceSeconds={metrics.averagePaceSeconds}
        weakTopicResult={metrics.weakTopicResult}
        onBack={() => undefined}
        onRestart={resetTestState}
      />
    );
  }

  const active = metrics.currentQuestion;
  if (!active) return null;

  return (
    <TestQuestionView
      title="Обычный тест"
      question={active}
      currentQuestionIndex={state.currentQuestionIndex}
      totalQuestions={metrics.totalQuestions}
      progressPercent={metrics.progressPercent}
      selectedOptionId={state.selectedOptionId}
      checkedOptionId={state.checkedOptionId}
      checked={metrics.checked}
      checkDisabled={metrics.checkDisabled}
      onBack={() => undefined}
      onSelectOption={selectOption}
      onPrimaryAction={() => runPrimaryAction(active, metrics.totalQuestions)}
    />
  );
}

export const FullKeyboardFlow: Story = {
  render: () => <TestFlowDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: /Регистрлер/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Проверить' }));
    await expect(canvas.getByText('Объяснение')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Далее' }));
    await userEvent.click(canvas.getByRole('button', { name: /Регистрлер/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Далее' }));
    await expect(canvas.getByText('Результаты')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Попробовать ещё' }));
    await expect(canvas.getByText('Вопрос 1 из 2')).toBeVisible();
  },
};
