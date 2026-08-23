import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Cancel01Icon, Flag02Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import type { TestAnswerFeedback, TestQuestion } from '../../../api/tests';
import { getOptionTone, getQuestionStatus, type TestRunnerState } from '../model';
import { DesktopTestAnswerOption } from './DesktopTestAnswerOption';

type Props = {
  title: string;
  questions: TestQuestion[];
  state: TestRunnerState;
  submitting: boolean;
  actionError: boolean;
  primaryActionLabel?: string;
  onExit: () => void;
  onSelectOption: (id: string) => void;
  onPrimaryAction: () => void;
  onFinishEarly: () => void;
  onGoToQuestion: (index: number) => void;
  onPrevious: () => void;
};

export function DesktopTestQuestionView({ title, questions, state, submitting, actionError, primaryActionLabel, onExit, onSelectOption, onPrimaryAction, onFinishEarly, onGoToQuestion, onPrevious }: Props) {
  const { t } = useTranslation();
  const question = questions[state.currentQuestionIndex];
  const feedback: TestAnswerFeedback | null = state.answerFeedback;
  const answered = Object.keys(state.feedbackByQuestionId ?? {}).length;
  const checked = state.checkedOptionId !== null;
  const disabled = submitting || (!checked && !state.selectedOptionId);
  return (
    <div className="hidden overflow-x-auto bg-[#efeaf8] py-20 md:block" style={{ minHeight: '100vh', paddingInline: 'max(0px, calc((100% - 1120px) / 2))' }} data-desktop-test-runner>
      <header className="mb-8 flex items-center justify-between"><h1 className="text-[24px] font-medium leading-6 text-black">{title}</h1><button type="button" data-figma-contrast-lock="question-exit" onClick={onExit} className="flex h-12 items-center gap-2 rounded-[8px] bg-[#fdf2f1] px-8 text-[16px] font-medium text-[#f69a93] outline-none transition-colors hover:bg-[#fce5e3] focus-visible:ring-2 focus-visible:ring-[#e73023] focus-visible:ring-offset-2">{t('tests.desktopExit')}<HugeiconsIcon icon={Cancel01Icon} size={14} /></button></header>
      <div className="flex gap-4">
        <main className={`flex w-[720px] shrink-0 flex-col rounded-[16px] bg-white px-8 pb-10 pt-8 ${checked ? 'h-[635px]' : 'h-[512px]'}`}>
          <div className="flex h-[72px] gap-8"><div className="flex min-w-0 flex-1 flex-col gap-4"><p data-figma-contrast-lock="question-meta" className="text-[16px] font-medium leading-4 text-[#c5b1e7]">{t('tests.desktopQuestionProgress', { current: state.currentQuestionIndex + 1, total: questions.length })}</p><p className="text-[20px] font-medium leading-5 text-[#161519]">{question.prompt}</p></div><HugeiconsIcon icon={Flag02Icon} size={24} color="#6e6779" /></div>
          <div className="mt-10 flex flex-col gap-2">{question.options.map((option) => <DesktopTestAnswerOption key={option.id} option={option} tone={getOptionTone({ optionId: option.id, selectedOptionId: state.selectedOptionId, checkedOptionId: state.checkedOptionId, correctOptionRef: feedback?.correctOptionRef, answerCorrect: feedback?.correct })} locked={checked} onSelect={onSelectOption} />)}</div>
          {checked && feedback && <section className={`mt-6 min-h-[99px] rounded-[8px] px-6 py-4 ${feedback.correct ? 'bg-[#e7f8f0] text-[#21835a]' : 'bg-[#fce5e3] text-[#9a2219]'}`}><h2 data-figma-contrast-lock={feedback.correct ? 'question-feedback-correct-title' : 'question-feedback-wrong-title'} className={`text-[18px] font-medium leading-[18px] ${feedback.correct ? 'text-[#29ae70]' : 'text-[#f25f54]'}`}>{feedback.correct ? t('tests.desktopCorrect') : t('tests.desktopIncorrect')}</h2><p data-figma-contrast-lock={feedback.correct ? 'question-feedback-correct-body' : undefined} className="mt-4 text-[16px] leading-4">{feedback.explanation ?? question.explanation}</p></section>}
          {actionError && <p role="alert" className="text-[#bc251a]">{t('tests.submitAnswerError')}</p>}
          <div className="mt-16 flex items-center justify-between"><button type="button" disabled={state.currentQuestionIndex === 0} onClick={onPrevious} className="flex h-12 items-center gap-2 rounded-[8px] text-[#39363f] outline-none transition-colors hover:bg-[#f8f5fc] focus-visible:ring-2 focus-visible:ring-[#6a37c3] disabled:invisible"><HugeiconsIcon icon={ArrowLeft01Icon} size={24} />{t('tests.desktopPrevious')}</button><button type="button" disabled={disabled} onClick={onPrimaryAction} className="h-12 rounded-[8px] bg-[#6a37c3] px-8 text-[16px] font-medium text-white outline-none transition-colors hover:bg-[#572d9f] focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:bg-[#f8f5fc] disabled:text-[#c5b1e7]">{primaryActionLabel ?? (checked ? t('tests.desktopNext') : t('tests.desktopCheckAnswer'))}</button></div>
        </main>
        <aside className="flex w-[384px] flex-col gap-4"><section className="h-[152px] rounded-[16px] bg-white px-8 pb-10 pt-8"><h2 className="text-[20px] font-medium">{t('tests.desktopCurrentProgress')}</h2><p className="mt-4 text-[16px] text-[#6e6779]">{t('tests.desktopAnsweredProgress', { answered, total: questions.length })}</p><div className="mt-4 h-3 overflow-hidden rounded-[8px] bg-[rgba(106,55,195,.25)]"><div className="h-full rounded-[8px] bg-[#6a37c3]" style={{ width: `${questions.length ? answered / questions.length * 100 : 0}%` }} /></div></section>
          <section className={`flex flex-col justify-between rounded-[16px] bg-white px-8 pb-10 pt-8 ${checked ? 'h-[467px]' : 'h-[344px]'}`}><div><h2 className="text-[20px] font-medium">{t('tests.desktopQuestions')}</h2><div className="mt-4 grid grid-cols-5 gap-2">{questions.map((item, index) => { const status = getQuestionStatus(state, item.id, index); const contrastLock = status === 'current' ? undefined : `question-status-${status}`; const statusLabel = t(`tests.desktopQuestionStatus${status[0].toUpperCase()}${status.slice(1)}`); return <button key={item.id} type="button" data-figma-contrast-lock={contrastLock} aria-current={status === 'current' ? 'step' : undefined} aria-label={t('tests.desktopQuestionStatusLabel', { number: index + 1, status: statusLabel })} onClick={() => onGoToQuestion(index)} className={`h-8 rounded-[4px] text-[16px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6a37c3] ${status === 'current' ? 'bg-[#6a37c3] text-white hover:bg-[#572d9f]' : status === 'answered' ? 'bg-[#efeaf8] text-[#865bcf] hover:bg-[#ded2f1]' : 'bg-[#f8f5fc] text-[#c5b1e7] hover:bg-[#efeaf8]'}`}>{index + 1}</button>; })}</div></div><button type="button" data-figma-contrast-lock="question-finish-early" disabled={submitting || state.resultVisible} onClick={onFinishEarly} className="h-12 w-full rounded-[8px] bg-[#f8f5fc] text-[#865bcf] outline-none transition-colors hover:bg-[#efeaf8] focus-visible:ring-2 focus-visible:ring-[#6a37c3] disabled:text-[#c5b1e7]">{t('tests.desktopFinishEarly')}</button></section>
        </aside>
      </div>
    </div>
  );
}
