import { type ReactNode, useId } from 'react';
import { Heading } from '../atoms';
import { cn } from '../utils/cn';

export type MobileAppBarTone = 'transparent' | 'surface' | 'canvas';
export type MobileAppBarTitleAlign = 'center' | 'start';

export interface MobileAppBarProps {
  title: ReactNode;
  titleId?: string;
  headingLevel?: 1 | 2;
  leading?: ReactNode;
  trailing?: ReactNode;
  tone?: MobileAppBarTone;
  titleAlign?: MobileAppBarTitleAlign;
  sticky?: boolean;
  bordered?: boolean;
  safeArea?: boolean;
  className?: string;
}

const toneClasses: Record<MobileAppBarTone, string> = {
  transparent: 'bg-transparent',
  surface: 'bg-surface',
  canvas: 'bg-canvas',
};

export function MobileAppBar({
  title,
  titleId,
  headingLevel = 1,
  leading,
  trailing,
  tone = 'transparent',
  titleAlign = 'center',
  sticky = false,
  bordered = false,
  safeArea = true,
  className,
}: MobileAppBarProps) {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? `${generatedId}-title`;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className={cn(
        'grid min-h-14 grid-cols-[var(--control-height-sm)_minmax(0,1fr)_var(--control-height-sm)] items-center gap-2 px-2',
        toneClasses[tone],
        titleAlign === 'start' && 'grid-cols-[auto_minmax(0,1fr)_auto]',
        sticky && 'sticky top-0 z-sticky',
        bordered && 'border-b border-border-subtle',
        safeArea && 'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-start">{leading}</div>
      <Heading
        id={resolvedTitleId}
        level={headingLevel}
        size="card"
        className={cn('truncate', titleAlign === 'center' ? 'text-center' : 'text-left')}
      >
        {title}
      </Heading>
      <div className="flex min-w-0 items-center justify-end">{trailing}</div>
    </header>
  );
}
