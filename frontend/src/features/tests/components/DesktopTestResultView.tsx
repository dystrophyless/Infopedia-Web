import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { TestAnswerFeedback, TestCompletionSummary, TestQuestion } from '../../../api/tests';
import { DesktopTestAccuracyDelta } from './DesktopTestAccuracyDelta';
import { TestReviewDialog } from './TestReviewDialog';
import scoreRing from '../figma/assets/result-score-ring.svg';

const FIGMA_QUESTION_OVERVIEW_ORDER = [0, 1, 2, 3, 4, 8, 5, 6, 7, 9, 10, 11, 13, 12, 14];

export function getDesktopResultOverviewOrder(questionCount: number) {
  if (questionCount === FIGMA_QUESTION_OVERVIEW_ORDER.length) return [...FIGMA_QUESTION_OVERVIEW_ORDER];
  return Array.from({ length: questionCount }, (_, index) => index);
}

const formatTime = (t: TFunction, seconds: number) => t('tests.desktopDuration', {
  minutes: Math.floor(seconds / 60),
  seconds: seconds % 60,
});

export function DesktopTestResultView({ title, questions, feedbackByQuestionId, reviewFeedbackByQuestionId, summary, onBack, onRestart }: { title: string; questions: TestQuestion[]; feedbackByQuestionId: Record<string, TestAnswerFeedback>; reviewFeedbackByQuestionId?: Record<string, TestAnswerFeedback>; summary: TestCompletionSummary; onBack: () => void; onRestart: () => void }) {
  const { t } = useTranslation();
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const pacePercent = Math.min(100, summary.durationSeconds / (30 * 60) * 100);
  const score = Math.max(0, Math.min(100, summary.scorePercent));
  const overviewOrder = getDesktopResultOverviewOrder(questions.length);
  const accessibleTitle = title;
  return <div aria-label={accessibleTitle} className="hidden overflow-x-auto bg-[#efeaf8] py-20 md:block" style={{ minHeight: '100vh', paddingInline: 'max(0px, calc((100% - 1120px) / 2))' }} data-desktop-test-results>
    <header className="mb-8 flex items-center justify-between"><h1 className="text-[24px] font-medium">{t('tests.desktopResultsTitle')}</h1><button type="button" data-figma-contrast-lock="results-exit" onClick={onBack} className="h-12 rounded-[8px] bg-[#fdf2f1] px-8 text-[#f69a93] outline-none hover:bg-[#fce5e3] focus-visible:ring-2 focus-visible:ring-[#e73023]">{t('tests.desktopExit')}</button></header>
    <main className="flex flex-col gap-4">
      <div className="flex h-[204px] gap-4"><section className="flex w-[720px] items-start justify-between rounded-[16px] bg-white px-8 pb-10 pt-8"><div className="flex items-start gap-16"><div className="relative size-36 shrink-0"><img alt="" src={scoreRing} className="absolute inset-0 size-full" /><div className="absolute left-[39px] top-12 flex w-[67px] flex-col items-center text-center"><strong className="w-full text-[32px] font-medium leading-8">{score}%</strong><span data-figma-contrast-lock="results-score-fraction" className="w-full text-[16px] leading-4 text-[#8c8698]">{t('tests.desktopScoreFraction', { correct: summary.correctAnswerCount, total: summary.totalQuestions })}</span></div></div><div className="flex h-36 flex-col justify-center"><p data-figma-contrast-lock="results-score-eyebrow" className="text-[14px] tracking-[.7px] text-[#b1acb9]">{t('tests.desktopTestCompleted')}</p><h2 className="mt-2 text-[20px] font-medium">{score >= 70 ? t('tests.desktopGoodResult') : t('tests.desktopKeepPracticing')}</h2></div></div><DesktopTestAccuracyDelta deltaPoints={summary.accuracyDeltaPoints} /></section>
        <section className="flex flex-1 flex-col rounded-[16px] bg-white px-8 pb-10 pt-8"><h2 className="text-[20px] font-medium">{t('tests.desktopActions')}</h2><div className="mt-6 flex flex-col gap-2"><button type="button" onClick={onRestart} className="h-12 rounded-[8px] bg-[#6a37c3] text-white outline-none hover:bg-[#572d9f] focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2">{t('tests.desktopTryAgain')}</button><button type="button" data-figma-contrast-lock="results-secondary-action" onClick={onBack} className="h-12 rounded-[8px] bg-[#efeaf8] text-[#865bcf] outline-none hover:bg-[#ded2f1] focus-visible:ring-2 focus-visible:ring-[#6a37c3]">{t('tests.desktopReturnToTests')}</button></div></section></div>
      <section className="h-[186px] rounded-[16px] bg-white px-8 pb-10 pt-8"><h2 className="text-[20px] font-medium">{t('tests.desktopPace')}</h2><div className="relative mt-6 pt-7"><span className="absolute left-[69.7%] top-0 text-[14px]">{t('tests.desktopTimeLimit')}</span><div className="h-3 overflow-hidden rounded-[8px] bg-[rgba(106,55,195,.25)]"><div className="h-full rounded-[8px] bg-[#6a37c3]" style={{ width: `${pacePercent}%` }} /></div><span className="absolute left-[69.7%] top-[22px] h-6 w-[2px] bg-[#161519]" /></div><div className="mt-4 flex justify-between text-[16px]"><p><span data-figma-contrast-lock="results-pace-label" className="text-[#8c8698]">{t('tests.desktopYourPace')} </span><strong className="font-medium text-[#39363f]">{formatTime(t, summary.durationSeconds)}</strong></p><p><span data-figma-contrast-lock="results-pace-label" className="text-[#8c8698]">{t('tests.desktopEntTimeLimit')} </span><strong className="font-medium text-[#39363f]">{t('tests.desktopTimeLimit')}</strong></p></div></section>
      <section className="min-h-[388px] rounded-[16px] bg-white px-8 pb-10 pt-8"><h2 className="text-[20px] font-medium">{t('tests.desktopOverview')}</h2><div className="mt-6 grid grid-cols-5 gap-4">{overviewOrder.map((index) => { const question = questions[index]; const feedback = feedbackByQuestionId[question.id]; const unavailable = !feedback; const contrastLock = unavailable ? 'results-overview-unavailable' : feedback.correct ? 'results-overview-correct' : 'results-overview-wrong'; return <button key={question.id} type="button" data-figma-contrast-lock={contrastLock} onClick={() => setReviewIndex(index)} aria-label={t('tests.desktopOpenReview', { number: index + 1 })} className={`h-20 rounded-[4px] text-[20px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6a37c3] ${unavailable ? 'bg-[#f8f5fc] text-[#c5b1e7] hover:bg-[#efeaf8]' : feedback.correct ? 'bg-[#e7f8f0] text-[#6ed8a7] hover:bg-[#cbf0df]' : 'bg-[#fce5e3] text-[#f25f54] hover:bg-[#f8d5d2]'}`}>{index + 1}</button>; })}</div></section>
    </main>
    <TestReviewDialog open={reviewIndex !== null} question={reviewIndex === null ? null : questions[reviewIndex]} questionNumber={(reviewIndex ?? 0) + 1} totalQuestions={questions.length} feedback={reviewIndex === null ? null : (reviewFeedbackByQuestionId ?? feedbackByQuestionId)[questions[reviewIndex]?.id] ?? null} onDismiss={() => setReviewIndex(null)} />
  </div>;
}
