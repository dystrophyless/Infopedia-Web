import '../../../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { TestsDashboard } from '../../../api/tests';
import { DesktopSidebar } from '../../../components/DesktopSidebar';
import { TestsHubView } from './TestsHubView';

const liveTopics = [
  { chapter_id: 7, code: 'algorithms-and-programming', title: 'Алгоритмдер және программалау', percentage: 18 },
  { chapter_id: 10, code: 'databases-and-queries', title: 'Деректер базасы', percentage: 34 },
  { chapter_id: 2, code: 'computer-networks', title: 'Компьютерлік желілер', percentage: 46 },
];

const figmaQuestionLabels: Record<number, string> = {
  45: '45 вопросов',
  64: '64 вопроса',
  67: '67 вопрос',
  91: '91 вопрос',
  120: '120 вопросов',
};

const desktopDashboard: TestsDashboard = {
  completedAttemptCount: 4,
  overallAccuracy: 69,
  overallDeltaPoints: 2,
  deltaWindowDays: 7,
  modeAvailability: [
    { mode: 'random', available: true },
    { mode: 'weak', available: true },
    { mode: 'mock', available: true },
    {
      mode: 'chapter',
      available: false,
      disabledReason: { message: 'Недостаточно вопросов для теста' },
    },
  ],
  recentTests: [
    { attemptRef: 'attempt-1', mode: 'random', title: 'Случайный тест', completedAt: '2026-08-01T12:00:00Z', accuracy: 78, correctAnswerCount: 14, incorrectAnswerCount: 4, skippedQuestionCount: 2 },
    { attemptRef: 'attempt-2', mode: 'weak', title: 'Слабые темы', completedAt: '2026-07-31T12:00:00Z', accuracy: 43, correctAnswerCount: 8, incorrectAnswerCount: 12, skippedQuestionCount: 0 },
    { attemptRef: 'attempt-3', mode: 'mock', title: 'Тест по разделу', completedAt: '2026-07-31T09:00:00Z', accuracy: 88, correctAnswerCount: 18, incorrectAnswerCount: 2, skippedQuestionCount: 0 },
  ],
  chapters: [
    { chapterRef: 'computer-devices', code: '01', title: 'Устройства компьютера', importanceRank: 1, questionCount: 91, completedAttemptCount: 2, accuracy: 79, deltaPoints: 3.2 },
    { chapterRef: 'computer-networks', code: '02', title: 'Компьютерные сети. Организация компьютерных сетей', importanceRank: 2, questionCount: 67, completedAttemptCount: 2, accuracy: 63, deltaPoints: -4 },
    { chapterRef: 'information-coding', code: '03', title: 'Представление и измерение информации. Кодирование информации', importanceRank: 3, questionCount: 45, completedAttemptCount: 2, accuracy: 49, deltaPoints: -7.1 },
    { chapterRef: 'number-systems', code: '04', title: 'Системы счисления', importanceRank: 4, questionCount: 64, completedAttemptCount: 2, accuracy: 96, deltaPoints: -3.6 },
    { chapterRef: 'logic-foundations', code: '05', title: 'Логические основы компьютера', importanceRank: 5, questionCount: 64, completedAttemptCount: 2, accuracy: 100, deltaPoints: 20 },
    { chapterRef: 'python-programming', code: '06', title: 'Программирование алгоритмов на языке программирования Python', importanceRank: 6, questionCount: 120, completedAttemptCount: 2, accuracy: 70, deltaPoints: 70 },
    { chapterRef: 'algorithms', code: '07', title: 'Алгоритмы и программирование', importanceRank: 7, questionCount: 42, completedAttemptCount: 2, accuracy: 48, deltaPoints: -6 },
    { chapterRef: 'databases', code: '08', title: 'Базы данных', importanceRank: 8, questionCount: 37, completedAttemptCount: 2, accuracy: 72, deltaPoints: 9 },
    { chapterRef: 'web', code: '09', title: 'Веб-разработка', importanceRank: 9, questionCount: 31, completedAttemptCount: 2, accuracy: 55, deltaPoints: 0 },
    { chapterRef: 'models', code: '10', title: 'Модели и данные', importanceRank: 10, questionCount: 19, completedAttemptCount: 2, accuracy: 39, deltaPoints: -3 },
    { chapterRef: 'information-security', code: '11', title: 'Информационная безопасность', importanceRank: 11, questionCount: 28, completedAttemptCount: 2, accuracy: 65, deltaPoints: 1 },
    { chapterRef: 'multimedia', code: '12', title: 'Мультимедиа', importanceRank: 12, questionCount: 26, completedAttemptCount: 2, accuracy: 58, deltaPoints: -2 },
    { chapterRef: 'data-modeling', code: '13', title: 'Моделирование данных', importanceRank: 13, questionCount: 22, completedAttemptCount: 2, accuracy: 61, deltaPoints: 4 },
  ],
};

