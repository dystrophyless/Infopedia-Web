import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { TestQuestion } from '../../../api/tests';
import { Button, MobileAppBar, Progress } from '../../../ui';
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
  checked: boolean;
  checkDisabled: boolean;
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
  checked,
  checkDisabled,
  onBack,
  onSelectOption,
  onPrimaryAction,
}: TestQuestionViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 py-12 md:flex md:justify-center max-md:min-h-[calc(100dvh-88px)] max-md:px-6 max-md:pb-12 max-md:pt-[var(--mobile-page-app-bar-offset)]">
      <main className="test-question-content mx-auto flex w-full max-w-[382px] flex-col md:min-h-[720px] max-md:min-h-[calc(100dvh-200px)]">
        <MobileAppBar
          title={title}
          titleAlign="start"
          size="compact"
          compactLayout="leading-only"
          safeArea={false}
          className="test-question-mobile-header h-14 w-full px-4 text-[#252329] max-md:-mx-6 max-md:w-[calc(100%+48px)] md:px-0"
          leading={(
            <button type="button" className="flex size-6 items-center justify-center text-[#252329]" aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })} onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
          )}
        />

        <Progress
          value={progressPercent}
          aria-label={t('tests.questionProgress', { defaultValue: 'Прогресс теста' })}
          className="test-question-progress mt-4 !h-2 !bg-[rgba(106,55,195,0.25)] [&>span]:!bg-[#6a37c3]"
        />

        <section className="mt-6 rounded-[8px] bg-[#6a37c3] p-6 text-[#f8f5fc]">
          <p className="text-[12px] font-medium leading-3 text-[#c5b1e7]">
            {t('tests.questionCounter', {
              current: currentQuestionIndex + 1,
              total: totalQuestions,
              defaultValue: 'Вопрос {{current}} из {{total}}',
            })}
          </p>
          <p className="mt-2 text-[#f8f5fc] text-[16px] font-medium leading-4">{question.prompt}</p>
        </section>

        <fieldset className="mt-6 flex flex-col gap-2">
          <legend className="sr-only leading-none">{t('tests.answerOptions', { defaultValue: 'Варианты ответа' })}</legend>
          {question.options.map((option) => {
            const selected = option.id === selectedOptionId;
            const optionTone = getOptionTone({
              optionId: option.id,
              correctOptionId: question.correctOptionId,
              selectedOptionId,
              checkedOptionId,
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

        {checked && (
          <section className="mt-8 rounded-[8px] bg-[#a4e5c7] px-6 py-4">
            <h2 className="text-[12px] font-medium leading-3 text-[#22915d]">
              {t('tests.explanationTitle', { defaultValue: 'Объяснение' })}
            </h2>
            <p className="mt-2 max-w-[280px] text-[14px] font-medium leading-[14px] text-[#1a6140]">
              {question.explanation}
            </p>
          </section>
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
              ? t('tests.nextQuestionButton', { defaultValue: 'Далее' })
              : t('tests.checkAnswerButton', { defaultValue: 'Проверить' })}
          </Button>
        </div>
      </main>
    </div>
  );
}
