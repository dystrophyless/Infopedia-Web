import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <span
      {...props}
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    >
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
