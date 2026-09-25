import '../i18n';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { Analyze } from './Analyze';
import type { UntAnalysisAttemptAvailability } from '../features/unt-analysis/model/attempts';
import { UntAnalysisDatePage } from './UntAnalysisDatePage';
import { UntAnalysisPage } from './UntAnalysisPage';

const desktopDefaultAttempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: true, upcoming: false, start_date: '2026-01-10', end_date: '2026-02-10' },
  { id: 'march', available: false, upcoming: true, start_date: '2026-03-01', end_date: null },
  { id: 'grant-1', available: false, upcoming: false, start_date: null, end_date: null },
  { id: 'grant-2', available: false, upcoming: false, start_date: null, end_date: null },
];

const desktopSeptemberAttempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: false, upcoming: false, start_date: '2026-01-10', end_date: '2026-02-10' },
  { id: 'march', available: false, upcoming: false, start_date: '2026-03-01', end_date: '2026-04-30' },
  { id: 'grant-1', available: false, upcoming: false, start_date: '2026-05-01', end_date: '2026-07-31' },
  { id: 'grant-2', available: false, upcoming: false, start_date: '2026-08-01', end_date: '2026-08-31' },
];

const desktopFebruary20Attempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: true, upcoming: false, start_date: '2026-01-10', end_date: '2026-02-21' },
  { id: 'march', available: false, upcoming: true, start_date: '2026-03-01', end_date: null },
  { id: 'grant-1', available: false, upcoming: true, start_date: '2026-05-01', end_date: null },
  { id: 'grant-2', available: false, upcoming: true, start_date: '2026-08-01', end_date: null },
];

const desktopFebruary20MarchDatesKnownAttempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: true, upcoming: false, start_date: '2026-01-10', end_date: '2026-02-21' },
  { id: 'march', available: false, upcoming: true, start_date: '2026-03-10', end_date: '2026-04-03' },
  { id: 'grant-1', available: false, upcoming: true, start_date: '2026-05-01', end_date: null },
  { id: 'grant-2', available: false, upcoming: true, start_date: '2026-08-01', end_date: null },
];

const desktopApril20Attempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: false, upcoming: false, start_date: '2026-01-10', end_date: '2026-02-10' },
  { id: 'march', available: true, upcoming: false, start_date: '2026-03-10', end_date: '2026-04-30' },
  { id: 'grant-1', available: false, upcoming: true, start_date: '2026-05-01', end_date: null },
  { id: 'grant-2', available: false, upcoming: true, start_date: '2026-08-01', end_date: null },
];

const desktopApril2JanuaryAnalyzedAttempts: UntAnalysisAttemptAvailability[] = [
  { id: 'january', available: false, upcoming: false, analyzed: true, start_date: '2026-01-10', end_date: '2026-02-10' },
  { id: 'march', available: true, upcoming: false, start_date: '2026-03-01', end_date: '2026-04-30' },
  { id: 'grant-1', available: false, upcoming: true, start_date: '2026-05-01', end_date: null },
  { id: 'grant-2', available: false, upcoming: true, start_date: '2026-08-01', end_date: null },
];

function StorybookAnalyzeUploadRoute() {
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('untAttemptId') ?? '';
  const attemptDate = searchParams.get('untAttemptDate') ?? '';

  return (
    <>
      <span className="sr-only" data-testid="unt-analysis-flow-context">
        {`${attemptId}:${attemptDate}`}
      </span>
      <Analyze />
    </>
  );
}

function StorybookUntAnalysisFlow() {
  return (
    <Routes>
      <Route
        path="/analyze/unt"
        element={<UntAnalysisPage initialAttempts={desktopApril2JanuaryAnalyzedAttempts} />}
      />
      <Route path="/analyze" element={<StorybookAnalyzeUploadRoute />} />
    </Routes>
  );
}

async function assertNoHorizontalOverflow(canvasElement: HTMLElement) {
  const documentElement = canvasElement.ownerDocument.documentElement;
  await expect(documentElement.scrollWidth).toBeLessThanOrEqual(documentElement.clientWidth + 1);
  await expect(canvasElement.ownerDocument.body.scrollWidth).toBeLessThanOrEqual(documentElement.clientWidth + 1);
}

