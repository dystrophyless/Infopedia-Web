import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      type="radio"
      className={cn(
        'size-5 shrink-0 border-border text-action-selected accent-action-selected outline-none transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  ),
);

Radio.displayName = 'Radio';
