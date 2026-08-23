import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import i18n from '../../../i18n';
import type { TestAnswerFeedback, TestCompletionSummary, TestQuestion } from '../../../api/tests';
import { createTestRunnerState, type TestRunnerState } from '../model';
import { assertFigmaContrastLocks, FIGMA_CONTRAST_RULE_SELECTOR, type FigmaContrastStory } from '../figma/desktop-runner-contrast-locks';
import { DesktopTestQuestionView } from './DesktopTestQuestionView';
import { DesktopTestResultView } from './DesktopTestResultView';

const makeQuestions = (count: number): TestQuestion[] => Array.from({ length: count }, (_, index) => ({
  id: `q${index + 1}`,
  prompt: 'Екілік кодтар түрінде берілген ақпаратты жазуға, сақтауға, беруге және түрлендіруге арналған құрылғылар',
  options: [
    { id: 'a', label: 'A', text: 'Мыс өткізгіштер' },
    { id: 'b', label: 'B', text: 'Регистрлер' },
    { id: 'c', label: 'C', text: 'Шина' },
    { id: 'd', label: 'D', text: 'Жергілікті жад' },
  ],
  explanation: 'Регистрлер - екілік кодтар түрінде берілген ақпаратты жазуға, сақтауға, беруге және түрлендіруге арналған құрылғылар.',
  topic: { id: 'chapter-1', title: 'Компьютер архитектурасы', questionCount: count, estimatedMinutes: 8 },
}));
const questions = makeQuestions(15);

const answer = (id: string, optionId = 'b', correct = true): TestAnswerFeedback => ({ questionId: id, optionId, correct, correctOptionRef: 'b', explanation: questions[0].explanation });
const answered: Record<string, TestAnswerFeedback> = { q1: answer('q1'), q2: answer('q2'), q3: answer('q3'), q5: answer('q5'), q6: answer('q6') };
const state = (overrides: Partial<TestRunnerState> = {}): TestRunnerState => ({ ...createTestRunnerState(0), currentQuestionIndex: 6, furthestVisitedIndex: 6, feedbackByQuestionId: answered, answerRecords: [], ...overrides });
const noOp = () => undefined;

function QuestionFixture({ runnerState, forceCheckLabel = false }: { runnerState: TestRunnerState; forceCheckLabel?: boolean }) {
  return <DesktopTestQuestionView title={i18n.t('tests.desktopRandomTitle')} questions={questions} state={runnerState} submitting={false} actionError={false} primaryActionLabel={forceCheckLabel ? i18n.t('tests.desktopCheckAnswer') : undefined} onExit={noOp} onSelectOption={noOp} onPrimaryAction={noOp} onFinishEarly={noOp} onGoToQuestion={noOp} onPrevious={noOp} />;
}

