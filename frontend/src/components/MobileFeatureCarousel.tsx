import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, TransitionEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const AUTO_ADVANCE_MS = 5000;
const DRAG_THRESHOLD_PX = 48;
const TRACK_TRANSITION_MS = 420;
const ONBOARDING_TARGET = '/onboarding';

type MobileFeatureId = 'weak-topics' | 'tests' | 'term';

interface MobileFeatureDefinition {
  id: MobileFeatureId;
  titleKey: string;
  descriptionKey: string;
  ctaKey: string;
  imageSrc: string;
  width: number;
  height: number;
  imageFrameClassName: string;
  imageClassName: string;
  desktopImageClassName: string;
  to: string;
}

interface MobileFeatureCard extends MobileFeatureDefinition {
  title: string;
  description: string;
  cta: string;
  href: string;
}

interface MobileFeatureCarouselProps {
  isAuthenticated: boolean;
  variant?: 'mobile' | 'desktop';
}

interface DragState {
  pointerId: number;
  startX: number;
  offsetX: number;
}

const MOBILE_FEATURES: MobileFeatureDefinition[] = [
  {
    id: 'weak-topics',
    titleKey: 'landing.mobileToolWeakTopicsTitle',
    descriptionKey: 'landing.mobileToolWeakTopicsDesc',
    ctaKey: 'landing.mobileToolWeakTopicsCta',
    imageSrc: '/mobile-feature-weak-topics.png',
    width: 621,
    height: 582,
    imageFrameClassName: 'h-[292px] left-6 right-6 top-[24px]',
    imageClassName: 'object-center',
    desktopImageClassName: 'object-center',
    to: '/analyze',
  },
  {
    id: 'tests',
    titleKey: 'landing.mobileToolTestsTitle',
    descriptionKey: 'landing.mobileToolTestsDesc',
    ctaKey: 'landing.mobileToolTestsCta',
    imageSrc: '/mobile-feature-tests.png',
    width: 582,
    height: 633,
    imageFrameClassName: 'h-[292px] left-6 right-6 top-[24px]',
    imageClassName: 'object-center',
    desktopImageClassName: 'object-center',
    to: '/tests',
  },
  {
    id: 'term',
    titleKey: 'landing.mobileToolTermTitle',
    descriptionKey: 'landing.mobileToolTermDesc',
    ctaKey: 'landing.mobileToolTermCta',
    imageSrc: '/mobile-feature-term.png',
    width: 682,
    height: 818,
    imageFrameClassName: 'h-[292px] left-6 right-6 top-[24px]',
    imageClassName: 'object-center',
    desktopImageClassName: 'object-center',
    to: '/search',
  },
];

function authTarget(path: string, isAuthenticated: boolean): string {
  return isAuthenticated ? path : ONBOARDING_TARGET;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
    };

    updatePreference();
    media.addEventListener('change', updatePreference);

    return () => {
      media.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function scheduleTransitionRestore(setIsTransitioning: (value: boolean) => void) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      setIsTransitioning(true);
    });
  });
}

