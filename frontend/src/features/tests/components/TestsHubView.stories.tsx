import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import { TestsHubView } from './TestsHubView';

const liveTopics = [
  { chapter_id: 7, code: 'algorithms-and-programming', title: 'Алгоритмдер және программалау', percentage: 18 },
  { chapter_id: 10, code: 'databases-and-queries', title: 'Деректер базасы', percentage: 34 },
  { chapter_id: 2, code: 'computer-networks', title: 'Компьютерлік желілер', percentage: 46 },
];

const meta = {
  title: 'Features/Tests/Hub',
  component: TestsHubView,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: { layout: 'fullscreen' },
  args: {
    weakTopics: liveTopics,
    weakTopicSearchTarget: '/search?query=Алгоритмдер',
    status: 'ready',
  },
} satisfies Meta<typeof TestsHubView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveAnalysis: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Алгоритмдер және программалау')).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Пройти тест →' })).toHaveFocus();
  },
};

export const NoAnalysis: Story = {
  args: {
    weakTopics: [],
    weakTopicSearchTarget: '/search',
    status: 'empty',
  },
};

export const Loading: Story = {
  args: { status: 'loading' },
};

export const LoadError: Story = {
  args: { status: 'error' },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
};
