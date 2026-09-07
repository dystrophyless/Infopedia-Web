import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { TestStatusView } from './TestStatusView';

const meta = {
  title: 'Features/Tests/Test status view',
  component: TestStatusView,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Тест',
    message: 'Загрузка теста...',
    onBack: fn(),
  },
} satisfies Meta<typeof TestStatusView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const status = canvasElement.querySelector('[data-test-status-loading]');
    await expect(status).toHaveAttribute('aria-busy', 'true');
    await expect(status?.querySelector('.sr-only')).toHaveTextContent('Загрузка теста...');
    await expect(status?.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  },
};

export const Error: Story = {
  args: { message: 'Не удалось загрузить тест', actionLabel: 'Повторить', onAction: fn() },
};
