import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { getFeaturedTerms } from '../api/terms';
import type { FeaturedTerm } from '../types';
import { DefinitionMetadata } from './DefinitionMetadata';

const ELLIPSIS = '...';
const MOBILE_CARD_TONES = [
  'bg-[#f4f0ff]',
  'bg-[#eef7ff]',
  'bg-[#f0f8f3]',
  'bg-[#fff4ec]',
];
const AUTO_SCROLL_PX_PER_SECOND = 46;
const GUEST_FALLBACK_TERMS: FeaturedTerm[] = [
  {
    term: { public_id: 'informatika', name: 'Информатика' },
    featured_definition: {
      public_id: 'informatika-fallback',
      text: '«информация» және «автоматика» сөздерінің бірігуінен құралған.',
      page: 1,
    },
  },
  {
    term: { public_id: 'alfavit', name: 'Алфавит' },
    featured_definition: {
      public_id: 'alfavit-fallback',
      text: 'Ол нақты тілдердің (екілік, латынша) символдық немесе әріптік түрде берілуі.',
      page: 1,
    },
  },
  {
    term: { public_id: 'etiket', name: 'Этикет' },
    featured_definition: {
      public_id: 'etiket-fallback',
      text: 'Желіде өзара байланыс жасауға қажетті ережелер этикет деп аталады.',
      page: 1,
    },
  },
];

function getMobileCardTone(key: string): string {
  const codeSum = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return MOBILE_CARD_TONES[codeSum % MOBILE_CARD_TONES.length];
}

function oneLineTermName(name: string): string {
  if (name.length <= 20) return name;
  return name.slice(0, 20).trimEnd() + '...';
}

function previewText(text: string): string {
  return text.trim().replace(/\n{2,}/g, '\n');
}

function createDefinitionMeasureNode(node: HTMLElement): HTMLParagraphElement {
  const styles = window.getComputedStyle(node);
  const measureNode = document.createElement('p');

  measureNode.style.position = 'fixed';
  measureNode.style.left = '-9999px';
  measureNode.style.top = '0';
  measureNode.style.visibility = 'hidden';
  measureNode.style.pointerEvents = 'none';
  measureNode.style.width = `${node.clientWidth}px`;
  measureNode.style.height = 'auto';
  measureNode.style.minHeight = '0';
  measureNode.style.maxHeight = 'none';
  measureNode.style.overflow = 'visible';
  measureNode.style.margin = '0';
  measureNode.style.padding = '0';
  measureNode.style.border = '0';
  measureNode.style.boxSizing = 'border-box';
  measureNode.style.whiteSpace = 'pre-line';
  measureNode.style.fontFamily = styles.fontFamily;
  measureNode.style.fontSize = styles.fontSize;
  measureNode.style.fontStyle = styles.fontStyle;
  measureNode.style.fontWeight = styles.fontWeight;
  measureNode.style.fontVariant = styles.fontVariant;
  measureNode.style.lineHeight = styles.lineHeight;
  measureNode.style.letterSpacing = styles.letterSpacing;
  measureNode.style.overflowWrap = styles.overflowWrap;
  measureNode.style.wordBreak = styles.wordBreak;

  document.body.append(measureNode);

  return measureNode;
}

function doesTextFit(measureNode: HTMLElement, text: string, availableHeight: number): boolean {
  measureNode.textContent = text;
  return measureNode.scrollHeight <= availableHeight + 1;
}

function fitTextToAvailableSpace(node: HTMLElement, text: string): string {
  const normalizedText = text.trim();
  const availableHeight = node.parentElement?.clientHeight ?? node.clientHeight;

  if (!normalizedText || node.clientWidth <= 0 || availableHeight <= 0) {
    return normalizedText;
  }

  const measureNode = createDefinitionMeasureNode(node);

  try {
    if (doesTextFit(measureNode, normalizedText, availableHeight)) {
      return normalizedText;
    }

    const words = normalizedText.split(/\s+/);
    let low = 0;
    let high = words.length;
    let bestFitText = ELLIPSIS;

    while (low <= high) {
      const wordCount = Math.floor((low + high) / 2);
      const candidate =
        wordCount > 0 ? words.slice(0, wordCount).join(' ') + ELLIPSIS : ELLIPSIS;

      if (doesTextFit(measureNode, candidate, availableHeight)) {
        bestFitText = candidate;
        low = wordCount + 1;
      } else {
        high = wordCount - 1;
      }
    }

    return bestFitText;
  } finally {
    measureNode.remove();
  }
}

