import { isValidElement, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { Surface } from '../atoms';
import { type MobileAppBarProps } from '../molecules';
import { cn } from '../utils/cn';
import { PageHeader, type PageHeaderProps } from './PageHeader';
import { MobilePinnedAppBar } from './MobilePinnedAppBar';

export type MobilePageFrameTone = 'canvas' | 'surface';
export type MobilePageFrameScrollMode = 'document' | 'content';

export interface MobilePageFrameDesktopHeaderConfig
  extends Omit<PageHeaderProps, 'title' | 'titleId' | 'headingLevel'> {
  containerClassName?: string;
}

/** Canonical responsive header configuration. Mobile geometry is owned by the frame. */
export type MobilePageFrameAppBarConfig = Omit<MobileAppBarProps, 'safeArea' | 'sticky' | 'className' | 'size'> & {
  visible?: boolean;
  /** Opt in to an inline desktop PageHeader sourced from this config's title. */
  desktopHeader?: true | MobilePageFrameDesktopHeaderConfig;
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
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const appBarConfig = isAppBarConfig(appBar) ? appBar : undefined;
  const showCanonicalAppBar = Boolean(appBarConfig && appBarConfig.visible !== false);
  const legacyAppBar: ReactNode = appBarConfig ? undefined : (appBar as ReactNode);

  const { visible: _visible, desktopHeader, ...canonicalAppBarProps } = appBarConfig ?? ({} as MobilePageFrameAppBarConfig);
  const showDesktopHeader = Boolean(desktopHeader);
  const desktopHeaderConfig = desktopHeader === true ? {} : desktopHeader;
  const {
    containerClassName: desktopContainerClassName,
    className: desktopHeaderClassName,
    description: desktopDescription,
    actions: desktopActions,
    ...desktopPageHeaderProps
  } = desktopHeaderConfig ?? {};
  const frameHeightClass =
    scrollMode === 'content'
      ? 'h-[var(--mobile-page-available-height,100dvh)] min-h-[var(--mobile-page-available-height,100dvh)] md:h-auto md:min-h-0'
      : 'min-h-[var(--mobile-page-available-height,100dvh)] md:min-h-0';

  return (
    <Surface
      {...props}
      data-mobile-page-frame
      tone={tone === 'canvas' ? 'canvas' : 'plain'}
      variant="mobile-flat"
      className={cn(
        'flex w-full flex-col overflow-x-clip md:overflow-x-hidden',
        frameHeightClass,
        className,
      )}
    >
      <div
        ref={scrollViewportRef}
        data-mobile-page-scroll-viewport
        tabIndex={scrollMode === 'content' ? 0 : undefined}
        aria-label={scrollMode === 'content' ? contentLabel ?? 'Scrollable content' : undefined}
        className={cn(scrollMode === 'content' ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain md:overflow-y-visible' : 'contents')}
      >
        {showCanonicalAppBar && (
          <MobilePinnedAppBar
            {...canonicalAppBarProps}
            scrollRootRef={scrollMode === 'content' ? scrollViewportRef : undefined}
          />
        )}
        {legacyAppBar}
        <div
        data-desktop-page-container={showDesktopHeader ? '' : undefined}
        className={cn(
          'contents',
          showDesktopHeader &&
            'md:mx-auto md:flex md:w-full md:max-w-[1200px] md:flex-1 md:flex-col md:gap-8 md:px-6 md:py-10 lg:px-8',
          showDesktopHeader && desktopContainerClassName,
        )}
        >
        {showDesktopHeader && (
          <PageHeader
            {...desktopPageHeaderProps}
            title={canonicalAppBarProps.title}
            titleId={canonicalAppBarProps.titleId}
            headingLevel={canonicalAppBarProps.headingLevel}
            description={desktopDescription}
            actions={desktopActions}
            className={cn(
              'hidden md:flex [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:min-w-11',
              desktopHeaderClassName,
            )}
          />
        )}
        <main
          id={contentId}
          aria-label={contentLabel}
          className={cn(
            'min-w-0 flex-1',
            showCanonicalAppBar && 'pt-8 md:pt-0',
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
      </div>
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