const desktopWeakUnavailableDashboard: TestsDashboard = {
  ...desktopDashboard,
  modeAvailability: desktopDashboard.modeAvailability.map((item) =>
    item.mode === 'weak'
      ? {
          ...item,
          available: false,
          disabledReason: {
            reason: 'no_weak_chapters',
            message: 'Загрузите анализ ЕНТ, чтобы открыть режим',
          },
        }
      : item,
  ),
};

function LocationProbe() {
  const location = useLocation();
  return <output className="sr-only" data-location-pathname data-location-url>{location.pathname}{location.search}</output>;
}

const meta = {
  title: 'Features/Tests/Hub',
  component: TestsHubView,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div data-tests-story-shell className="md:flex md:min-h-screen">
          <style>{'@media (min-width: 768px) { [data-tests-story-shell] [data-desktop-sidebar] { height: 1080px; } }'}</style>
          <DesktopSidebar
            activeItem="tests"
            onLogout={fn()}
            user={{
              id: 1,
              username: 'dystrophyless',
              email: 'dystrophyless@example.com',
              language: 'ru',
              grade: '11',
              role: 'user',
            }}
          />
          <div className="min-w-0 flex-1"><Story /></div>
          <LocationProbe />
        </div>
      </MemoryRouter>
    ),
  ],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    // Exact reference colors are the only axe exception. All semantic,
    // keyboard, ARIA, and nested-interactive rules remain blocking.
    a11y: {
      test: 'error',
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
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
  args: {
    dashboard: desktopDashboard,
    dashboardStatus: 'ready',
    onDashboardRetry: fn(),
    desktopQuestionLabel: (count) => figmaQuestionLabels[count] ?? `${count} вопросов`,
  },
  play: async ({ canvasElement }) => {
    const randomCard = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/random"]');
    const weakCard = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/weak"]');
    const mockCard = canvasElement.querySelector<HTMLElement>('[data-testid="tests-mock-mode-card"]');
    await expect(randomCard).not.toBeNull();
    await expect(weakCard).not.toBeNull();
    await expect(weakCard).not.toHaveAttribute('aria-disabled');
    await expect(weakCard?.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]')).toHaveLength(0);
    await expect(mockCard?.tagName).toBe('DIV');
    await expect(mockCard).toHaveAttribute('aria-disabled', 'true');
    const recentLink = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/random?attemptRef=attempt-1"]');
    await expect(recentLink).not.toBeNull();
    const recentRowBox = recentLink!.getBoundingClientRect();
    await expect({ width: recentRowBox.width, height: recentRowBox.height }).toEqual({ width: 272, height: 50 });
    await expect(getComputedStyle(recentLink!).backgroundColor).toBe('rgb(255, 255, 255)');
    const recentDate = recentLink!.querySelector<HTMLElement>('[data-tests-recent-date]')!;
    const recentMetrics = recentLink!.querySelector<HTMLElement>('[data-tests-recent-metrics]')!;
    const recentArrow = recentLink!.querySelector<HTMLElement>('[data-tests-recent-arrow]')!;
    await expect(getComputedStyle(recentDate).opacity).toBe('1');
    await expect(getComputedStyle(recentMetrics).opacity).toBe('0');
    await expect(getComputedStyle(recentMetrics).display).toBe('flex');
    await expect(getComputedStyle(recentArrow).opacity).toBe('0');
    weakCard!.focus();
    await userEvent.tab();
    await expect(recentLink).toHaveFocus();
    await waitFor(
      () => expect(getComputedStyle(recentLink!).backgroundColor).toBe('rgb(251, 251, 251)'),
      { timeout: 1000 },
    );
    await waitFor(() => expect(getComputedStyle(recentDate).opacity).toBe('0'), { timeout: 1000 });
    await waitFor(() => expect(getComputedStyle(recentMetrics).opacity).toBe('1'), { timeout: 1000 });
    await waitFor(() => expect(getComputedStyle(recentArrow).opacity).toBe('1'), { timeout: 1000 });
    await expect(recentLink!.querySelector('[data-tests-recent-correct]')).toHaveTextContent('14');
    await expect(recentLink!.querySelector('[data-tests-recent-incorrect]')).toHaveTextContent('4');
    await expect(recentLink!.querySelector('[data-tests-recent-skipped]')).toHaveTextContent('2');
    await expect(recentLink!.getBoundingClientRect()).toMatchObject({ width: recentRowBox.width, height: recentRowBox.height });
    await userEvent.keyboard('{Enter}');
    await expect(canvasElement.querySelector('[data-location-url]')).toHaveTextContent('/tests/random?attemptRef=attempt-1');
  },
};

