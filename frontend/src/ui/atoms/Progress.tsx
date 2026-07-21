import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressTone = 'brand' | 'success' | 'danger' | 'correct' | 'incorrect';

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string };

export type ProgressProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'aria-label' | 'aria-labelledby'
> &
  AccessibleName & {
    value: number;
    min?: number;
    max?: number;
    size?: ProgressSize;
    tone?: ProgressTone;
    valueText?: string;
    trackClassName?: string;
    indicatorClassName?: string;
  };

const sizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const toneClasses: Record<ProgressTone, string> = {
  brand: 'bg-action-selected',
  success: 'bg-success-accent',
  danger: 'bg-danger-accent',
  correct: 'bg-correct-accent',
  incorrect: 'bg-incorrect-accent',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      size = 'md',
      tone = 'brand',
      valueText,
      trackClassName,
      indicatorClassName,
      className,
      ...props
    },
    ref,
  ) => {
    const safeMax = max > min ? max : min + 1;
    const safeValue = clamp(value, min, safeMax);
    const percentage = ((safeValue - min) / (safeMax - min)) * 100;

    return (
      <div
        {...props}
        ref={ref}
        role="progressbar"
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={valueText}
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface-muted',
          sizeClasses[size],
          trackClassName,
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'block h-full rounded-[var(--radius-pill)] transition-[width] duration-base ease-standard motion-reduce:transition-none',
            toneClasses[tone],
            indicatorClassName,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);

Progress.displayName = 'Progress';
