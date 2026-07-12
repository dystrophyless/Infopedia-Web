import '../i18n';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';
import { Analyze, AnalyzeFailure, AnalyzeProgress, AnalyzeResults } from './Analyze';

const results: AnalyzeChapterResult[] = [
  {
    chapter: 'algorithms',
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

export const UploadFileSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/загрузить|выберите|pdf/i);
    await userEvent.upload(input, new File(['sample'], 'results.pdf', { type: 'application/pdf' }));
    await expect(canvas.getAllByText('results.pdf')[0]).toBeVisible();
  },
};

export const SubmitProcessing: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => <AnalyzeProgress currentTask={processingTask} />,
};

export const ProcessingMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: () => <AnalyzeProgress currentTask={processingTask} />,
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
