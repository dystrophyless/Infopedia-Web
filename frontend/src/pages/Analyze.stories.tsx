import '../i18n';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { AnalyzeChapterResult, AnalyzeTask } from '../types';
import { selectAnalyzeResultAccess } from '../features/analyze/model/resultAccess';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import i18n from '../i18n';
import { Analyze, AnalyzeFailure, AnalyzeMobileResults, AnalyzeProcessingViews } from './Analyze';

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

function AuthenticatedAnalyzeLocalizedStory({ language }: { language: 'ru' | 'kk' }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    const previous = useAuthStore.getState();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { id: 1, username: 'storybook', email: 'storybook@example.com', language, grade: 'undefined', role: 'user' },
    });
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [language]);

  if (!ready) return null;

  return (
    <Layout>
      <Analyze />
    </Layout>
  );
}

function DesktopProgressComposition({
  language,
  currentTask,
  file,
  progressOverride,
  sourceReferenceOnly,
  sourceReferenceFillOverride,
}: {
  language: 'ru' | 'kk';
  currentTask: AnalyzeTask;
  file: File;
  progressOverride: number;
  sourceReferenceOnly?: boolean;
  sourceReferenceFillOverride?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    const previous = useAuthStore.getState();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: {
        id: 1,
        username: 'dystrophyless',
        email: 'dystrophyless@example.com',
        language,
        grade: 'undefined',
        role: 'user',
      },
    });
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      useAuthStore.setState({
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        user: previous.user,
      });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [language]);

  if (!ready) return null;

  return (
    <Layout>
      <div className="ml-[2px] flex h-dvh min-h-[573px] w-[calc(100%-2px)] items-center justify-center bg-[#efeaf8]">
        <AnalyzeProcessingViews
          currentTask={currentTask}
          file={file}
          progressOverride={progressOverride}
          sourceReferenceOnly={sourceReferenceOnly}
          sourceReferenceFillOverride={sourceReferenceFillOverride}
        />
      </div>
    </Layout>
  );
}

function AuthenticatedAnalyzeFailureStory({ language }: { language: 'ru' | 'kk' }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const previousLanguage = i18n.language;
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'storybook-token',
      refreshToken: null,
      user: { id: 1, username: 'storybook', email: 'storybook@example.com', language, grade: 'undefined', role: 'user' },
    });
    void i18n.changeLanguage(language).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      useAuthStore.setState({ isAuthenticated: false, token: null, refreshToken: null, user: null });
      void i18n.changeLanguage(previousLanguage);
    };
  }, [language]);

  if (!ready) return null;

  return (
    <MemoryRouter initialEntries={['/analyze']}>
      <Layout>
        <AnalyzeFailure
          kind="unsupportedDocument"
          action="uploadAnother"
          onAction={() => undefined}
          onBack={() => undefined}
        />
      </Layout>
    </MemoryRouter>
  );
}

function renderUploadStory() {
  return (
    <MemoryRouter initialEntries={['/analyze']}>
      <AuthenticatedAnalyzeStory />
    </MemoryRouter>
  );
}

export const UploadEmpty: Story = {
  render: renderUploadStory,
};

function renderDesktopGuide(language: 'ru' | 'kk' = 'ru') {
  return (
    <MemoryRouter initialEntries={['/analyze']}>
      <AuthenticatedAnalyzeLocalizedStory language={language} />
    </MemoryRouter>
  );
}

const desktopGuideGlobals = { viewport: { value: 'desktop1440', isRotated: false } };
const desktopGuideParameters = {
  a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
};

function playDesktopGuideStep(targetStep: number) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    for (let step = 1; step < targetStep; step += 1) {
      await userEvent.click(await canvas.findByRole('button', { name: /Перейти на следующий шаг|Келесі қадамға өту/i }));
    }
    await expect(canvasElement.querySelector('[data-analyze-desktop-active-step]')).toHaveAttribute(
      'data-analyze-desktop-active-step',
      String(targetStep),
    );
  };
}

export const DesktopGuideStep1: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(1),
};

export const DesktopGuideStep2: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(2),
};

export const DesktopGuideStep3: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(3),
};

export const DesktopGuideStep4: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(4),
};

export const DesktopGuideStep5: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(5),
};

export const DesktopGuideStep6: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide(),
  play: playDesktopGuideStep(6),
};

