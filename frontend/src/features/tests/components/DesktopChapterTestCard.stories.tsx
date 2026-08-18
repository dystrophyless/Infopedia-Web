import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, userEvent, waitFor } from 'storybook/test';
import type { TestsDashboardChapter } from '../../../api/tests';
import { DesktopChapterTestCard } from './DesktopChapterTestCard';

const baseChapter: TestsDashboardChapter = {
  chapterRef: 'modern-it-trends',
  code: '14',
  title: 'Современные тенденции развития информационных технологий. IT Startup (ай-ти-стартап). 3D моделирования',
  importanceRank: 14,
  questionCount: 64,
  completedAttemptCount: 0,
  accuracy: null,
  deltaPoints: null,
};

const meta = {
  title: 'Features/Tests/Desktop Chapter Test Card',
  component: DesktopChapterTestCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-[320px] h-[196px]" data-chapter-card-story>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    // Exact reference colors do not meet WCAG contrast. Keep every other axe
    // rule blocking, including nested-interactive and focus-order checks.
    a11y: {
      test: 'error',
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
  args: {
    chapter: baseChapter,
    accuracyHint: 'Точность рассчитана по всем отвеченным вопросам',
    noDataHint: 'Общая точность по разделу появится после первого теста',
    deltaHint: 'Изменение точности за последние 7 дней',
    noDataLabel: 'Нет данных',
    questionLabel: () => '64 вопроса',
  },
} satisfies Meta<typeof DesktopChapterTestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectCardTabOrder(canvasElement: HTMLElement, metricCount: number) {
  const metrics = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-chapter-metric]'));
  const navigation = canvasElement.querySelector<HTMLElement>('[data-chapter-navigation]');
  await expect(metrics).toHaveLength(metricCount);
  await expect(navigation).not.toBeNull();
  await expect(navigation?.querySelector('a, button, [tabindex]:not([tabindex="-1"])')).toBeNull();
  for (const metric of metrics) {
    await expect(metric).toHaveAttribute('aria-describedby');
    await userEvent.tab();
    await expect(metric).toHaveFocus();
  }
  const noData = canvasElement.querySelector<HTMLElement>('[data-chapter-no-data]');
  if (noData) {
    await userEvent.tab();
    await expect(noData.closest('button')).toHaveFocus();
  }
  await userEvent.tab();
  await expect(navigation).toHaveFocus();
  navigation?.blur();
}

export const NoTest: Story = {
  play: async ({ canvasElement }) => {
    await expectCardTabOrder(canvasElement, 0);
    const card = canvasElement.querySelector<HTMLElement>('[data-chapter-card]');
    const badge = canvasElement.querySelector<HTMLElement>('[data-chapter-no-data]');
    const trigger = badge?.closest<HTMLElement>('button');
    await expect(card).not.toBeNull();
    await expect(badge).not.toBeNull();
    const tooltip = () => document.getElementById(trigger?.getAttribute('aria-describedby') ?? '');
    await waitFor(() => expect(tooltip()).toHaveStyle({ opacity: '0' }));
    await userEvent.hover(card!);
    await waitFor(() => expect(tooltip()).toHaveStyle({ opacity: '0' }));
    await userEvent.hover(badge!);
    await waitFor(() => expect(tooltip()).toHaveStyle({ opacity: '1' }));
    await expect(tooltip()).toHaveTextContent('Общая точность по разделу появится после первого теста');
    await userEvent.unhover(badge!);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await waitFor(() => expect(tooltip()).toHaveStyle({ opacity: '1' }));
  },
};

export const LegacyNoTest: Story = {
  args: {
    chapter: {
      ...baseChapter,
      completedAttemptCount: null,
      accuracy: null,
      deltaPoints: null,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-chapter-no-data]')).toHaveTextContent('Нет данных');
    await expectCardTabOrder(canvasElement, 0);
  },
};

export const ShortTitle: Story = {
  args: {
    chapter: { ...baseChapter, title: 'Системы счисления' },
  },
  play: async ({ canvasElement }) => expectCardTabOrder(canvasElement, 0),
};

export const FirstTest: Story = {
  args: {
    chapter: { ...baseChapter, completedAttemptCount: 1, accuracy: 70 },
  },
  play: async ({ canvasElement }) => expectCardTabOrder(canvasElement, 1),
};

export const Full: Story = {
  args: {
    chapter: { ...baseChapter, completedAttemptCount: 2, accuracy: 96, deltaPoints: -3.6 },
  },
  play: async ({ canvasElement }) => expectCardTabOrder(canvasElement, 2),
};
