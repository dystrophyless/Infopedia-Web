import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn('border-0 border-t border-border/30', className)} {...props} />;
}
