import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeaturedTerm } from '../../../types';
import { FeaturedTermCard, type FeaturedTermCardVariant } from './FeaturedTermCard';

export const FEATURED_TERMS_LIMIT = 10;
export const AUTO_SCROLL_PX_PER_SECOND = 46;

export interface TermCardCarouselViewProps {
  terms: FeaturedTerm[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  variant?: FeaturedTermCardVariant;
}

const trackClasses: Record<FeaturedTermCardVariant, string> = {
  home: 'gap-2.5 pl-0 pr-4',
  guest: 'gap-4 pl-8 pr-8',
  guestDesktop: 'gap-6 px-[72px]',
  guestLanding: 'gap-6 px-0',
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
        : variant === 'guestLanding'
          ? 'h-[168px] w-[262px] rounded-[16px] border-0 bg-white'
        : variant === 'mobile'
          ? 'h-[238px] w-[76vw] rounded-[22px] border-0'
          : 'h-[325px] w-[min(612px,calc(100vw_-_96px))] rounded-[15px] border border-border/40 max-md:w-[88vw]';
  const gap = variant === 'home' ? 'gap-2.5' : variant === 'guest' ? 'gap-4' : variant === 'guestDesktop' || variant === 'guestLanding' ? 'gap-6' : variant === 'mobile' ? 'gap-3' : 'gap-[45px]';
  return (
    <div className={variant === 'desktop' ? 'overflow-hidden rounded-[16px] px-[48px] pb-6 pt-2 max-md:px-4' : 'overflow-hidden rounded-[16px]'} aria-busy="true">
      <div className={`flex ${gap}`}>
        {[0, 1, 2].map((key) => <div key={key} className={`flex-none animate-pulse bg-surface/70 ${shell}`} />)}
      </div>
    </div>
  );
}

function EmptyCarousel({ variant }: { variant: FeaturedTermCardVariant }) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex min-h-[120px] w-full items-center justify-center overflow-hidden rounded-[16px] px-6 py-8 text-center text-[14px] leading-[14px] text-muted ${variant === 'guestDesktop' ? 'min-h-[220px]' : variant === 'guestLanding' ? 'min-h-[168px]' : ''}`}
      role="status"
    >
      {t('terms.noFeatured', { defaultValue: 'Избранных терминов пока нет' })}
    </div>
  );
}

function ErrorCarousel({ variant, onRetry }: { variant: FeaturedTermCardVariant; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex min-h-[120px] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[16px] px-6 py-8 text-center text-[14px] leading-[14px] text-muted ${variant === 'guestDesktop' ? 'min-h-[220px]' : variant === 'guestLanding' ? 'min-h-[168px]' : ''}`}
      role="alert"
    >
      <p>{t('terms.featuredError', { defaultValue: 'Не удалось загрузить термины' })}</p>
      <button
        type="button"
        className="rounded-[8px] px-3 py-2 font-medium text-[#6a37c3] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
        onClick={onRetry}
      >
        {t('common.retry', { defaultValue: 'Повторить' })}
      </button>
    </div>
  );
}

export function TermCardCarouselView({ terms, loading = false, error = false, onRetry, variant = 'desktop' }: TermCardCarouselViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const carouselTerms = useMemo(() => terms.slice(0, FEATURED_TERMS_LIMIT), [terms]);
  const shouldAutoScroll = variant === 'desktop' || variant === 'guest' || variant === 'guestDesktop' || variant === 'guestLanding';
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
    let logicalScrollLeft = node.scrollLeft;
    let committedScrollLeft = node.scrollLeft;
    const animate = (time: number) => {
      const elapsed = time - lastTime;
      lastTime = time;
      if (pointerPausedRef.current || focusPausedRef.current) {
        frameId = requestAnimationFrame(animate);
        return;
      }
      const observedScrollLeft = node.scrollLeft;
      if (observedScrollLeft !== committedScrollLeft) logicalScrollLeft = observedScrollLeft;
      logicalScrollLeft += (elapsed / 1000) * AUTO_SCROLL_PX_PER_SECOND;
      if (logicalScrollLeft >= loopDistance) logicalScrollLeft %= loopDistance;
      node.scrollLeft = logicalScrollLeft;
      committedScrollLeft = node.scrollLeft;
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [carouselTerms, shouldAutoScroll, variant]);

  if (loading) return <LoadingCarousel variant={variant} />;
  if (error) return <ErrorCarousel variant={variant} onRetry={onRetry} />;
  if (carouselTerms.length === 0) return <EmptyCarousel variant={variant} />;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[16px] ${variant === 'desktop' ? 'pt-2' : 'pt-0'}`}
      onMouseEnter={() => { pointerPausedRef.current = true; }}
      onMouseLeave={() => { pointerPausedRef.current = false; }}
      onPointerDown={(event) => {
        if (event.button === 1) pointerPausedRef.current = false;
      }}
      onMouseDown={(event) => {
        if (event.button === 1) pointerPausedRef.current = false;
      }}
      onFocusCapture={() => { focusPausedRef.current = true; }}
      onBlurCapture={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        focusPausedRef.current = false;
      }}
    >
      <div
        ref={scrollerRef}
        className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${variant === 'desktop' ? 'overflow-x-auto pb-6' : variant === 'guest' || variant === 'guestDesktop' || variant === 'guestLanding' ? 'overflow-hidden pb-0' : 'overflow-x-auto touch-pan-x snap-x snap-proximity overscroll-x-contain scroll-smooth pb-2'}`}
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
