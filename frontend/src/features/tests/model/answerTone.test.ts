import { describe, expect, it } from 'vitest';
import {
  getOptionBorderResetClass,
  getOptionMarkerClass,
  getOptionRowClass,
  getOptionTone,
  type OptionTone,
} from './answerTone';

describe('test answer tone characterization', () => {
  it('shows a selected option before checking and locks correct/incorrect feedback after checking', () => {
    expect(
      getOptionTone({
        optionId: 'b',
        correctOptionId: 'b',
        selectedOptionId: 'b',
        checkedOptionId: null,
      }),
    ).toBe('selected');
    expect(
      getOptionTone({
        optionId: 'b',
        correctOptionId: 'b',
        selectedOptionId: 'a',
        checkedOptionId: 'a',
      }),
    ).toBe('correct');
    expect(
      getOptionTone({
        optionId: 'a',
        correctOptionId: 'b',
        selectedOptionId: 'a',
        checkedOptionId: 'a',
      }),
    ).toBe('incorrect');
    expect(
      getOptionTone({
        optionId: 'c',
        correctOptionId: 'b',
        selectedOptionId: 'a',
        checkedOptionId: 'a',
      }),
    ).toBe('neutral');
  });

  it.each<[OptionTone, string, string, string]>([
    ['neutral', 'border-[#ded2f1] bg-white', 'test-answer-option-neutral', 'bg-[#ded2f1] text-[#a585db]'],
    ['selected', 'border-[#6a37c3] bg-white', 'test-answer-option-selected', 'bg-[#6a37c3] text-[#f8f5fc]'],
    ['correct', 'border-[#29ae70] bg-white', 'test-answer-option-correct', 'bg-[#29ae70] text-[#f8f5fc]'],
    ['incorrect', 'border-[#bc251a] bg-white', 'test-answer-option-incorrect', 'bg-[#bc251a] text-white'],
  ])('preserves the %s visual class contract', (tone, row, borderReset, marker) => {
    expect(getOptionRowClass(tone)).toBe(row);
    expect(getOptionBorderResetClass(tone)).toBe(borderReset);
    expect(getOptionMarkerClass(tone)).toBe(marker);
  });
});
