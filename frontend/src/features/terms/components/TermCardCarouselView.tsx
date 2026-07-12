import { useEffect, useMemo, useRef } from 'react';
import type { FeaturedTerm } from '../../../types';
import { FeaturedTermCard, type FeaturedTermCardVariant } from './FeaturedTermCard';

export const FEATURED_TERMS_LIMIT = 10;
export const AUTO_SCROLL_PX_PER_SECOND = 46;

export interface TermCardCarouselViewProps {
  terms: FeaturedTerm[];
  loading?: boolean;
  variant?: FeaturedTermCardVariant;
}

const trackClasses: Record<FeaturedTermCardVariant, string> = {
  home: 'gap-2.5 pl-0 pr-4',
  guest: 'gap-4 pl-8 pr-8',
  guestDesktop: 'gap-6 px-[72px]',
  mobile: 'gap-3 pl-0 pr-[24vw]',
  desktop: 'gap-[45px] px-[48px] max-md:gap-4 max-md:px-4',
};

function LoadingCarousel({ variant }: { variant: FeaturedTermCardVariant }) {
  const shell = variant === 'home'
    ? 'h-[134px] w-[204px] rounded-[8px] border border-[#e8e1ee]'
    : variant === 'guest'
      ? 'h-[168px] w-[216px] rounded-[16px] border-0 bg-surface-subtle'
      : variant === 'guestDesktop'
        ? 'h-[220px] w-[320px] rounded-[20px] border-0 bg-surface-subtle'
        : variant === 'mobile'
          ? 'h-[238px] w-[76vw] rounded-[22px] border-0'
          : 'h-[325px] w-[min(612px,calc(100vw_-_96px))] rounded-[15px] border border-border/40 max-md:w-[88vw]';
  const gap = variant === 'home' ? 'gap-2.5' : variant === 'guest' ? 'gap-4' : variant === 'guestDesktop' ? 'gap-6' : variant === 'mobile' ? 'gap-3' : 'gap-[45px]';
  return (
    <div className={variant === 'desktop' ? 'overflow-hidden px-[48px] pb-6 pt-2 max-md:px-4' : 'overflow-hidden'} aria-busy="true">
      <div className={`flex ${gap}`}>
        {[0, 1, 2].map((key) => <div key={key} className={`flex-none animate-pulse bg-surface/70 ${shell}`} />)}
      </div>
    </div>
  );
}

export function TermCardCarouselView({ terms, loading = false, variant = 'desktop' }: TermCardCarouselViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const carouselTerms = useMemo(() => terms.slice(0, FEATURED_TERMS_LIMIT), [terms]);
  const shouldAutoScroll = variant === 'desktop' || variant === 'guest' || variant === 'guestDesktop';
  const displayTerms = useMemo(
    () => shouldAutoScroll && carouselTerms.length > 1 ? [...carouselTerms, ...carouselTerms] : carouselTerms,
    [carouselTerms, shouldAutoScroll],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!shouldAutoScroll || !node || carouselTerms.length < 2) return;
    const loopDistance =
      (node.querySelector<HTMLElement>('[data-carousel-item="clone-0"]')?.offsetLeft ?? node.scrollWidth / 2) -
      (node.querySelector<HTMLElement>('[data-carousel-item="orig-0"]')?.offsetLeft ?? 0);
    if (loopDistance <= 0) return;
    let frameId = 0;
    let lastTime = performance.now();
    const animate = (time: number) => {
      const elapsed = time - lastTime;
      lastTime = time;
      if (!pausedRef.current) {
        node.scrollLeft += (elapsed / 1000) * AUTO_SCROLL_PX_PER_SECOND;
        if (node.scrollLeft >= loopDistance) node.scrollLeft -= loopDistance;
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [carouselTerms, shouldAutoScroll]);

  if (loading) return <LoadingCarousel variant={variant} />;
  if (carouselTerms.length === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden ${variant === 'desktop' ? 'pt-2' : 'pt-0'}`}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
    >
      <div
        ref={scrollerRef}
        className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${variant === 'desktop' ? 'overflow-x-auto pb-6' : variant === 'guest' || variant === 'guestDesktop' ? 'overflow-hidden pb-0' : 'overflow-x-auto touch-pan-x snap-x snap-proximity overscroll-x-contain scroll-smooth pb-2'}`}
      >
        <ul className={`flex w-max ${trackClasses[variant]}`}>
          {displayTerms.map((featuredTerm, index) => {
            const clone = index >= carouselTerms.length;
            return (
              <li
                key={`${featuredTerm.term.public_id}-${featuredTerm.featured_definition.public_id}-${clone ? 'clone' : 'orig'}`}
                data-carousel-item={clone ? `clone-${index - carouselTerms.length}` : `orig-${index}`}
                className={`flex-none ${variant === 'mobile' || variant === 'guest' ? 'snap-start' : ''}`}
              >
                <FeaturedTermCard featuredTerm={featuredTerm} clone={clone} variant={variant} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
