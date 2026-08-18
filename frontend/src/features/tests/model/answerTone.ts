export type OptionTone = 'neutral' | 'selected' | 'correct' | 'incorrect';

type OptionToneInput = {
  optionId: string;
  selectedOptionId: string | null;
  checkedOptionId: string | null;
  correctOptionRef?: string;
  answerCorrect?: boolean;
};

export function getOptionTone({
  optionId,
  selectedOptionId,
  checkedOptionId,
  correctOptionRef,
  answerCorrect,
}: OptionToneInput): OptionTone {
  if (checkedOptionId !== null) {
    if (correctOptionRef && optionId === correctOptionRef) return 'correct';
    if (optionId === checkedOptionId) return answerCorrect ? 'correct' : 'incorrect';
    return 'neutral';
  }

  if (optionId === selectedOptionId) return 'selected';
  return 'neutral';
}

export function getOptionRowClass(tone: OptionTone): string {
  if (tone === 'correct') return 'border-[#29ae70] bg-white';
  if (tone === 'incorrect') return 'border-[#bc251a] bg-white';

  const selected = tone === 'selected';
  return selected ? 'border-[#6a37c3] bg-white' : 'border-[#ded2f1] bg-white';
}

export function getOptionBorderResetClass(tone: OptionTone): string {
  if (tone === 'correct') return 'test-answer-option-correct';
  if (tone === 'incorrect') return 'test-answer-option-incorrect';
  if (tone === 'selected') return 'test-answer-option-selected';
  return 'test-answer-option-neutral';
}

export function getOptionMarkerClass(tone: OptionTone): string {
  if (tone === 'correct') return 'bg-[#29ae70] text-[#f8f5fc]';
  if (tone === 'incorrect') return 'bg-[#bc251a] text-white';

  const selected = tone === 'selected';
  return selected ? 'bg-[#6a37c3] text-[#f8f5fc]' : 'bg-[#ded2f1] text-[#a585db]';
}