function FeaturedTermCard({
  featuredTerm,
  clone = false,
  variant = 'desktop',
}: {
  featuredTerm: FeaturedTerm;
  clone?: boolean;
  variant?: 'desktop' | 'mobile' | 'home' | 'guest';
}) {
  const { t } = useTranslation();
  const { term, featured_definition: definition } = featuredTerm;
  const isMobileVariant = variant === 'mobile';
  const isHomeVariant = variant === 'home';
  const isGuestVariant = variant === 'guest';
  const definitionPreviewRef = useRef<HTMLParagraphElement>(null);
  const fullDefinitionText = useMemo(
    () => (definition?.text ? previewText(definition.text) : ''),
    [definition?.text],
  );
  const [visibleDefinitionText, setVisibleDefinitionText] = useState(fullDefinitionText);
  const book = definition.topic?.book;
  const mobileBookValue = book?.publisher
    ? book.grade
      ? t('metadata.bookWithGrade', { publisher: book.publisher, grade: book.grade })
      : book.publisher
    : undefined;
  const mobileTopicValue = definition.topic?.name;
  const mobileCardShellClass = `h-[238px] w-[76vw] rounded-[22px] border-0 bg-surface p-5 shadow-none ${getMobileCardTone(
    term.public_id,
  )}`;
  const homeCardShellClass =
    'h-[134px] w-[204px] rounded-[8px] border border-[#e8e1ee] bg-surface p-4 shadow-none';
  const guestCardShellClass =
    'h-[128px] w-[216px] rounded-[16px] border-0 bg-[#efebf6] p-6 shadow-none';
  const desktopCardShellClass =
    'h-[325px] w-[min(612px,calc(100vw_-_96px))] rounded-[15px] border border-border bg-surface p-[50px] shadow-feature transition-shadow hover:shadow-card max-md:h-[280px] max-md:w-[88vw] max-md:p-8 max-md:shadow-none';

  useLayoutEffect(() => {
    const node = definitionPreviewRef.current;
    if (!node) return;
    let cancelled = false;

    const updateVisibleText = () => {
      if (!cancelled) setVisibleDefinitionText(fitTextToAvailableSpace(node, fullDefinitionText));
    };

    updateVisibleText();
    void document.fonts?.ready.then(updateVisibleText);

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateVisibleText);
      return () => {
        cancelled = true;
        window.removeEventListener('resize', updateVisibleText);
      };
    }

    const resizeTarget = node.parentElement ?? node;
    const observer = new ResizeObserver(updateVisibleText);
    observer.observe(resizeTarget);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fullDefinitionText]);

  return (
    <Link
      to={`/terms/${term.public_id}`}
      state={{ backTo: '/', term, selectedDefinitionPublicId: definition.public_id }}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      className={`group relative flex min-w-0 flex-none flex-col overflow-hidden ${
        isHomeVariant
          ? homeCardShellClass
          : isGuestVariant
            ? guestCardShellClass
            : isMobileVariant
            ? mobileCardShellClass
            : desktopCardShellClass
      }`}
    >
      {isGuestVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <h3 className="min-w-0 truncate text-[15px] font-medium leading-[1.18] text-accent">
            {oneLineTermName(term.name)}
          </h3>
          <div className="mt-3 min-h-0 min-w-0 flex-1">
            <p
              ref={definitionPreviewRef}
              className="h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[12px] leading-[1.2] text-[rgba(30,30,30,0.5)]"
            >
              {visibleDefinitionText}
            </p>
          </div>
        </div>
      ) : isHomeVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <h3 className="min-w-0 truncate text-[16px] font-medium leading-tight text-primary">
            {oneLineTermName(term.name)}
          </h3>
          <div className="mt-3 min-h-0 min-w-0 flex-1">
            <p
              ref={definitionPreviewRef}
              className="h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[12px] leading-[1.25] text-text-body"
            >
              {visibleDefinitionText}
            </p>
          </div>
        </div>
      ) : isMobileVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 truncate text-[23px] font-medium leading-tight text-text">
              {oneLineTermName(term.name)}
            </h3>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/72 text-primary">
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={1.8} />
            </span>
          </div>
          <div className="mt-4 h-[66px] min-w-0">
            <p
              ref={definitionPreviewRef}
              className="h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[15px] font-normal leading-[1.25] text-text-body"
            >
              {visibleDefinitionText}
            </p>
          </div>
          <div className="mt-auto grid gap-1.5 text-[12px] leading-snug text-text-body">
            {mobileBookValue && (
              <p className="min-w-0 truncate">
                <span className="text-muted">{t('metadata.book')}: </span>
                <span className="font-medium">{mobileBookValue}</span>
              </p>
            )}
            {mobileTopicValue && (
              <p className="min-w-0 truncate">
                <span className="text-muted">{t('metadata.topic')}: </span>
                <span className="font-medium">{mobileTopicValue}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <h3 className="min-w-0 truncate text-[30px] font-medium leading-tight text-text max-md:text-[24px]">
              {oneLineTermName(term.name)}
            </h3>
            <span className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors group-hover:text-accent">
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={19} strokeWidth={1.7} />
            </span>
          </div>
          <div className="mt-4 min-h-0 min-w-0 flex-1">
            <p
              ref={definitionPreviewRef}
              className="h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[18px] font-normal leading-[1.25] text-text-body max-md:text-[15px]"
            >
              {visibleDefinitionText}
            </p>
          </div>
          <div className="mt-auto min-w-0">
            <DefinitionMetadata
              definition={definition}
              variant="compact"
              showPage={false}
              topicValueClassName="max-w-[180px] max-md:max-w-[130px]"
              className="min-w-0 max-w-full max-md:gap-1.5 [&_dd]:max-md:text-[12px] [&_dt]:max-md:text-[12px]"
            />
          </div>
        </div>
      )}
    </Link>
  );
}

