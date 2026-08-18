import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import type { TestQuestionOption } from '../../../api/tests';
import type { OptionTone } from '../model';

export function DesktopTestAnswerOption({ option, tone, locked, onSelect }: { option: TestQuestionOption; tone: OptionTone; locked: boolean; onSelect: (id: string) => void }) {
  const active = tone === 'selected' || tone === 'correct' || tone === 'incorrect';
  const colors = tone === 'correct' ? 'border-[#29ae70]' : tone === 'incorrect' ? 'border-[#e73023]' : active ? 'border-[#6a37c3] hover:bg-[#f8f5fc]' : 'border-[#efeaf8] hover:border-[#c5b1e7]';
  const marker = tone === 'correct' ? 'bg-[#29ae70] text-white' : tone === 'incorrect' ? 'bg-[#e73023] text-white' : active ? 'bg-[#6a37c3] text-white' : 'bg-[#efeaf8] text-[#c5b1e7]';
  return (
    <button type="button" aria-pressed={active} disabled={locked} onClick={() => onSelect(option.id)} className={`flex h-12 w-full items-center justify-between overflow-hidden rounded-[8px] border bg-white pr-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-100 ${colors}`}>
      <span className="flex h-full items-center gap-4"><span className={`flex size-12 items-center justify-center text-[16px] font-medium ${marker}`}>{option.label}</span><span className="text-[16px] text-[#161519]">{option.text}</span></span>
      <span className={`flex size-5 items-center justify-center rounded-full border ${active ? `${marker} border-transparent` : 'border-[#c5b1e7]'}`}>
        {active && <HugeiconsIcon icon={tone === 'incorrect' ? Cancel01Icon : Tick02Icon} size={12} strokeWidth={2} />}
      </span>
    </button>
  );
}
