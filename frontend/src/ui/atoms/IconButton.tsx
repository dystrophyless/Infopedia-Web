import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

type IconButtonVariant = 'ghost' | 'surface' | 'primary';
type IconButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-muted hover:bg-surface/60 hover:text-accent',
  surface: 'bg-surface text-accent hover:bg-bg',
  primary: 'bg-primary text-surface hover:opacity-90',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'size-9',
  md: 'size-10',
  lg: 'size-12',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', className, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
