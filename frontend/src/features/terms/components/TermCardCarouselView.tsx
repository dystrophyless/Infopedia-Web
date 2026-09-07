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
  variant: FeaturedTermCardVariant;
}

const trackClasses: Record<FeaturedTermCardVariant, string> = {
  guest: 'gap-4 pl-8 pr-8',
  guestLanding: 'gap-6 px-0',
};

const loadingShellClasses: Record<FeaturedTermCardVariant, string> = {
  guest: 'h-[168px] w-[216px] rounded-[16px] border-0 bg-white p-6',
  guestLanding: 'h-[168px] w-[262px] rounded-[16px] border-0 bg-white p-6',
};

function LoadingCarousel({ variant }: { variant: FeaturedTermCardVariant }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-[16px]" role="status" aria-busy="true">
      <span className="sr-only">{t('common.loading', { defaultValue: 'Загрузка...' })}</span>
      <div aria-hidden="true">
        <ul className={`flex w-max ${trackClasses[variant]}`}>
          {Array.from({ length: 4 }, (_, key) => (
            <li key={key} className={`flex-none animate-pulse ${loadingShellClasses[variant]}`}>
              <div className="flex h-full flex-col">
                <span data-carousel-skeleton-title className="h-4 w-3/4 rounded-[4px] bg-action-primary/35" />
                <span data-carousel-skeleton-definition className="mt-4 h-3 w-full rounded-[4px] bg-surface-muted" />
                <span className="mt-2 h-3 w-5/6 rounded-[4px] bg-surface-muted" />
                <span className="mt-2 h-3 w-2/3 rounded-[4px] bg-surface-muted" />
                <span data-carousel-skeleton-source className="mt-auto h-3 w-1/2 rounded-[4px] bg-action-primary/20" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmptyCarousel() {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-[168px] w-full items-center justify-center overflow-hidden rounded-[16px] px-6 py-8 text-center text-[14px] leading-[14px] text-muted"
      role="status"
    >
      {t('terms.noFeatured', { defaultValue: 'Избранных терминов пока нет' })}
    </div>
  );
}

function ErrorCarousel({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-[168px] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[16px] px-6 py-8 text-center text-[14px] leading-[14px] text-muted"
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

export function TermCardCarouselView({ terms, loading = false, error = false, onRetry, variant }: TermCardCarouselViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const carouselTerms = useMemo(() => terms.slice(0, FEATURED_TERMS_LIMIT), [terms]);
  const displayTerms = useMemo(
    () => carouselTerms.length > 1 ? [...carouselTerms, ...carouselTerms] : carouselTerms,
    [carouselTerms],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || carouselTerms.length < 2) return;
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
  }, [carouselTerms, variant]);

  if (loading) return <LoadingCarousel variant={variant} />;
  if (error) return <ErrorCarousel onRetry={onRetry} />;
  if (carouselTerms.length === 0) return <EmptyCarousel />;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px]"
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
      <div ref={scrollerRef} className="[scrollbar-width:none] overflow-hidden pb-0 [&::-webkit-scrollbar]:hidden">
        <ul className={`flex w-max ${trackClasses[variant]}`}>
          {displayTerms.map((featuredTerm, index) => {
            const clone = index >= carouselTerms.length;
            return (
              <li
                key={`${featuredTerm.term.public_id}-${featuredTerm.featured_definition.public_id}-${clone ? 'clone' : 'orig'}`}
                data-carousel-item={clone ? `clone-${index - carouselTerms.length}` : `orig-${index}`}
                className="flex-none"
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
