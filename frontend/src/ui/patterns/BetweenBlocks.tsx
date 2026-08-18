import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type BetweenBlocksProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  children: ReactNode;
  outcomeClassName?: string;
};

export function BetweenBlocks({
  children,
  outcomeClassName,
  className,
  ...props
}: BetweenBlocksProps) {
  return (
    <div
      {...props}
      data-between-blocks
      className={cn(
        'grid min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        className,
      )}
    >
      <div className={cn('row-start-2 min-w-0', outcomeClassName)}>{children}</div>
    </div>
  );
}
