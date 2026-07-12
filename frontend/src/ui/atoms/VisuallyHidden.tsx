import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement>;

export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, ...props }, ref) => (
    <span {...props} ref={ref} className={cn('sr-only', className)} />
  ),
);

VisuallyHidden.displayName = 'VisuallyHidden';
