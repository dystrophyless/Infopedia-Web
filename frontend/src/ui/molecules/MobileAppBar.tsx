import { type ReactNode, useId } from 'react';
import { Heading } from '../atoms';
import { cn } from '../utils/cn';

export type MobileAppBarTone = 'transparent' | 'surface' | 'canvas';
export type MobileAppBarTitleAlign = 'center' | 'start';
export type MobileAppBarSize = 'standard' | 'compact';
export type MobileAppBarCompactLayout = 'balanced' | 'leading-only';

export interface MobileAppBarProps {
  title: ReactNode;
  titleId?: string;
  headingLevel?: 1 | 2;
  leading?: ReactNode;
  trailing?: ReactNode;
  tone?: MobileAppBarTone;
  titleAlign?: MobileAppBarTitleAlign;
  size?: MobileAppBarSize;
  compactLayout?: MobileAppBarCompactLayout;
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
  size = 'standard',
  compactLayout = 'balanced',
  sticky = false,
  bordered = false,
  safeArea = true,
  className,
}: MobileAppBarProps) {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? `${generatedId}-title`;
  const compactLeadingOnly = size === 'compact' && compactLayout === 'leading-only' && leading != null && trailing == null;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className={cn(
        size === 'standard'
          ? 'grid min-h-14 h-14 grid-cols-[var(--control-height-sm)_minmax(0,1fr)_var(--control-height-sm)] items-center gap-2 px-2'
          : compactLeadingOnly
            ? 'grid h-6 min-h-6 grid-cols-[24px_minmax(0,1fr)] items-center gap-4 overflow-visible px-2'
            : 'grid h-6 min-h-6 grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 overflow-visible px-2',
        toneClasses[tone],
        size === 'standard' && titleAlign === 'start' && 'grid-cols-[auto_minmax(0,1fr)_auto]',
        sticky && 'sticky top-0 z-sticky',
        bordered && 'border-b border-border-subtle',
        safeArea && 'box-content',
        safeArea && 'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      <MobileAppBarActionSlot side="leading" compact={size === 'compact'}>
        {leading}
      </MobileAppBarActionSlot>
      <Heading
        id={resolvedTitleId}
        level={headingLevel}
        size="card"
        className={cn(
          'truncate',
          size === 'compact' && 'flex h-6 items-center',
          titleAlign === 'center' ? cn('text-center', size === 'compact' && 'justify-center') : 'text-left',
        )}
      >
        {title}
      </Heading>
      {!compactLeadingOnly && (
        <MobileAppBarActionSlot side="trailing" compact={size === 'compact'}>
          {trailing}
        </MobileAppBarActionSlot>
      )}
    </header>
  );
}

function MobileAppBarActionSlot({
  side,
  compact,
  children,
}: {
  side: 'leading' | 'trailing';
  compact: boolean;
  children: ReactNode;
}) {
  if (!compact) {
    return (
      <div className={cn('flex min-w-0 items-center', side === 'leading' ? 'justify-start' : 'justify-end')}>
        {children}
      </div>
    );
  }

  return (
    <div className="relative size-6 overflow-visible" data-mobile-app-bar-slot={side}>
      <div
        className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center [&>*]:flex [&>*]:min-h-11 [&>*]:min-w-11 [&>*]:items-center [&>*]:justify-center"
        data-mobile-app-bar-action-target={side}
      >
        {children}
      </div>
    </div>
  );
}