export function MobileFeatureCarousel({
  isAuthenticated,
  variant = 'mobile',
}: MobileFeatureCarouselProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isDesktop = variant === 'desktop';
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const slideRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  const wasDraggedRef = useRef(false);
  const featureCards = useMemo(
    () =>
      MOBILE_FEATURES.map((feature) => ({
        ...feature,
        title: t(feature.titleKey),
        description: t(feature.descriptionKey),
        cta: t(feature.ctaKey),
        href: authTarget(feature.to, isAuthenticated),
      })),
    [isAuthenticated, t],
  );
  const loopSlides = useMemo(() => [featureCards[featureCards.length - 1], ...featureCards, featureCards[0]], [featureCards]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(1);
  const [trackOffsetPx, setTrackOffsetPx] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [progressCycle, setProgressCycle] = useState(0);
  const [activeProgressIndex, setActiveProgressIndex] = useState(-1);

  const moveToIndex = useCallback(
    (nextIndex: number) => {
      setIsTransitioning(true);
      setDragOffsetPx(0);
      setProgressCycle((cycle) => cycle + 1);

      if (nextIndex < 0) {
        setTrackIndex(0);
        setActiveIndex(featureCards.length - 1);
        return;
      }

      if (nextIndex >= featureCards.length) {
        setTrackIndex(featureCards.length + 1);
        setActiveIndex(0);
        return;
      }

      setTrackIndex(nextIndex + 1);
      setActiveIndex(nextIndex);
    },
    [featureCards.length],
  );

  useLayoutEffect(() => {
    const updateTrackOffset = () => {
      const firstSlide = slideRefs.current[0];
      const activeSlide = slideRefs.current[trackIndex];
      if (!firstSlide || !activeSlide) return;
      setTrackOffsetPx(activeSlide.offsetLeft - firstSlide.offsetLeft);
    };

    updateTrackOffset();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateTrackOffset);
      return () => window.removeEventListener('resize', updateTrackOffset);
    }

    const observer = new ResizeObserver(updateTrackOffset);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (trackRef.current) observer.observe(trackRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loopSlides.length, trackIndex]);

  useEffect(() => {
    if (prefersReducedMotion || isDragging) {
      setActiveProgressIndex(-1);
      return;
    }

    setActiveProgressIndex(-1);
    const frameId = window.requestAnimationFrame(() => {
      setActiveProgressIndex(activeIndex);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeIndex, isDragging, prefersReducedMotion, progressCycle]);

  useEffect(() => {
    if (prefersReducedMotion || isDragging) return;

    const timeoutId = window.setTimeout(() => {
      moveToIndex(activeIndex + 1);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeIndex, isDragging, moveToIndex, prefersReducedMotion, progressCycle]);

  const handleTrackTransitionEnd = useCallback((event: TransitionEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) return;

    if (trackIndex === 0) {
      setIsTransitioning(false);
      setTrackIndex(featureCards.length);
      setActiveIndex(featureCards.length - 1);
      scheduleTransitionRestore(setIsTransitioning);
      return;
    }

    if (trackIndex === featureCards.length + 1) {
      setIsTransitioning(false);
      setTrackIndex(1);
      setActiveIndex(0);
      scheduleTransitionRestore(setIsTransitioning);
    }
  }, [featureCards.length, trackIndex]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      offsetX: 0,
    };
    wasDraggedRef.current = false;
    setIsDragging(true);
    setIsTransitioning(false);
    setActiveProgressIndex(-1);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const offsetX = event.clientX - dragState.startX;
    dragState.offsetX = offsetX;
    if (Math.abs(offsetX) > 6) wasDraggedRef.current = true;
    setDragOffsetPx(offsetX);
  }, []);

  const snapToCurrentSlide = useCallback(() => {
    setIsTransitioning(true);
    setDragOffsetPx(0);
    setTrackIndex(activeIndex + 1);
    setProgressCycle((cycle) => cycle + 1);
  }, [activeIndex]);

  const finishDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      dragStateRef.current = null;
      setIsDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (cancelled) {
        snapToCurrentSlide();
        return;
      }

      if (dragState.offsetX <= -DRAG_THRESHOLD_PX) {
        moveToIndex(activeIndex + 1);
        return;
      }

      if (dragState.offsetX >= DRAG_THRESHOLD_PX) {
        moveToIndex(activeIndex - 1);
        return;
      }

      snapToCurrentSlide();
    },
    [activeIndex, moveToIndex, snapToCurrentSlide],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      finishDrag(event);
    },
    [finishDrag],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      finishDrag(event, true);
    },
    [finishDrag],
  );

  const handleCardClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (!wasDraggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    wasDraggedRef.current = false;
  }, []);

  const handleCtaPointerDown = useCallback((event: PointerEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    wasDraggedRef.current = false;
  }, []);

  const trackStyle = {
    '--feature-card-width': isDesktop
      ? 'min(880px, calc(100vw - 96px))'
      : 'min(366px, calc(100vw - 48px))',
    transform: `translate3d(${-trackOffsetPx + dragOffsetPx}px, 0, 0)`,
    transitionDuration: `${!isDesktop && isTransitioning && !isDragging ? TRACK_TRANSITION_MS : 0}ms`,
  } as CSSProperties;

  return (
    <div
      className={
        isDesktop
          ? 'relative w-[min(880px,calc(100vw_-_96px))] self-center overflow-hidden'
          : 'relative w-screen max-w-[430px] self-center overflow-hidden'
      }
      style={isDesktop ? undefined : { marginInline: 'calc((100% - 100vw) / 2)' }}
    >
      <div
        ref={viewportRef}
        className={`${isDesktop ? 'h-[372px]' : 'h-[509px]'} touch-pan-y select-none overflow-hidden`}
        aria-roledescription="carousel"
        aria-label={t('landing.mobileToolsTitle')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <ul
          ref={trackRef}
          className={`${isDesktop ? 'h-[372px]' : 'h-[493px]'} flex gap-8 px-[calc((100%_-_var(--feature-card-width))_/_2)] transition-transform ease-out will-change-transform`}
          style={trackStyle}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {loopSlides.map((card, loopIndex) => {
            const realIndex = (loopIndex - 1 + featureCards.length) % featureCards.length;
            const isClone = loopIndex === 0 || loopIndex === loopSlides.length - 1;
            const isAriaHidden = isClone || realIndex !== activeIndex;

            return (
              <li
                key={`${card.id}-${loopIndex}`}
                ref={(node) => {
                  slideRefs.current[loopIndex] = node;
                }}
                className="w-[var(--feature-card-width)] shrink-0"
                aria-hidden={isAriaHidden}
              >
                <FeatureSlideCard
                  card={card}
                  ctaInteractive={!isAriaHidden}
                  variant={variant}
                  onPointerDown={handleCtaPointerDown}
                  onClick={handleCardClick}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1" aria-hidden="true">
        {featureCards.map((card, index) => (
          <span
            key={card.id}
            className={`h-2 overflow-hidden rounded-[8px] bg-surface transition-[width] duration-300 ${
              activeIndex === index ? 'w-5' : 'w-2'
            }`}
          >
            <span
              className="block h-full origin-left rounded-[8px] bg-[#6a37c3] transition-transform ease-linear motion-reduce:transition-none"
              style={{
                transform: `scaleX(${activeProgressIndex === index ? 1 : 0})`,
                transitionDuration: activeProgressIndex === index ? `${AUTO_ADVANCE_MS}ms` : '0ms',
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function FeatureSlideCard({
  card,
  ctaInteractive,
  variant,
  onClick,
  onPointerDown,
}: {
  card: MobileFeatureCard;
  ctaInteractive: boolean;
  variant: 'mobile' | 'desktop';
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLAnchorElement>) => void;
}) {
  const isDesktop = variant === 'desktop';

  if (isDesktop) {
    return (
      <div className="group relative h-[372px]">
        <div className="absolute inset-x-0 bottom-0 h-[280px] rounded-[16px] bg-[#f8f5fc]" />

        <div className="absolute left-0 top-[92px] flex h-[280px] w-[480px] p-[48px]">
          <div className="flex min-h-0 w-full flex-col justify-between">
            <div className="flex w-full flex-col gap-6">
              <h3 className="w-full [text-wrap:balance] text-[32px] font-medium leading-none text-[#6a37c3]">
                {card.title}
              </h3>
              <p className="w-full [text-wrap:pretty] text-[20px] leading-none text-[#6e6779]">
                {card.description}
              </p>
            </div>
            {ctaInteractive ? (
              <Link
                to={card.href}
                className="flex h-[48px] w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 py-3 text-center text-[16px] font-medium leading-none text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
                draggable={false}
                onPointerDown={onPointerDown}
                onClick={onClick}
              >
                {card.cta}
              </Link>
            ) : (
              <span
                className="flex h-[48px] w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 py-3 text-center text-[16px] font-medium leading-none text-white"
              >
                {card.cta}
              </span>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-0 flex h-[324px] w-[448px] items-center justify-center overflow-hidden">
          <img
            src={card.imageSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={card.width}
            height={card.height}
            className={`h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${card.desktopImageClassName}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative h-[493px] overflow-hidden rounded-[16px]">
      <div className="absolute inset-x-0 bottom-0 top-[93px] rounded-[16px] bg-surface" />
      <div className={`pointer-events-none absolute ${card.imageFrameClassName}`}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={card.imageSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={card.width}
            height={card.height}
            className={`h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${card.imageClassName}`}
          />
        </div>
      </div>

      <h3 className="absolute left-8 right-8 top-[333px] text-[20px] font-medium leading-none text-[#6a37c3]">
        {card.title}
      </h3>
      <p className="absolute left-8 right-8 top-[365px] line-clamp-2 min-h-[32px] text-[16px] leading-none text-[#6e6779]">
        {card.description}
      </p>
      {ctaInteractive ? (
        <Link
          to={card.href}
          className="absolute bottom-8 left-8 right-8 flex h-10 items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[16px] font-medium leading-none text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
          draggable={false}
          onPointerDown={onPointerDown}
          onClick={onClick}
        >
          {card.cta}
        </Link>
      ) : (
        <span
          className="absolute bottom-8 left-8 right-8 flex h-10 items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-center text-[16px] font-medium leading-none text-white"
        >
          {card.cta}
        </span>
      )}
    </div>
  );
}
