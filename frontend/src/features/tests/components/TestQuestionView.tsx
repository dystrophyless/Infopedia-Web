import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { TestAnswerFeedback, TestQuestion } from '../../../api/tests';
import { Button, MobilePinnedAppBar, Progress } from '../../../ui';
import { getOptionTone } from '../model';
import { TestAnswerOption } from './TestAnswerOption';

export interface TestQuestionViewProps {
  title: string;
  question: TestQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  progressPercent: number;
  selectedOptionId: string | null;
  checkedOptionId: string | null;
  answerFeedback: TestAnswerFeedback | null;
  checked: boolean;
  checkDisabled: boolean;
  actionError?: boolean;
  onBack: () => void;
  onSelectOption: (optionId: string) => void;
  onPrimaryAction: () => void;
}

export function TestQuestionView({
  title,
  question,
  currentQuestionIndex,
  totalQuestions,
  progressPercent,
  selectedOptionId,
  checkedOptionId,
  answerFeedback,
  checked,
  checkDisabled,
  actionError = false,
  onBack,
  onSelectOption,
  onPrimaryAction,
}: TestQuestionViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 md:py-12 md:flex md:justify-center max-md:min-h-[var(--mobile-page-available-height,100dvh)] max-md:px-6 max-md:pb-12 max-md:pt-0">
      <main className="test-question-content mx-auto flex w-full max-w-[382px] flex-col md:max-w-[720px] md:min-h-[720px] max-md:min-h-[calc(100dvh-200px)]">
        <MobilePinnedAppBar
          title={title}
          titleAlign="start"
          compactLayout="leading-only"
          leading={(
            <button type="button" className="flex size-11 items-center justify-center text-[#252329]" aria-label={t('tests.backToTests', { defaultValue: 'РќР°Р·Р°Рґ Рє С‚РµСЃС‚Р°Рј' })} onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
          )}
        />

        <Progress
          value={progressPercent}
          aria-label={t('tests.questionProgress', { defaultValue: 'РџСЂРѕРіСЂРµСЃСЃ С‚РµСЃС‚Р°' })}
          className="test-question-progress mt-4 !h-2 !bg-[rgba(106,55,195,0.25)] [&>span]:!bg-[#6a37c3]"
        />

        <section className="mt-6 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc] md:p-8">
          <p className="text-[12px] font-medium leading-3 text-[#c5b1e7]">
            {t('tests.questionCounter', {
              current: currentQuestionIndex + 1,
              total: totalQuestions,
              defaultValue: 'Р’РѕРїСЂРѕСЃ {{current}} РёР· {{total}}',
            })}
          </p>
          <p className="mt-2 text-[#f8f5fc] text-[16px] font-medium leading-4">{question.prompt}</p>
        </section>

        <fieldset className="mt-6 grid gap-2 md:grid-cols-2">
          <legend className="sr-only leading-none">{t('tests.answerOptions', { defaultValue: 'Р’Р°СЂРёР°РЅС‚С‹ РѕС‚РІРµС‚Р°' })}</legend>
          {question.options.map((option) => {
            const selected = option.id === selectedOptionId;
            const optionTone = getOptionTone({
              optionId: option.id,
              selectedOptionId,
              checkedOptionId,
              correctOptionRef: answerFeedback?.correctOptionRef,
              answerCorrect: answerFeedback?.correct,
            });

            return (
              <TestAnswerOption
                key={option.id}
                option={option}
                tone={optionTone}
                selected={selected}
                locked={checked}
                onSelect={onSelectOption}
              />
            );
          })}
        </fieldset>

        {checked && answerFeedback && (
          <section className="mt-8 rounded-[8px] bg-[#a4e5c7] px-6 py-4">
            <h2 className="text-[12px] font-medium leading-3 text-[#22915d]">
              {t('tests.explanationTitle', { defaultValue: 'РћР±СЉСЏСЃРЅРµРЅРёРµ' })}
            </h2>
            <p className="mt-2 max-w-[280px] text-[14px] font-medium leading-[14px] text-[#1a6140]">
              {answerFeedback.explanation ?? question.explanation}
            </p>
          </section>
        )}

        {actionError && (
          <p role="alert" className="mt-4 text-[13px] font-medium leading-[13px] text-[#bc251a]">
            {t('tests.submitAnswerError', { defaultValue: 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РѕС‚РІРµС‚. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.' })}
          </p>
        )}

        <div className="mt-auto pt-8">
          <Button
            fullWidth
            size="lg"
            className={`h-12 rounded-[8px] px-6 !text-[16px] !leading-4 ${
              checkDisabled
                ? '!bg-[#ded2f1] !text-[#a585db] disabled:!opacity-100'
                : '!bg-[#6a37c3] !text-[#f8f5fc] hover:!bg-[#6a37c3] hover:!opacity-100'
            }`}
            disabled={checkDisabled}
            onClick={onPrimaryAction}
          >
            {checked
              ? t('tests.nextQuestionButton', { defaultValue: 'Р”Р°Р»РµРµ' })
              : t('tests.checkAnswerButton', { defaultValue: 'РџСЂРѕРІРµСЂРёС‚СЊ' })}
          </Button>
        </div>
      </main>
    </div>
  );
}
