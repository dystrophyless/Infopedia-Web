import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type SwitchSize = 'sm' | 'md';

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string };

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'aria-label' | 'aria-labelledby'
> &
  AccessibleName & {
    size?: SwitchSize;
    containerClassName?: string;
  };

const trackSizeClasses: Record<SwitchSize, string> = {
  sm: 'h-5 w-9 p-0.5',
  md: 'h-6 w-11 p-0.5',
};

const thumbSizeClasses: Record<SwitchSize, string> = {
  sm: 'size-4 peer-checked:translate-x-4',
  md: 'size-5 peer-checked:translate-x-5',
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ size = 'md', className, containerClassName, disabled, ...props }, ref) => (
    <span className={cn('relative inline-flex shrink-0 align-middle', containerClassName)}>
      <input
        {...props}
        ref={ref}
        type="checkbox"
        role="switch"
        disabled={disabled}
        className={cn('peer sr-only', className)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-flex rounded-[var(--radius-pill)] bg-border-interactive transition-colors duration-fast ease-standard peer-checked:bg-action-selected peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface peer-disabled:opacity-60',
          trackSizeClasses[size],
        )}
      >
        <span
          className={cn(
            'rounded-full bg-surface shadow-sm transition-transform duration-fast ease-standard',
            thumbSizeClasses[size],
          )}
        />
      </span>
    </span>
  ),
);

Switch.displayName = 'Switch';
