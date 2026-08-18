import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type TextareaVariant = 'outlined' | 'surface';
export type TextareaPlaceholderTone = 'accessible' | 'reference';

const variantClasses: Record<TextareaVariant, string> = {
  outlined: 'border-border bg-surface focus-visible:border-focus',
  surface: 'border-transparent bg-surface-subtle focus-visible:border-border-interactive',
};

const placeholderClasses: Record<TextareaPlaceholderTone, string> = {
  accessible: 'placeholder:text-muted',
  reference: 'placeholder:text-placeholder',
};

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  variant?: TextareaVariant;
  placeholderTone?: TextareaPlaceholderTone;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      invalid = false,
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
      <textarea
        {...props}
        ref={ref}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'min-h-[120px] w-full resize-y rounded-control border px-4 py-3 text-body leading-none text-text outline-none transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
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

Textarea.displayName = 'Textarea';
