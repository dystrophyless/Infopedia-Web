import type { TestQuestionOption } from '../../../api/tests';
import {
  getOptionBorderResetClass,
  getOptionMarkerClass,
  getOptionRowClass,
  type OptionTone,
} from '../model';

export interface TestAnswerOptionProps {
  option: TestQuestionOption;
  tone: OptionTone;
  selected: boolean;
  locked: boolean;
  onSelect: (optionId: string) => void;
}

export function TestAnswerOption({
  option,
  tone,
  selected,
  locked,
  onSelect,
}: TestAnswerOptionProps) {
  return (
    <button
      type="button"
      className={`test-answer-option flex h-12 w-full items-center overflow-hidden rounded-[8px] border text-left transition-colors ${getOptionRowClass(tone)} ${getOptionBorderResetClass(tone)}`}
      aria-pressed={selected}
      aria-disabled={locked}
      onClick={() => {
        if (!locked) onSelect(option.id);
      }}
    >
      <span className={`flex h-full w-12 shrink-0 items-center justify-center text-[16px] font-medium leading-4 ${getOptionMarkerClass(tone)}`}>
        {option.label}
      </span>
      <span className="min-w-0 flex-1 truncate px-4 text-[14px] font-normal leading-[14px] text-[#161519]">
        {option.text}
      </span>
    </button>
  );
}