const meta = {
  title: 'Pages/UNT Analysis',
  component: UntAnalysisPage,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/analyze/unt']}>
        <div data-unt-analysis-story-shell className="min-h-screen md:flex">
          <style>{'@media (min-width: 768px) { [data-unt-analysis-story-shell] [data-desktop-sidebar] { height: 1080px; } }'}</style>
          <DesktopSidebar
            activeItem="analyze"
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
          <MobileBottomNav activeItem="analyze" />
        </div>
      </MemoryRouter>
    ),
  ],
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error', config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
} satisfies Meta<typeof UntAnalysisPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopDefault: Story = {
  args: { initialAttempts: desktopDefaultAttempts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const january = canvas.getByRole('radio', { name: /Январский/ });
    await expect(canvas.getByRole('heading', { name: 'Выберите попытку ЕНТ' })).toBeVisible();
    await expect(canvas.getAllByRole('radio')).toHaveLength(4);
    await expect(january).toBeEnabled();
    await expect(canvas.getByRole('radio', { name: /Мартовский/ })).toBeDisabled();
    await expect(canvas.getByRole('radio', { name: /Грантовский №1/ })).toBeDisabled();
    await expect(canvas.getByRole('radio', { name: /Грантовский №2/ })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();

    await userEvent.click(january);
    await expect(january).toBeChecked();
    await expect(canvas.getByTestId('unt-analysis-option-january')).toHaveAttribute('data-unt-analysis-selected', 'true');
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeEnabled();
  },
};

export const DesktopFebruary20JanuaryAvailable: Story = {
  args: { initialAttempts: desktopFebruary20Attempts },
};

export const DesktopFebruary20MarchDatesKnown: Story = {
  args: { initialAttempts: desktopFebruary20MarchDatesKnownAttempts },
};

export const DesktopApril20JanuarySelected: Story = {
  args: {
    initialAttempts: desktopApril20Attempts,
    defaultSelectedAttempt: 'january',
  },
};

export const DesktopApril2JanuaryAnalyzed: Story = {
  args: { initialAttempts: desktopApril2JanuaryAnalyzedAttempts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const january = canvas.getByRole('radio', { name: /Январский/ });
    const januaryRow = canvas.getByTestId('unt-analysis-option-january');

    await expect(january).toBeDisabled();
    await expect(january).not.toBeChecked();
    await expect(januaryRow).toHaveAttribute('data-unt-analysis-analyzed', 'true');
    await expect(januaryRow).toHaveAttribute('data-unt-analysis-selectable', 'false');
    await expect(canvas.getByText('Проанализировано')).toBeVisible();
    await expect(canvas.getByRole('radio', { name: /Мартовский/ })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();
  },
};

export const DesktopEndToEndAnalysisFlow: Story = {
  render: () => <StorybookUntAnalysisFlow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const january = canvas.getByRole('radio', { name: /Январский/ });
    const march = canvas.getByRole('radio', { name: /Мартовский/ });

    await expect(january).toBeDisabled();
    await expect(canvas.getByText('Проанализировано')).toBeVisible();
    await userEvent.click(march);
    await userEvent.click(canvas.getByRole('button', { name: 'Далее' }));
    await expect(canvas.getByTestId('unt-analysis-calendar-month')).toHaveTextContent('Март, 2026');
    await userEvent.click(canvas.getByRole('button', { name: /14 марта 2026/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Далее' }));

    await expect(canvasElement.querySelector('[data-analyze-desktop-upload]')).toBeVisible();
    await expect(canvas.getByTestId('unt-analysis-flow-context')).toHaveTextContent(
      'march:2026-03-14',
    );
  },
};

export const DesktopNoAvailableAttempts: Story = {
  args: { initialAttempts: desktopSeptemberAttempts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const radio of canvas.getAllByRole('radio')) await expect(radio).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();
  },
};

export const DesktopSelected: Story = {
  args: {
    initialAttempts: desktopDefaultAttempts,
    defaultSelectedAttempt: 'january',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const january = canvas.getByRole('radio', { name: /Январский/ });
    const januaryRow = canvas.getByTestId('unt-analysis-option-january');

    await expect(january).toBeChecked();
    await expect(januaryRow).toHaveAttribute('data-unt-analysis-selected', 'true');
    await expect(januaryRow.querySelector('[data-unt-analysis-selection-indicator]')).not.toBeNull();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeEnabled();
  },
};

export const DesktopFlowToCalendar: Story = {
  args: {
    initialAttempts: desktopDefaultAttempts,
    defaultSelectedAttempt: 'january',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Далее' }));
    await expect(canvas.getByRole('heading', { name: 'Укажите дату сдачи' })).toBeVisible();
    await expect(canvas.getByTestId('unt-analysis-calendar-month')).toHaveTextContent('Январь, 2026');
  },
};

export const DesktopJanuaryCalendar: Story = {
  render: () => (
    <UntAnalysisDatePage
      attemptId="january"
      startDate="2026-01-11"
      endDate="2026-02-10"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Укажите дату сдачи' })).toBeVisible();
    await expect(canvas.getByText('Январский ЕНТ')).toBeVisible();
    await expect(canvas.getByText('11 января — 10 февраля')).toBeVisible();
    await expect(canvas.getByTestId('unt-analysis-calendar-month')).toHaveTextContent('Январь, 2026');
    await expect(canvas.getByRole('button', { name: /10 января 2026/ })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: /11 января 2026/ })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: /Предыдущий месяц/ })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: /Следующий месяц/ })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: /Следующий месяц/ }));
    await expect(canvas.getByTestId('unt-analysis-calendar-month')).toHaveTextContent('Февраль, 2026');
    await expect(canvas.getByRole('button', { name: /Предыдущий месяц/ })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: /Следующий месяц/ })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: /^1 февраля 2026/ })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: /^11 февраля 2026/ })).toBeDisabled();
  },
};