const summary: TestCompletionSummary = { correctAnswerCount: 12, totalQuestions: 15, answeredQuestions: 15, scorePercent: 80, durationSeconds: 1122, averagePaceSeconds: 75, previousScorePercent: 65, accuracyDeltaPoints: 5, weakTopicResult: null };
const resultFeedback = Object.fromEntries(questions.flatMap((question, index) => index === 3 ? [] : [[question.id, answer(question.id, index === 8 || index === 13 ? 'c' : 'b', index !== 8 && index !== 13)]]));
const resultFixture = (count: number) => {
  const fixtureQuestions = makeQuestions(count);
  const fixtureSummary: TestCompletionSummary = { ...summary, correctAnswerCount: count - 2, totalQuestions: count, answeredQuestions: count, scorePercent: Math.round((count - 2) / count * 100) };
  const fixtureFeedback = Object.fromEntries(fixtureQuestions.map((question, index) => [question.id, answer(question.id, index % 9 === 8 ? 'c' : 'b', index % 9 !== 8)]));
  return { fixtureQuestions, fixtureSummary, fixtureFeedback };
};
const useRussianLocale = async () => { await i18n.changeLanguage('ru'); };
const useKazakhLocale = async () => { await i18n.changeLanguage('kk'); };
const auditFigmaContrast = (story: FigmaContrastStory) => async ({ canvasElement }: { canvasElement: HTMLElement }) => assertFigmaContrastLocks(canvasElement, story);
const meta = { title: 'Tests/Desktop Figma Runner', beforeEach: useRussianLocale, parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'desktop' }, a11y: { config: { rules: [{ id: 'color-contrast', selector: FIGMA_CONTRAST_RULE_SELECTOR }] } } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const DefaultQuestion1: Story = { render: () => <QuestionFixture runnerState={state({ currentQuestionIndex: 0, furthestVisitedIndex: 0, feedbackByQuestionId: {} })} />, play: auditFigmaContrast('DefaultQuestion1') };
export const Question7WithSkipped4: Story = { render: () => <QuestionFixture runnerState={state()} />, play: auditFigmaContrast('Question7WithSkipped4') };
export const SelectedAnswer: Story = { render: () => <QuestionFixture runnerState={state({ selectedOptionId: 'b' })} />, play: auditFigmaContrast('SelectedAnswer') };
export const CorrectFeedback: Story = { render: () => <QuestionFixture forceCheckLabel runnerState={state({ selectedOptionId: 'b', checkedOptionId: 'b', answerFeedback: answer('q7'), feedbackByQuestionId: answered })} />, play: auditFigmaContrast('CorrectFeedback') };
export const WrongFeedback: Story = { render: () => <QuestionFixture forceCheckLabel runnerState={state({ selectedOptionId: 'c', checkedOptionId: 'c', answerFeedback: answer('q7', 'c', false), feedbackByQuestionId: answered })} />, play: auditFigmaContrast('WrongFeedback') };
export const Results: Story = { render: () => <DesktopTestResultView title={i18n.t('tests.desktopResultsTitle')} questions={questions} feedbackByQuestionId={resultFeedback} summary={summary} onBack={noOp} onRestart={noOp} />, play: auditFigmaContrast('Results') };
export const QuestionReviewDialog: Story = { render: () => <DesktopTestResultView title={i18n.t('tests.desktopResultsTitle')} questions={questions} feedbackByQuestionId={resultFeedback} reviewFeedbackByQuestionId={{ q7: answer('q7', 'c', false) }} summary={summary} onBack={noOp} onRestart={noOp} />, play: async ({ canvasElement }) => { const canvas = within(canvasElement); const trigger = canvas.getByRole('button', { name: 'Открыть разбор вопроса 7' }); await userEvent.click(trigger); const dialog = within(document.body).getByRole('dialog', { name: questions[6].prompt }); const close = within(dialog).getByRole('button', { name: 'Закрыть разбор вопроса' }); await expect(within(dialog).getByText('Вопрос 7 из 15')).toBeInTheDocument(); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); await expect(close).toHaveFocus(); await userEvent.tab(); await expect(close).toHaveFocus(); await userEvent.keyboard('{Escape}'); await expect(dialog).not.toBeInTheDocument(); await expect(trigger).toHaveFocus(); await userEvent.click(trigger); const overlay = within(document.body).getByRole('dialog', { name: questions[6].prompt }).parentElement; if (!overlay) throw new Error('review overlay missing'); fireEvent.pointerDown(overlay); await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(); await expect(trigger).toHaveFocus(); await userEvent.click(trigger); await userEvent.click(within(document.body).getByRole('button', { name: 'Закрыть разбор вопроса' })); await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument(); await expect(trigger).toHaveFocus(); await userEvent.click(trigger); const reopened = within(document.body).getByRole('dialog', { name: questions[6].prompt }); await expect(reopened).toBeInTheDocument(); within(reopened).getByRole('button', { name: 'Закрыть разбор вопроса' }).blur(); assertFigmaContrastLocks(canvasElement, 'QuestionReviewDialog'); } };

export const ResultsTwentyQuestions: Story = { render: () => { const fixture = resultFixture(20); return <DesktopTestResultView title={i18n.t('tests.desktopResultsTitle')} questions={fixture.fixtureQuestions} feedbackByQuestionId={fixture.fixtureFeedback} summary={fixture.fixtureSummary} onBack={noOp} onRestart={noOp} />; }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await expect(canvas.getAllByRole('button', { name: /^Открыть разбор вопроса / })).toHaveLength(20); await expect(canvas.getByRole('button', { name: 'Открыть разбор вопроса 20' })).toBeInTheDocument(); } };
export const ResultsFortyQuestions: Story = { render: () => { const fixture = resultFixture(40); return <DesktopTestResultView title={i18n.t('tests.desktopResultsTitle')} questions={fixture.fixtureQuestions} feedbackByQuestionId={fixture.fixtureFeedback} summary={fixture.fixtureSummary} onBack={noOp} onRestart={noOp} />; }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await expect(canvas.getAllByRole('button', { name: /^Открыть разбор вопроса / })).toHaveLength(40); await expect(canvas.getByRole('button', { name: 'Открыть разбор вопроса 40' })).toBeInTheDocument(); } };

const verifyLocalizedDeltaFocus = (locale: 'ru' | 'kk') => async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  const exit = canvas.getByRole('button', { name: i18n.t('tests.desktopExit') });
  const explanation = i18n.t('tests.desktopAccuracyDeltaExplanation');
  const delta = canvas.getByRole('button', { name: i18n.t('tests.desktopAccuracyDeltaAriaLabel', { value: '+5%', explanation }) });
  exit.focus();
  await userEvent.tab();
  await expect(delta).toHaveFocus();
  await expect(canvas.getByRole('tooltip')).toHaveTextContent(explanation);
  await expect(canvas.getByRole('heading', { name: i18n.t('tests.desktopResultsTitle') })).toBeInTheDocument();
  await userEvent.tab();
  await expect(canvas.queryByRole('tooltip')).not.toBeInTheDocument();
  await expect(i18n.resolvedLanguage?.startsWith(locale)).toBe(true);
};

export const RussianKeyboardFocus: Story = { beforeEach: useRussianLocale, render: Results.render, play: verifyLocalizedDeltaFocus('ru') };
export const KazakhKeyboardFocus: Story = { beforeEach: useKazakhLocale, render: Results.render, play: verifyLocalizedDeltaFocus('kk') };
