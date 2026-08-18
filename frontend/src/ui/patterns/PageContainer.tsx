import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type PageContainerElement = 'div' | 'main' | 'section';
export type PageContainerWidth = 'narrow' | 'content' | 'wide' | 'shell' | 'full';
export type PageContainerGutter = 'none' | 'mobile' | 'responsive';

export interface PageContainerProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: PageContainerElement;
  width?: PageContainerWidth;
  gutter?: PageContainerGutter;
  safeArea?: boolean;
  children: ReactNode;
}

const widthClasses: Record<PageContainerWidth, string> = {
  narrow: 'max-w-[560px]',
  content: 'max-w-[760px]',
  wide: 'max-w-[960px]',
  shell: 'max-w-shell-content',
  full: 'max-w-none',
};

const gutterClasses: Record<PageContainerGutter, string> = {
  none: '',
  mobile: 'px-[var(--space-page-inline-mobile)]',
  responsive: 'px-[var(--space-page-inline-mobile)] lg:px-ui-10',
};

export function PageContainer({
  as: Component = 'div',
  width = 'shell',
  gutter = 'responsive',
  safeArea = false,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Component
      {...props}
      className={cn(
        'mx-auto w-full',
        widthClasses[width],
        gutterClasses[gutter],
        safeArea &&
          'pl-[max(var(--space-page-inline-mobile),env(safe-area-inset-left))] pr-[max(var(--space-page-inline-mobile),env(safe-area-inset-right))]',
        className,
      )}
    >
      {children}
    </Component>
  );
}