export const DesktopJanuaryCalendar24thSelected: Story = {
  render: () => (
    <UntAnalysisDatePage
      attemptId="january"
      startDate="2026-01-11"
      endDate="2026-02-10"
      defaultSelectedDate="2026-01-24"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selectedDate = canvas.getByRole('button', { name: /24 января 2026/ });
    await expect(canvas.getByRole('heading', { name: 'Укажите дату сдачи' })).toBeVisible();
    await expect(selectedDate).toHaveAttribute('data-unt-analysis-date-selected', 'true');
    await expect(selectedDate).toHaveTextContent('24');
    await expect(canvas.getByText('Выбранная дата')).toBeVisible();
    await expect(canvas.getByText('24 января, 2026')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeEnabled();
    const backButton = canvas.getByRole('button', { name: 'Назад' });
    await expect(backButton).toBeVisible();
    expect(window.getComputedStyle(backButton).backgroundColor).toBe('rgb(246, 245, 247)');
    expect(window.getComputedStyle(backButton).color).toBe('rgb(22, 21, 25)');
  },
};

export const MobileDefault: Story = {
  ...DesktopDefault,
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Выберите попытку ЕНТ' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();
    await assertNoHorizontalOverflow(canvasElement);
  },
};

export const MobileJanuaryCalendar: Story = {
  ...DesktopJanuaryCalendar,
  globals: { viewport: { value: 'mobile320', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Укажите дату сдачи' })).toBeVisible();
    await expect(canvas.getByTestId('unt-analysis-calendar-month')).toHaveTextContent('Январь, 2026');
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeDisabled();
    await assertNoHorizontalOverflow(canvasElement);
  },
};

export const MobileJanuaryCalendar24thSelected: Story = {
  ...DesktopJanuaryCalendar24thSelected,
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /24 января 2026/ })).toHaveAttribute(
      'data-unt-analysis-date-selected',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Далее' })).toBeEnabled();
    await assertNoHorizontalOverflow(canvasElement);
  },
};

export const DesktopNarrow: Story = {
  ...DesktopJanuaryCalendar,
  globals: { viewport: { value: 'desktop1024', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Укажите дату сдачи' })).toBeVisible();
    await assertNoHorizontalOverflow(canvasElement);
  },
};
