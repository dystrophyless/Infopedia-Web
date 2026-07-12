import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type IconButtonVariant = 'ghost' | 'surface' | 'primary';
export type IconButtonSize = 'sm' | 'md' | 'lg';

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

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string };

type IconButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-labelledby' | 'children'
> & {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
};

export type IconButtonProps = IconButtonBaseProps & AccessibleName;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', className, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] outline-none transition-colors duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex items-center justify-center">
        {children}
      </span>
    </button>
  ),
);

IconButton.displayName = 'IconButton';