export function TermCardCarousel({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' | 'home' | 'guest' }) {
  const [terms, setTerms] = useState<FeaturedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const fallbackTerms = variant === 'guest' ? GUEST_FALLBACK_TERMS : [];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getFeaturedTerms();
        if (!cancelled) setTerms(data.length > 0 ? data : fallbackTerms);
      } catch {
        if (!cancelled) setTerms(fallbackTerms);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const loopedTerms = useMemo(() => {
    if (terms.length < 2) return terms;
    return [...terms, ...terms];
  }, [terms]);
  const shouldAutoScroll = variant === 'desktop' || variant === 'guest';
  const displayTerms = shouldAutoScroll ? loopedTerms : terms;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!shouldAutoScroll || !node || terms.length < 2) return;

    const loopDistance =
      (node.querySelector<HTMLElement>('[data-carousel-item="clone-0"]')?.offsetLeft ??
        node.scrollWidth / 2) -
      (node.querySelector<HTMLElement>('[data-carousel-item="orig-0"]')?.offsetLeft ?? 0);

    if (loopDistance <= 0) return;

    let frameId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        node.scrollLeft += (elapsed / 1000) * AUTO_SCROLL_PX_PER_SECOND;

        if (node.scrollLeft >= loopDistance) {
          node.scrollLeft -= loopDistance;
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [shouldAutoScroll, terms]);

  if (loading) {
    return (
      <div className={`overflow-hidden ${
        variant === 'home'
          ? 'pb-2 pl-0 pr-4 pt-0'
          : variant === 'guest'
            ? 'pb-0 pl-0 pr-0 pt-0'
          : variant === 'mobile'
            ? 'pb-2 pl-0 pr-4 pt-0'
            : 'px-[48px] pb-6 pt-2 max-md:px-4'
      }`}>
        <div className={`flex ${
          variant === 'home' ? 'gap-2.5' : variant === 'guest' ? 'gap-4' : variant === 'mobile' ? 'gap-3' : 'gap-[45px]'
        }`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`flex-none animate-pulse bg-surface/70 ${
                variant === 'home'
                  ? 'h-[134px] w-[204px] rounded-[8px] border border-[#e8e1ee]'
                  : variant === 'guest'
                  ? 'h-[128px] w-[168px] rounded-[16px] border-0 bg-[#efebf6]'
                  : variant === 'mobile'
                  ? 'h-[238px] w-[76vw] rounded-[22px] border-0'
                  : 'h-[325px] w-[min(612px,calc(100vw_-_96px))] rounded-[15px] border border-border/40 max-md:w-[88vw]'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (terms.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${variant === 'desktop' ? 'pt-2' : 'pt-0'}`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocusCapture={() => {
        pausedRef.current = true;
      }}
      onBlurCapture={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={scrollerRef}
        className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          variant === 'desktop'
            ? 'overflow-x-auto pb-6'
            : variant === 'guest'
              ? 'overflow-hidden pb-0'
              : 'overflow-x-auto touch-pan-x snap-x snap-proximity overscroll-x-contain scroll-smooth pb-2'
        }`}
      >
        <ul className={`flex w-max ${
          variant === 'home' ? 'gap-2.5 pl-0 pr-4' : variant === 'guest' ? 'gap-4 pl-8 pr-8' : variant === 'mobile' ? 'gap-3 pl-0 pr-[24vw]' : 'gap-[45px] px-[48px] max-md:gap-4 max-md:px-4'
        }`}>
          {displayTerms.map((featuredTerm, index) => (
            <li
              key={`${featuredTerm.term.public_id}-${featuredTerm.featured_definition.public_id}-${index < terms.length ? 'orig' : 'clone'}`}
              data-carousel-item={index < terms.length ? `orig-${index}` : `clone-${index - terms.length}`}
              className={`flex-none ${variant === 'mobile' || variant === 'guest' ? 'snap-start' : ''}`}
            >
              <FeaturedTermCard
                featuredTerm={featuredTerm}
                clone={index >= terms.length}
                variant={variant}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
