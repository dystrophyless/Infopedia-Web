import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, within } from 'storybook/test';
import { FALLBACK_WEAK_TOPICS } from '../model';
import { TestsHubView } from './TestsHubView';

const liveTopics = [
  { chapter: 'Алгоритмдер және программалау', percentage: 18 },
  { chapter: 'Деректер базасы', percentage: 34 },
  { chapter: 'Компьютерлік желілер', percentage: 46 },
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
    loading: false,
  },
} satisfies Meta<typeof TestsHubView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveAnalysis: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Алгоритмдер және программалау')).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Начать тест' })).toHaveFocus();
  },
};

export const FallbackTopics: Story = {
  args: {
    weakTopics: FALLBACK_WEAK_TOPICS,
    weakTopicSearchTarget: '/search',
  },
};

export const Loading: Story = {
  args: { loading: true },
};
