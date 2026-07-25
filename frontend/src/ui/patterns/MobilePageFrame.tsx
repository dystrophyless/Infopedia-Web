import { isValidElement, type HTMLAttributes, type ReactNode } from 'react';
import { Surface } from '../atoms';
import { MobileAppBar, type MobileAppBarProps } from '../molecules';
import { cn } from '../utils/cn';

export type MobilePageFrameTone = 'canvas' | 'surface';
export type MobilePageFrameScrollMode = 'document' | 'content';

/** Canonical mobile header configuration. Geometry is owned by the frame. */
export type MobilePageFrameAppBarConfig = Omit<MobileAppBarProps, 'safeArea' | 'sticky' | 'className' | 'size'> & {
  visible?: boolean;
};

export interface MobilePageFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Prefer a structured config; ReactNode remains supported for migration. */
  appBar?: MobilePageFrameAppBarConfig | ReactNode;
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

function isAppBarConfig(appBar: MobilePageFrameProps['appBar']): appBar is MobilePageFrameAppBarConfig {
  return typeof appBar === 'object' && appBar !== null && !isValidElement(appBar) && 'title' in appBar;
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
  const appBarConfig = isAppBarConfig(appBar) ? appBar : undefined;
  const showCanonicalAppBar = Boolean(appBarConfig && appBarConfig.visible !== false);
  const legacyAppBar: ReactNode = appBarConfig ? undefined : (appBar as ReactNode);

  const { visible: _visible, ...canonicalAppBarProps } = appBarConfig ?? ({} as MobilePageFrameAppBarConfig);
  const frameHeightClass =
    scrollMode === 'content'
      ? 'h-[var(--mobile-page-available-height,100dvh)] min-h-[var(--mobile-page-available-height,100dvh)] overflow-y-hidden'
      : 'min-h-[var(--mobile-page-available-height,100dvh)]';

  return (
    <Surface
      {...props}
      data-mobile-page-frame
      tone={tone === 'canvas' ? 'canvas' : 'plain'}
      variant="mobile-flat"
      className={cn(
        'flex w-full flex-col overflow-x-hidden',
        frameHeightClass,
        className,
      )}
    >
      {showCanonicalAppBar && (
        <div className="pt-[var(--mobile-page-app-bar-offset)] md:hidden" data-mobile-page-app-bar-rail>
          <MobileAppBar {...canonicalAppBarProps} size="compact" safeArea={false} sticky={false} />
        </div>
      )}
      {legacyAppBar}
      <main
        id={contentId}
        aria-label={contentLabel}
        className={cn(
          'min-w-0 flex-1',
          showCanonicalAppBar && 'pt-8 md:pt-0',
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
