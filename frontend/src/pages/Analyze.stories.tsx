import '../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';
import { Analyze, AnalyzeFailure, AnalyzeProgress, AnalyzeResults } from './Analyze';

const results: AnalyzeChapterResult[] = [
  {
    chapter_id: 7,
    code: 'algorithms-and-programming',
    title: 'Алгоритмдер және программалау',
    question_count: 12,
    max_score: 20,
    score: 14,
    percentage: 70,
    books: [{ public_id: 'book-1', publisher: 'Arman-PV', grade: 10, topic_count: 3, percentage: 75 }],
  },
];

const processingTask: AnalyzeTask = { task_id: 'story-task', status: 'started', stage: 'extraction_processing' };

const meta = {
  title: 'Pages/Analyze',
  component: Analyze,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="min-h-dvh bg-canvas"><Story /></div>],
} satisfies Meta<typeof Analyze>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UploadEmpty: Story = {};

export const UploadEmptyMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /анализ/i })).toBeDisabled();
  },
};

export const UploadFileSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/загрузить|выберите|pdf/i);
    await userEvent.upload(input, new File(['sample'], 'analysis.pdf', { type: 'application/pdf' }));
    await expect(canvas.getAllByText('analysis.pdf')[0]).toBeVisible();
    await expect(canvas.getByText('Нажмите, что бы выбрать другой файл')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Начать анализ/ })).toBeEnabled();
    await expect(canvas.getAllByText('analysis.pdf')).toHaveLength(2);
  },
};

export const UploadFileSelectedMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Р·Р°РіСЂСѓР·РёС‚СЊ|РІС‹Р±РµСЂРёС‚Рµ|pdf/i);
    await userEvent.upload(input, new File(['sample'], 'analysis.pdf', { type: 'application/pdf' }));
    await expect(canvas.getAllByText('analysis.pdf')[0]).toBeVisible();
    await expect(canvas.getByText('Нажмите, что бы выбрать другой файл')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Начать анализ/ })).toBeEnabled();
    await expect(canvas.getAllByText('analysis.pdf')).toHaveLength(2);
  },
};

export const SubmitProcessing: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <AnalyzeProgress currentTask={processingTask} />,
};

export const ProcessingMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => <AnalyzeProgress currentTask={processingTask} />,
};

export const ProcessingUploadedFileMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  // This story mirrors the processing page composition; the authenticated shell's
  // fixed bottom navigation is covered by MobileShell.contract.test.mjs.
  render: () => (
    <div className="min-h-dvh bg-[#efebf6] pb-[88px]">
      <main className="mx-auto w-full max-w-none px-6 pt-[88px]">
        <h1 className="mb-12 text-[24px] font-medium leading-6 text-[#000000]">Анализ ЕНТ</h1>
        <AnalyzeProgress
          currentTask={processingTask}
          file={new File([new Uint8Array(1363149)], 'analysis.pdf', { type: 'application/pdf' })}
          progressOverride={78}
        />
      </main>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toBeVisible();
    await expect(canvas.getByText('analysis.pdf')).toBeVisible();
    await expect(canvas.getByText('1.3MB')).toBeVisible();
  },
};

export const Error: Story = {
  render: () => <AnalyzeFailure message="Unable to analyze this file." onReset={() => undefined} />,
};

export const EmptySuccess: Story = {
  render: () => <AnalyzeResults results={[]} summary={{ score: 0, maxScore: 0, percentage: 0, chapterCount: 0 }} sortDirection="weakFirst" onSortDirectionChange={() => undefined} />,
};

export const PopulatedDesktop: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <AnalyzeResults results={results} summary={{ score: 14, maxScore: 20, percentage: 70, chapterCount: 1 }} sortDirection="weakFirst" onSortDirectionChange={() => undefined} />,
};

export const PopulatedMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: () => <AnalyzeResults results={results} summary={{ score: 14, maxScore: 20, percentage: 70, chapterCount: 1 }} sortDirection="weakFirst" onSortDirectionChange={() => undefined} />,
};
