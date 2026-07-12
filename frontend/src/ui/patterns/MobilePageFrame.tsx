import { type HTMLAttributes, type ReactNode } from 'react';
import { Surface } from '../atoms';
import { cn } from '../utils/cn';

export type MobilePageFrameTone = 'canvas' | 'surface';
export type MobilePageFrameScrollMode = 'document' | 'content';

export interface MobilePageFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  appBar?: ReactNode;
  footer?: ReactNode;
  contentId?: string;
  contentLabel?: string;
  tone?: MobilePageFrameTone;
  scrollMode?: MobilePageFrameScrollMode;
  safeAreaBottom?: boolean;
  contentClassName?: string;
  footerClassName?: string;
  children: ReactNode;
}

export function MobilePageFrame({
  appBar,
  footer,
  contentId,
  contentLabel,
  tone = 'canvas',
  scrollMode = 'document',
  safeAreaBottom = true,
  contentClassName,
  footerClassName,
  className,
  children,
  ...props
}: MobilePageFrameProps) {
  return (
    <Surface
      {...props}
      tone={tone === 'canvas' ? 'canvas' : 'plain'}
      variant="mobile-flat"
      className={cn(
        'flex min-h-dvh w-full flex-col overflow-x-hidden',
        scrollMode === 'content' && 'h-dvh overflow-y-hidden',
        className,
      )}
    >
      {appBar}
      <main
        id={contentId}
        aria-label={contentLabel}
        className={cn(
          'min-w-0 flex-1',
          scrollMode === 'content' && 'min-h-0 overflow-y-auto overscroll-contain',
          contentClassName,
        )}
      >
        {children}
      </main>
      {footer && (
        <footer
          className={cn(
            'shrink-0',
            safeAreaBottom && 'pb-[env(safe-area-inset-bottom)]',
            footerClassName,
          )}
        >
          {footer}
        </footer>
      )}
    </Surface>
  );
}
