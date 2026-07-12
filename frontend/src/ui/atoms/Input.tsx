import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outlined' | 'surface';
export type InputPlaceholderTone = 'accessible' | 'reference';

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-control-sm px-3 text-helper',
  md: 'h-control-md px-4 text-body',
  lg: 'h-control-lg px-4 text-body',
};

const variantClasses: Record<InputVariant, string> = {
  outlined: 'border-border bg-surface focus-visible:border-focus',
  surface: 'border-transparent bg-surface-subtle focus-visible:border-border-interactive',
};

const placeholderClasses: Record<InputPlaceholderTone, string> = {
  accessible: 'placeholder:text-muted',
  reference: 'placeholder:text-placeholder',
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  size?: InputSize;
  variant?: InputVariant;
  placeholderTone?: InputPlaceholderTone;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      invalid = false,
      size = 'lg',
      variant = 'outlined',
      placeholderTone = 'accessible',
      className,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';

    return (
      <input
        {...props}
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'w-full rounded-control border text-text outline-none transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
          sizeClasses[size],
          variantClasses[variant],
          placeholderClasses[placeholderTone],
          isInvalid
            ? 'border-danger-accent focus-visible:border-danger-accent focus-visible:ring-danger-accent/20'
            : undefined,
          className,
        )}
      />
    );
  },
);

Input.displayName = 'Input';