function playDesktopUploadSelected(language: 'ru' | 'kk') {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvasElement.querySelector('#analyze-file')).toBeInTheDocument();
    });
    const desktopInput = canvasElement.querySelector<HTMLInputElement>('#analyze-file') as HTMLInputElement;
    await userEvent.upload(desktopInput, new File(['sample'], 'analysis.pdf', { type: 'application/pdf' }));

    await expect(canvasElement.querySelector('[data-analyze-desktop-composition]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-analyze-desktop-active-step="1"]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-analyze-desktop-selected-filename]')).toHaveTextContent('analysis.pdf');
    await expect(canvasElement.querySelector('[data-analyze-desktop-selected-helper]')).toHaveTextContent(
      language === 'ru' ? 'Нажмите, что бы выбрать другой файл' : 'Басқа файлды таңдау үшін басыңыз',
    );
    await expect(canvasElement.querySelector('[data-analyze-desktop-submit]')).toBeEnabled();
    await expect(canvasElement.querySelectorAll('form')).toHaveLength(1);
    await expect(canvasElement.querySelectorAll('input[type="file"]')).toHaveLength(1);

    const visibleFilenames = canvas.getAllByText('analysis.pdf').filter((node) => node.checkVisibility());
    await expect(visibleFilenames).toHaveLength(1);
  };
}

export const DesktopUploadSelected: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide('ru'),
  play: playDesktopUploadSelected('ru'),
};

export const DesktopUploadSelectedKk: Story = {
  globals: desktopGuideGlobals,
  parameters: desktopGuideParameters,
  render: () => renderDesktopGuide('kk'),
  play: playDesktopUploadSelected('kk'),
};

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

export const UploadEmptyDesktop1231: Story = {
  globals: { viewport: { value: 'desktop1231', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
    <MemoryRouter initialEntries={['/analyze']}>
      <AuthenticatedAnalyzeStory />
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-analyze-adaptive-upload]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-analyze-desktop-guide]')).toBeVisible();
    await expect(canvasElement.querySelectorAll('form')).toHaveLength(1);
    await expect(canvasElement.querySelectorAll('input[type="file"]')).toHaveLength(1);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const UploadEmptyMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: renderUploadStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /анализ/i })).toBeDisabled();
  },
};

export const UploadFileSelected: Story = {
  render: renderUploadStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('#analyze-file');
    await expect(input).not.toBeNull();
    await userEvent.upload(input!, new File(['sample'], 'analysis.pdf', { type: 'application/pdf' }));
    await expect(canvas.getAllByText('analysis.pdf')[0]).toBeVisible();
    await expect(canvas.getByText('Нажмите, что бы выбрать другой файл')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Начать анализ/ })).toBeEnabled();
    await expect(canvas.getAllByText('analysis.pdf')).toHaveLength(1);
  },
};

export const UploadFileSelectedMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: renderUploadStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('#analyze-file') as HTMLInputElement;
    await userEvent.upload(input, new File(['sample'], 'analysis.pdf', { type: 'application/pdf' }));
    await expect(canvas.getAllByText('analysis.pdf')[0]).toBeVisible();
    await expect(canvas.getByText('Нажмите, что бы выбрать другой файл')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Начать анализ/ })).toBeEnabled();
    await expect(canvas.getAllByText('analysis.pdf')).toHaveLength(1);
  },
};

export const SubmitProcessing: Story = {
  globals: { viewport: { value: 'desktop1440', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => <AnalyzeProcessingViews currentTask={processingTask} />,
};

export const DesktopProgressFigmaRussian: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
    <MemoryRouter initialEntries={['/analyze']}>
      <DesktopProgressComposition
        language="ru"
        sourceReferenceOnly
        currentTask={{ task_id: 'desktop-progress', status: 'started', stage: 'parsing' }}
        progressOverride={42}
        file={new File([new Uint8Array(1363149)], 'analysis.pdf', { type: 'application/pdf' })}
        sourceReferenceFillOverride={43.16667}
      />
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const progressbar = await canvas.findByRole('progressbar', { name: 'Анализируем результаты ЕНТ' });
    await expect(progressbar).toHaveAttribute('aria-valuenow', '42');
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress-filename]')).toHaveTextContent('analysis.pdf');
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress-filesize]')).toHaveTextContent('1.3MB');
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress-step="3"]')).toHaveAttribute('data-step-state', 'current');
  },
};

export const DesktopProgressStage3Russian: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
    <MemoryRouter initialEntries={['/analyze']}>
      <DesktopProgressComposition
        language="ru"
        currentTask={{ task_id: 'desktop-progress-stage-3', status: 'started', stage: 'parsing' }}
        progressOverride={70}
        file={new File([new Uint8Array(1363149)], 'analysis.pdf', { type: 'application/pdf' })}
      />
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const progressbar = await canvas.findByRole('progressbar');
    await expect(progressbar).toHaveAttribute('aria-valuenow', '70');
    await expect(progressbar).toHaveAttribute('aria-valuetext', expect.stringContaining('70'));
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress-fill]')).toHaveAttribute('style', 'width: 70%;');
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress-step="3"]')).toHaveAttribute('data-step-state', 'current');
  },
};

