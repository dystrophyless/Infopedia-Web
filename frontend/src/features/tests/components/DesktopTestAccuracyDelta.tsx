import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown02Icon, ArrowUp02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { TFunction } from 'i18next';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function getAccuracyDeltaCopy(t: TFunction, deltaPoints: number | null | undefined) {
  const available = typeof deltaPoints === 'number';
  const positive = available && deltaPoints > 0;
  const label = available ? `${positive ? '+' : ''}${deltaPoints}%` : '—';
  const explanation = t('tests.desktopAccuracyDeltaExplanation');
  return {
    label,
    explanation,
    ariaLabel: t('tests.desktopAccuracyDeltaAriaLabel', { value: label, explanation }),
  };
}

export function DesktopTestAccuracyDelta({ deltaPoints }: { deltaPoints: number | null | undefined }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const available = typeof deltaPoints === 'number';
  const positive = available && deltaPoints > 0;
  const negative = available && deltaPoints < 0;
  const { label, explanation, ariaLabel } = getAccuracyDeltaCopy(t, deltaPoints);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        data-figma-contrast-lock={positive ? 'results-delta' : undefined}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={ariaLabel}
        className={`inline-flex h-7 items-center gap-1 rounded-[16px] px-4 text-[16px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2 ${positive ? 'bg-[#cbf0df] text-[#29ae70] hover:bg-[#bcebd5]' : negative ? 'bg-[#fce5e3] text-[#e73023] hover:bg-[#f8d5d2]' : 'bg-[#f8f5fc] text-[#8c8698] hover:bg-[#efeaf8]'}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {positive && <HugeiconsIcon icon={ArrowUp02Icon} size={20} strokeWidth={1.8} />}
        {negative && <HugeiconsIcon icon={ArrowDown02Icon} size={20} strokeWidth={1.8} />}
        {!available && <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.8} />}
        {label}
      </button>
      {open && (
        <span id={tooltipId} role="tooltip" className="absolute right-0 top-9 z-20 w-64 rounded-[8px] bg-[#161519] px-3 py-2 text-left text-[13px] font-normal leading-[13px] text-white">
          {explanation}
        </span>
      )}
    </span>
  );
}
