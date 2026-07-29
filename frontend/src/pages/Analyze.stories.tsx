import '../i18n';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';
import { selectAnalyzeResultAccess } from '../features/analyze/model/resultAccess';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import { Analyze, AnalyzeFailure, AnalyzeMobileResults, AnalyzeProgress } from './Analyze';

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
    topic_count: 3,
    material_grades: [10],
  },
];

const processingTask: AnalyzeTask = { task_id: 'story-task', status: 'started', stage: 'extraction_processing' };

const mobileResults: AnalyzeChapterResult[] = [
  {
    chapter_id: 4,
    code: 'algorithms-and-programming',
    title: 'Алгоритмы и программирование',
    question_count: 12,
    max_score: 20,
    score: 8,
    percentage: 40,
    books: [{ public_id: 'book-1', publisher: 'Arman-PV', grade: 10, topic_count: 4, percentage: 48 }],
    topic_count: 4,
    material_grades: [10, 11],
    topic_codes: [
      { name: 'loops', title: 'Циклы и повторяющиеся действия' },
      { name: 'arrays', title: 'Массивы и обработка данных' },
    ],
  },
  {
    chapter_id: 2,
    code: 'computer-networks',
    title: 'Компьютерные сети',
    question_count: 10,
    max_score: 15,
    score: 5,
    percentage: 33,
    books: [{ public_id: 'book-2', publisher: 'Мектеп', grade: 11, topic_count: 3, percentage: 42 }],
    topic_count: 3,
    material_grades: [11],
    topic_codes: [],
  },
  {
    chapter_id: 8,
    code: 'databases-and-queries',
    title: 'Базы данных и запросы',
    question_count: 8,
    max_score: 12,
    score: 4,
    percentage: 33,
    books: [{ public_id: 'book-3', publisher: 'Арман', grade: 10, topic_count: 2, percentage: 35 }],
    topic_count: 2,
    material_grades: [10],
    topic_codes: [],
  },
  {
    chapter_id: 11,
    code: 'information-representation',
    title: 'Ақпаратты ұсыну, өлшеу және кодтау',
    question_count: 6,
    max_score: 10,
    score: 2,
    percentage: 20,
    books: [{ public_id: 'book-4', publisher: 'Мектеп', grade: 11, topic_count: 4, percentage: 25 }],
    topic_count: 4,
    material_grades: [11],
    topic_codes: [],
  },
];

const meta = {
  title: 'Pages/Analyze',
  component: Analyze,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="min-h-dvh bg-canvas"><Story /></div>],
} satisfies Meta<typeof Analyze>;

export default meta;
type Story = StoryObj<typeof meta>;

function AuthenticatedAnalyzeStory() {
  useEffect(() => {
    const previous = useAuthStore.getState();
    useAuthStore.setState({ isAuthenticated: true, token: 'storybook-token' });
    return () => {
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
    };
  }, []);

  return (
    <Layout>
      <Analyze />
    </Layout>
  );
}

export const UploadEmpty: Story = {};

export const UploadEmptyResponsiveShell: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
      <MemoryRouter initialEntries={['/analyze']}>
        <AuthenticatedAnalyzeStory />
      </MemoryRouter>
    ),
};

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
        <h1 className="mb-12 text-[24px] font-medium leading-none text-[#000000]">Анализ ЕНТ</h1>
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
  render: () => (
    <AnalyzeFailure
      kind="generic"
      action="retry"
      onAction={() => undefined}
      onBack={() => undefined}
    />
  ),
};