export const DesktopProgressKazakh: Story = {
  globals: { viewport: { value: 'desktop1440x1080', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => (
    <MemoryRouter initialEntries={['/analyze']}>
      <DesktopProgressComposition
        language="kk"
        currentTask={{ task_id: 'desktop-progress-kk', status: 'started', stage: 'parsing' }}
        progressOverride={70}
        file={new File([new Uint8Array(1363149)], 'analysis.pdf', { type: 'application/pdf' })}
      />
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('status')).toBeVisible();
    await expect(canvas.getByText('ҰБТ нәтижелерін талдап жатырмыз')).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const ProcessingMobile: Story = {
  globals: { viewport: { value: 'mobile390', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  render: () => <AnalyzeProcessingViews currentTask={processingTask} onBack={() => undefined} />,
};

export const ProcessingUploadedFileMobile430: Story = {
  // The mobile430 viewport is configured as 430x932 in .storybook/preview.ts.
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  // The adaptive progress component owns the canonical mobile app bar and content frame.
  // The authenticated shell's fixed bottom navigation is covered by MobileShell.contract.test.mjs.
  render: () => (
    <AnalyzeProcessingViews
      currentTask={{ ...processingTask, stage: 'parsing' }}
      file={new File([new Uint8Array(1363149)], 'analysis.pdf', { type: 'application/pdf' })}
      onBack={() => undefined}
      progressOverride={78}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toBeVisible();
    await expect(canvasElement.querySelector('[data-mobile-page-app-bar-rail]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-analyze-mobile-progress]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-analyze-desktop-progress]')).not.toBeVisible();
    const visibleFilenames = canvas.getAllByText('analysis.pdf').filter((node) => node.checkVisibility());
    await expect(visibleFilenames).toHaveLength(1);
    const visibleSizes = canvas.getAllByText('1.3MB').filter((node) => node.checkVisibility());
    await expect(visibleSizes).toHaveLength(1);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
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

    const rail = canvasElement.querySelector<HTMLElement>('[data-mobile-page-app-bar-rail]');
    await expect(rail).not.toBeNull();
    if (!rail) return;

    const groupRect = failureGroup.getBoundingClientRect();
    const iconRect = failureIcon.getBoundingClientRect();
    const iconSvgRect = failureIconSvg.getBoundingClientRect();
    const titleRect = failureTitle.getBoundingClientRect();
    const descriptionRect = failureDescription.getBoundingClientRect();
    const actionRect = failureAction.getBoundingClientRect();
    const iconStyle = getComputedStyle(failureIcon);
    const titleStyle = getComputedStyle(failureTitle);
    const descriptionStyle = getComputedStyle(failureDescription);
    const paintMidpoint = (groupRect.top + groupRect.bottom) / 2;
    const idealMidpoint = (rail.getBoundingClientRect().bottom + window.innerHeight) / 2;

    await expect(groupRect.x).toBe(24);
    await expect(groupRect.width).toBeCloseTo(382, 0);
    await expect(Math.abs(paintMidpoint - idealMidpoint)).toBeLessThanOrEqual(2);
    await expect(iconRect.width).toBe(64);
    await expect(iconRect.height).toBe(64);
    await expect(iconSvgRect.width).toBe(32);
    await expect(iconSvgRect.height).toBe(32);
    await expect(iconStyle.backgroundColor).toBe('rgb(222, 210, 241)');
    await expect(iconStyle.color).toBe('rgb(106, 55, 195)');
    await expect(titleRect.y).toBe(iconRect.bottom + 16);
    await expect(titleStyle.fontFamily).toContain('Mabry');
    await expect(titleStyle.fontSize).toBe('20px');
    await expect(titleStyle.lineHeight).toBe('20px');
    await expect(titleStyle.fontWeight).toBe('500');
    await expect(titleStyle.color).toBe('rgb(0, 0, 0)');
    await expect(descriptionRect.y).toBe(titleRect.bottom + 16);
    await expect(descriptionStyle.fontSize).toBe('14px');
    await expect(descriptionStyle.lineHeight).toBe('14px');
    await expect(descriptionStyle.fontWeight).toBe('400');
    await expect(descriptionStyle.color).toBe('rgb(110, 103, 121)');
    await expect(actionRect.x).toBe(24);
    await expect(actionRect.y).toBe(descriptionRect.bottom + 24);
    await expect(actionRect.width).toBeCloseTo(382, 0);
    await expect(actionRect.height).toBe(40);
    await expect(actionRect.bottom).toBeLessThanOrEqual(window.innerHeight);

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

export const UnsupportedPdfResponsiveRussian: Story = {
  tags: ['!test'],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <AuthenticatedAnalyzeFailureStory language="ru" />,
};

export const UnsupportedPdfResponsiveKazakh: Story = {
  tags: ['!test'],
  globals: { viewport: { value: 'mobile430', isRotated: false } },
  render: () => <AuthenticatedAnalyzeFailureStory language="kk" />,
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