export const DesktopRecentMouseNavigation: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: desktopDashboard,
    dashboardStatus: 'ready',
  },
  play: async ({ canvasElement }) => {
    const { userEvent: browserUserEvent } = await import('vitest/browser');
    const recentLink = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/random?attemptRef=attempt-1"]')!;
    const initialBox = recentLink.getBoundingClientRect();
    await browserUserEvent.hover(recentLink);
    await waitFor(
      () => expect(getComputedStyle(recentLink).backgroundColor).toBe('rgb(251, 251, 251)'),
      { timeout: 1000 },
    );
    await waitFor(
      () => expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-metrics]')!)).toMatchObject({ display: 'flex', opacity: '1' }),
      { timeout: 1000 },
    );
    await expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-date]')!)).toMatchObject({ display: 'block', opacity: '0' });
    await expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-arrow]')!)).toMatchObject({ display: 'block', opacity: '1' });
    await expect(recentLink.getBoundingClientRect()).toMatchObject({ width: initialBox.width, height: initialBox.height });
    await expect(recentLink).toHaveClass('active:bg-[#f6f5f7]', 'active:hover:bg-[#f6f5f7]');
    await browserUserEvent.unhover(recentLink);
    await waitFor(
      () => expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-date]')!)).toHaveProperty('opacity', '1'),
      { timeout: 1000 },
    );
    await waitFor(
      () => expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-metrics]')!)).toHaveProperty('opacity', '0'),
      { timeout: 1000 },
    );
    await browserUserEvent.click(recentLink);
    await expect(canvasElement.querySelector('[data-location-url]')).toHaveTextContent('/tests/random?attemptRef=attempt-1');
  },
};

const desktopRecentMetricStressDashboard: TestsDashboard = {
  ...desktopDashboard,
  recentTests: [
    {
      ...desktopDashboard.recentTests[0],
      accuracy: 0,
      correctAnswerCount: 0,
      incorrectAnswerCount: 0,
      skippedQuestionCount: 20,
    },
    ...desktopDashboard.recentTests.slice(1),
  ],
};

