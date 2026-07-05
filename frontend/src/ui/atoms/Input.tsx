import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid = false, className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-[var(--control-height-lg)] w-full rounded-[var(--radius-control)] border bg-surface px-4 text-[var(--type-body-size)] text-text outline-none transition-colors placeholder:text-muted',
        invalid ? 'auth-field-error border-danger focus:border-danger' : 'auth-field border-border focus:border-accent',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
