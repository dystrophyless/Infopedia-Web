import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'surface';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:opacity-90',
  secondary: 'bg-transparent text-accent hover:bg-surface/60',
  danger: 'bg-danger-accent text-surface hover:opacity-90',
  ghost: 'bg-transparent text-muted hover:text-accent',
  surface: 'bg-surface text-text hover:bg-bg',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[var(--control-height-sm)] px-4 text-[var(--type-helper-size)]',
  md: 'min-h-[var(--control-height-md)] px-5 text-[var(--type-body-size)]',
  lg: 'min-h-[var(--control-height-lg)] px-6 text-[var(--type-body-size)]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium leading-none outline-none transition-[color,background-color,border-color,opacity] duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="shrink-0" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
