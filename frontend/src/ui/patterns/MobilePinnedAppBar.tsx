import { useEffect, useRef, useState, type RefObject } from 'react';
import { MobileAppBar, type MobileAppBarProps } from '../molecules';
import { cn } from '../utils/cn';

export interface MobilePinnedAppBarProps
  extends Omit<MobileAppBarProps, 'tone' | 'size' | 'safeArea' | 'sticky' | 'className'> {
  scrollRootRef?: RefObject<HTMLElement | null>;
}

export function MobilePinnedAppBar({ scrollRootRef, ...appBarProps }: MobilePinnedAppBarProps) {
  const appBarSlotRef = useRef<HTMLDivElement>(null);
  const [appBarPinned, setAppBarPinned] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    let mediaQuery: MediaQueryList | undefined;

    const reset = () => {
      observer?.disconnect();
      observer = undefined;
      setAppBarPinned(false);
    };

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      reset();
      return reset;
    }

    mediaQuery = window.matchMedia('(max-width: 767px)');
    const engage = () => {
      reset();
      if (!mediaQuery?.matches || !appBarSlotRef.current) return;
      const root = scrollRootRef?.current ?? null;
      observer = new IntersectionObserver(
        ([entry]) => {
          const rootTop = root?.getBoundingClientRect().top ?? 0;
          setAppBarPinned(!entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop);
        },
        { root, threshold: [0, 1] },
      );
      observer.observe(appBarSlotRef.current);
    };

    engage();
    mediaQuery.addEventListener('change', engage);
    return () => {
      mediaQuery?.removeEventListener('change', engage);
      reset();
    };
  }, [scrollRootRef]);

  return (
    <div
      ref={appBarSlotRef}
      className="relative min-h-[calc(var(--mobile-page-app-bar-offset)+1.5rem)] pt-[var(--mobile-page-app-bar-offset)] md:hidden"
      data-mobile-page-app-bar-rail
    >
      <div
        className={cn(
          appBarPinned && 'fixed inset-x-0 top-0 z-sticky h-[120px] bg-surface pt-20 px-4 pb-4 border-b border-solid border-[rgb(213_211_217)] md:hidden',
          !appBarPinned && 'bg-transparent',
        )}
        data-mobile-page-app-bar-wrapper
      >
        <MobileAppBar {...appBarProps} tone="transparent" size="compact" safeArea={false} sticky={false} />
      </div>
    </div>
  );
}
