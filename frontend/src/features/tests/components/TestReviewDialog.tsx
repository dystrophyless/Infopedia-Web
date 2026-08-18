import { useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Flag02Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import type { TestAnswerFeedback, TestQuestion } from '../../../api/tests';
import { Dialog } from '../../../ui';
import { getOptionTone } from '../model';
import { DesktopTestAnswerOption } from './DesktopTestAnswerOption';

export function TestReviewDialog({ open, question, questionNumber, totalQuestions, feedback, onDismiss }: { open: boolean; question: TestQuestion | null; questionNumber: number; totalQuestions: number; feedback: TestAnswerFeedback | null; onDismiss: () => void }) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  if (!question) return null;
  return <Dialog id="test-review-dialog" open={open} onDismiss={onDismiss} titleId="test-review-title" initialFocusRef={closeRef} overlayClassName="!items-start !bg-[rgba(22,21,25,.25)] !p-0 !pt-[499px]" className="h-[515px] !w-[656px] max-w-[calc(100vw-32px)] overflow-hidden !rounded-[16px] bg-white p-8">
    <div className="flex items-start gap-8"><div className="min-w-0 flex-1"><p data-figma-contrast-lock="review-meta" className="text-[16px] font-medium leading-4 text-[#c5b1e7]">{t('tests.desktopQuestionProgress', { current: questionNumber, total: totalQuestions })}</p><h2 id="test-review-title" className="mt-4 text-[20px] font-medium leading-5 text-[#161519]">{question.prompt}</h2></div><button ref={closeRef} type="button" onClick={onDismiss} aria-label={t('tests.desktopCloseReview')} className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[#6e6779] outline-none transition-colors hover:bg-[#f8f5fc] focus-visible:ring-2 focus-visible:ring-[#6a37c3]"><HugeiconsIcon icon={Flag02Icon} size={24} /></button></div>
    <div className="mt-10 flex flex-col gap-2">{question.options.map(option => <DesktopTestAnswerOption key={option.id} option={option} locked tone={getOptionTone({ optionId: option.id, selectedOptionId: feedback?.optionId ?? null, checkedOptionId: feedback?.optionId ?? null, correctOptionRef: feedback?.correctOptionRef, answerCorrect: feedback?.correct })} onSelect={() => undefined} />)}</div>
    {feedback && <section className={`mt-6 min-h-[99px] rounded-[8px] px-6 py-4 ${feedback.correct ? 'bg-[#e7f8f0] text-[#21835a]' : 'bg-[#fce5e3] text-[#9a2219]'}`}><h3 data-figma-contrast-lock={feedback.correct ? undefined : 'review-feedback-wrong-title'} className={`text-[18px] font-medium leading-[18px] ${feedback.correct ? 'text-[#29ae70]' : 'text-[#f25f54]'}`}>{feedback.correct ? t('tests.desktopCorrect') : t('tests.desktopIncorrect')}</h3><p className="mt-4 text-[16px] leading-4">{feedback.explanation ?? question.explanation}</p></section>}
  </Dialog>;
}
