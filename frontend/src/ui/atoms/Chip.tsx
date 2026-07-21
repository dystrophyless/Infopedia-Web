import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

type ChipTone = 'neutral' | 'brand' | 'success' | 'danger';

const toneClasses: Record<ChipTone, string> = {
  neutral: 'bg-surface text-muted',
  brand: 'bg-primary text-surface',
  success: 'bg-success-surface text-success',
  danger: 'bg-danger-surface text-danger',
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  selected?: boolean;
  children: ReactNode;
}

export function Chip({ tone = 'neutral', selected = false, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center rounded-[var(--radius-control)] px-3 text-[var(--type-helper-size)] font-medium leading-none',
        toneClasses[tone],
        selected && 'bg-accent text-surface',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