export const DesktopRecentZeroSkipped: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopDashboard, dashboardStatus: 'ready' },
  play: async ({ canvasElement }) => {
    const { userEvent: browserUserEvent } = await import('vitest/browser');
    const firstRecentLink = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/random?attemptRef=attempt-1"]')!;
    const recentLink = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/weak?attemptRef=attempt-2"]')!;
    firstRecentLink.focus();
    await browserUserEvent.tab();
    await expect(recentLink).toHaveFocus();
    await expect(recentLink).toHaveAccessibleName(/Пропущено: 0/);
    await expect(recentLink.querySelector('[data-tests-recent-skipped]')).toHaveTextContent('0');
    await waitFor(
      () => expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-metrics]')!).opacity).toBe('1'),
      { timeout: 1000 },
    );
    await expect(getComputedStyle(recentLink.querySelector('[data-tests-recent-skipped]')!)).toMatchObject({ opacity: '1' });
  },
};

export const DesktopRecentMetricStress: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopRecentMetricStressDashboard, dashboardStatus: 'ready' },
  play: async ({ canvasElement }) => {
    const { userEvent: browserUserEvent } = await import('vitest/browser');
    const recentLink = canvasElement.querySelector<HTMLAnchorElement>('a[href="/tests/random?attemptRef=attempt-1"]')!;
    const assertMetrics = async () => {
      const correct = recentLink.querySelector<HTMLElement>('[data-tests-recent-correct]')!;
      const incorrect = recentLink.querySelector<HTMLElement>('[data-tests-recent-incorrect]')!;
      const skipped = recentLink.querySelector<HTMLElement>('[data-tests-recent-skipped]')!;
      await expect(correct).toHaveTextContent('0');
      await expect(incorrect).toHaveTextContent('0');
      await expect(skipped).toHaveTextContent('20');
      for (const metric of [correct, incorrect, skipped]) {
        const marker = metric.children[0] as HTMLElement;
        await expect(marker.getBoundingClientRect()).toMatchObject({ width: 14, height: 14 });
        await expect(getComputedStyle(marker).flexShrink).toBe('0');
      }
      for (const metric of [correct, incorrect]) {
        const glyph = metric.querySelector<HTMLImageElement>('img')!;
        await expect(glyph.getBoundingClientRect()).toMatchObject({ width: 8, height: 8 });
      }
      const skippedMarker = skipped.children[0] as HTMLElement;
      await expect(getComputedStyle(skippedMarker).borderWidth).toBe('1px');
      await expect(getComputedStyle(skippedMarker).borderColor).toBe('rgb(140, 134, 152)');
      await expect(recentLink.getBoundingClientRect()).toMatchObject({ width: 272, height: 50 });
    };

    await browserUserEvent.hover(recentLink);
    await assertMetrics();
    recentLink.focus();
    await expect(recentLink).toHaveFocus();
    await assertMetrics();
    await expect(recentLink).toHaveAccessibleName(/Правильные ответы: 0.*Неправильные ответы: 0.*Пропущено: 20/);
  },
};

export const DesktopShowMoreHover: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopDashboard, dashboardStatus: 'ready' },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<HTMLButtonElement>('[data-tests-desktop-show-more]');
    await expect(button).not.toBeNull();
    const initial = getComputedStyle(button!);
    await expect(initial.backgroundColor).toBe('rgb(222, 210, 241)');
    await expect(initial.color).toBe('rgb(134, 91, 207)');
    await expect(button!.getBoundingClientRect().width).toBeGreaterThan(0);
    const chevron = button!.querySelector('svg');
    await expect(chevron).not.toBeNull();

    await userEvent.hover(button!);
    await expect(button).toHaveClass('hover:bg-[#d4c4ea]', 'hover:text-[#6f45b6]');

    button!.focus();
    await expect(button).toHaveFocus();
    await expect(button).toHaveClass('focus-visible:bg-[#d4c4ea]', 'focus-visible:text-[#6f45b6]');
    await expect(chevron).toHaveClass('group-hover:translate-y-0.5', 'group-focus-visible:translate-y-0.5');
    await expect(button!.getBoundingClientRect().width).toBeGreaterThan(0);
    await userEvent.click(button!);
    await expect(canvasElement.querySelector('[data-tests-desktop-show-more]')).toBeNull();
  },
};