export const UnsupportedPdfMobile430: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => (
    <AnalyzeFailure
      kind="unsupportedDocument"
      action="uploadAnother"
      onAction={() => undefined}
      onBack={() => undefined}
    />
  ),
  play: async ({ canvasElement }) => {
    const visibleElement = <ElementType extends Element>(selector: string) =>
      Array.from(canvasElement.querySelectorAll<ElementType>(selector)).find((element) => element.getClientRects().length > 0);
    const failureGroup = visibleElement<HTMLElement>('[data-analyze-failure-group]');
    const failureIcon = visibleElement<HTMLElement>('[data-analyze-failure-icon]');
    const failureTitle = visibleElement<HTMLElement>('[data-analyze-failure-title]');
    const failureDescription = visibleElement<HTMLElement>('[data-analyze-failure-description]');
    const failureAction = visibleElement<HTMLButtonElement>('[data-analyze-failure-action]');
    const failureIconSvg = visibleElement<SVGSVGElement>('[data-analyze-failure-icon] svg');

    await expect(failureGroup).not.toBeNull();
    await expect(failureIcon).not.toBeNull();
    await expect(failureTitle).not.toBeNull();
    await expect(failureDescription).not.toBeNull();
    await expect(failureAction).not.toBeNull();
    await expect(failureIconSvg).not.toBeNull();

    if (!failureGroup || !failureIcon || !failureTitle || !failureDescription || !failureAction || !failureIconSvg) return;

    const groupRect = failureGroup.getBoundingClientRect();
    const iconRect = failureIcon.getBoundingClientRect();
    const iconSvgRect = failureIconSvg.getBoundingClientRect();
    const titleRect = failureTitle.getBoundingClientRect();
    const descriptionRect = failureDescription.getBoundingClientRect();
    const actionRect = failureAction.getBoundingClientRect();
    const iconStyle = getComputedStyle(failureIcon);
    const titleStyle = getComputedStyle(failureTitle);
    const descriptionStyle = getComputedStyle(failureDescription);

    await expect(groupRect.x).toBe(24);
    await expect(groupRect.y).toBe(366);
    await expect(groupRect.width).toBeCloseTo(382, 0);
    await expect(iconRect.width).toBe(64);
    await expect(iconRect.height).toBe(64);
    await expect(iconSvgRect.width).toBe(32);
    await expect(iconSvgRect.height).toBe(32);
    await expect(iconStyle.backgroundColor).toBe('rgb(222, 210, 241)');
    await expect(iconStyle.color).toBe('rgb(106, 55, 195)');
    await expect(titleRect.y).toBe(446);
    await expect(titleStyle.fontFamily).toContain('Mabry');
    await expect(titleStyle.fontSize).toBe('20px');
    await expect(titleStyle.lineHeight).toBe('20px');
    await expect(titleStyle.fontWeight).toBe('500');
    await expect(titleStyle.color).toBe('rgb(0, 0, 0)');
    await expect(descriptionRect.y).toBe(482);
    await expect(descriptionStyle.fontSize).toBe('14px');
    await expect(descriptionStyle.lineHeight).toBe('14px');
    await expect(descriptionStyle.fontWeight).toBe('400');
    await expect(descriptionStyle.color).toBe('rgb(110, 103, 121)');
    await expect(actionRect.x).toBe(24);
    await expect(actionRect.y).toBe(descriptionRect.bottom + 24);
    await expect(actionRect.width).toBeCloseTo(382, 0);
    await expect(actionRect.height).toBe(40);

    const assertActionStyle = async () => {
      const actionStyle = getComputedStyle(failureAction);
      await expect(actionStyle.backgroundColor).toBe('rgb(106, 55, 195)');
      await expect(actionStyle.borderRadius).toBe('8px');
      await expect(actionStyle.fontSize).toBe('16px');
      await expect(actionStyle.lineHeight).toBe('16px');
      await expect(actionStyle.fontWeight).toBe('500');
      await expect(actionStyle.color).toBe('rgb(255, 255, 255)');
    };

    await assertActionStyle();
    await userEvent.hover(failureAction);
    await assertActionStyle();
    failureAction.focus();
    await assertActionStyle();
    await userEvent.pointer([{ keys: '[MouseLeft>]', target: failureAction }]);
    await assertActionStyle();
    await userEvent.pointer([{ keys: '[/MouseLeft]', target: failureAction }]);
  },
};

export const EmptySuccess: Story = {
  render: () => (
    <MemoryRouter>
      <AnalyzeMobileResults access={selectAnalyzeResultAccess([])} onBack={() => undefined} />
    </MemoryRouter>
  ),
};

export const PopulatedDesktop: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  render: () => (
    <MemoryRouter>
      <AnalyzeMobileResults access={selectAnalyzeResultAccess(results)} onBack={() => undefined} />
    </MemoryRouter>
  ),
};

export const PopulatedMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  render: () => (
    <MemoryRouter>
      <AnalyzeMobileResults access={selectAnalyzeResultAccess(results)} onBack={() => undefined} />
    </MemoryRouter>
  ),
};

export const MobileResultsFigma430: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
    <MemoryRouter>
      <AnalyzeMobileResults access={selectAnalyzeResultAccess(mobileResults)} onBack={() => undefined} />
    </MemoryRouter>
  ),
};

export const MobileSingleKazakh: Story = {
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => (
    <MemoryRouter>
      <AnalyzeMobileResults
        access={selectAnalyzeResultAccess([mobileResults[3]])}
        onBack={() => undefined}
      />
    </MemoryRouter>
  ),
};