export const DesktopWeakPrerequisite: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'ready', status: 'empty' },
  play: async ({ canvasElement }) => {
    const weakCard = canvasElement.querySelector<HTMLAnchorElement>('[data-option-card-contract="weak-pre-analysis"]')!;
    await expect(weakCard).toHaveTextContent('После анализа ЕНТ');
    await expect(weakCard).toHaveTextContent('Подборка вопросов по разделам, где вы теряете баллы');
    await expect(weakCard).toHaveAttribute('href', '/analyze');
    await expect(weakCard).not.toHaveAttribute('aria-disabled');
    await expect(within(weakCard).queryByRole('link')).not.toBeInTheDocument();
    await expect(within(weakCard).queryByRole('button')).not.toBeInTheDocument();
    weakCard.focus();
    await expect(weakCard).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvasElement.querySelector('[data-location-pathname]')).toHaveTextContent('/analyze');
  },
};

export const DesktopWeakPrerequisiteMouse: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'ready', status: 'empty' },
  play: async ({ canvasElement }) => {
    const weakCard = canvasElement.querySelector<HTMLAnchorElement>('[data-option-card-contract="weak-pre-analysis"]')!;
    await expect(weakCard).toHaveAttribute('href', '/analyze');
    await userEvent.click(weakCard);
    await expect(canvasElement.querySelector('[data-location-pathname]')).toHaveTextContent('/analyze');
  },
};

export const DesktopLoading: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'loading' },
  play: async ({ canvasElement }) => {
    const modeSkeletons = [...canvasElement.querySelectorAll('[data-tests-mode-skeleton]')];
    const chapterSkeletons = [...canvasElement.querySelectorAll('[data-tests-chapter-skeleton]')];

    await expect(modeSkeletons).toHaveLength(3);
    await expect(modeSkeletons.map((item) => item.getBoundingClientRect().height)).toEqual([196, 196, 180]);
    await expect(chapterSkeletons).toHaveLength(6);
    await expect(chapterSkeletons.every((item) => item.getBoundingClientRect().height === 196)).toBe(true);
    await expect(canvasElement.querySelector('[data-test-mode="mock"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-chapter-card]')).toBeNull();
  },
};

export const DesktopError: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'error', onDashboardRetry: fn() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-tests-statistics-empty]')).toBeNull();
    await expect(canvasElement.querySelector('[data-tests-statistics-spacer]')).toBeNull();
  },
};

export const DesktopCatalogUnavailable: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'catalog', onDashboardRetry: fn() },
};

export const DesktopEmpty: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: { ...desktopDashboard, chapters: [], recentTests: [] },
    dashboardStatus: 'ready',
  },
};

export const DesktopZeroBank: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: {
      ...desktopDashboard,
      completedAttemptCount: 0,
      overallAccuracy: null,
      overallDeltaPoints: null,
      recentTests: [],
      modeAvailability: desktopDashboard.modeAvailability.map((item) => ({
        ...item,
        available: false,
        disabledReason: { message: '\u0421\u0435\u0440\u0432\u0435\u0440\u043d\u044b\u0439 \u0431\u0430\u043d\u043a \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442' },
      })),
      chapters: [
        {
          chapterRef: 'empty-bank',
          code: '00',
          title: '\u041f\u0443\u0441\u0442\u043e\u0439 \u0431\u0430\u043d\u043a',
          importanceRank: 0,
          questionCount: 0,
          completedAttemptCount: 0,
          accuracy: null,
          deltaPoints: null,
        },
      ],
    },
    dashboardStatus: 'ready',
  },
};

export const DesktopZeroAttempts: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: {
      ...desktopDashboard,
      completedAttemptCount: 0,
      overallAccuracy: null,
      overallDeltaPoints: null,
      recentTests: [],
      chapters: desktopDashboard.chapters.map((chapter) => ({
        ...chapter,
        completedAttemptCount: 0,
        accuracy: null,
        deltaPoints: null,
      })),
    },
    dashboardStatus: 'ready',
  },
};

export const DesktopLegacyMissingCounts: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: {
      ...desktopDashboard,
      completedAttemptCount: null,
      overallAccuracy: null,
      overallDeltaPoints: null,
      recentTests: [],
      chapters: desktopDashboard.chapters.map((chapter) => ({
        ...chapter,
        completedAttemptCount: null,
        accuracy: null,
        deltaPoints: null,
      })),
    },
    dashboardStatus: 'ready',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(args.dashboard?.chapters).toHaveLength(desktopDashboard.chapters.length);
    for (const chapter of args.dashboard?.chapters ?? []) {
      await expect(chapter).toMatchObject({ completedAttemptCount: null, accuracy: null, deltaPoints: null });
    }
    const statistics = canvasElement.querySelector<HTMLElement>('[aria-labelledby="tests-statistics-title"]');
    await expect(statistics).not.toBeNull();
    await expect(within(statistics!).getByText('Общая точность появится здесь')).toBeVisible();
    await expect(within(statistics!).getByText('после первого теста')).toBeVisible();
    await expect(statistics?.querySelector('[data-tests-statistics-spacer]')).not.toBeNull();
    await expect(statistics?.querySelector('[data-tests-statistics-accuracy]')).toBeNull();
    await expect(statistics?.querySelector('[data-tests-statistics-delta]')).toBeNull();

    const chapterCards = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-chapter-card]'));
    await expect(chapterCards).toHaveLength(6);
    for (const card of chapterCards) {
      await expect(within(card).getByText('Нет данных')).toBeVisible();
      await expect(card.querySelector('[data-chapter-metric]')).toBeNull();
    }
    await expect(canvas.queryByText('Общая точность')).not.toBeInTheDocument();
  },
};

export const DesktopOneAttempt: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: {
      ...desktopDashboard,
      completedAttemptCount: 1,
      overallDeltaPoints: 12,
      chapters: desktopDashboard.chapters.map((chapter) => ({
        ...chapter,
        completedAttemptCount: 1,
        deltaPoints: 12,
      })),
    },
    dashboardStatus: 'ready',
  },
};

export const DesktopMultipleAttempts: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopDashboard, dashboardStatus: 'ready' },
};

export const DesktopMixedChapterAttempts: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: {
    dashboard: {
      ...desktopDashboard,
      chapters: desktopDashboard.chapters.map((chapter, index) => {
        const completedAttemptCount = [0, 1, 2, null][index % 4];
        return {
          ...chapter,
          completedAttemptCount,
          accuracy: completedAttemptCount === 0 ? null : chapter.accuracy,
          deltaPoints: completedAttemptCount === 0 ? null : chapter.deltaPoints,
        };
      }),
    },
    dashboardStatus: 'ready',
  },
};

export const DesktopAnalyzeLoading: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'ready', status: 'loading' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('a[href="/tests/weak"]')).toBeNull();
    await expect(canvas.queryByText('После анализа ЕНТ')).not.toBeInTheDocument();
  },
};

export const DesktopAnalyzeError: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'ready', status: 'error' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('a[href="/tests/weak"]')).toBeNull();
    await expect(canvas.queryByText('После анализа ЕНТ')).not.toBeInTheDocument();
  },
};

export const DesktopErrorWithStaleDashboard: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'error', status: 'ready', onDashboardRetry: fn() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('a[href="/tests/weak"]')).toBeNull();
  },
};

export const DesktopCatalogWithStaleDashboard: Story = {
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  args: { dashboard: desktopWeakUnavailableDashboard, dashboardStatus: 'catalog', status: 'ready', onDashboardRetry: fn() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('a[href="/tests/weak"]')).toBeNull();
  },
};
