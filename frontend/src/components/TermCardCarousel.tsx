import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { getFeaturedTerms } from '../api/terms';
import type { FeaturedTerm } from '../types';
import { DefinitionMetadata } from './DefinitionMetadata';

const ELLIPSIS = '...';

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
}: {
  featuredTerm: FeaturedTerm;
  clone?: boolean;
}) {
  const { term, featured_definition: definition } = featuredTerm;
  const definitionPreviewRef = useRef<HTMLParagraphElement>(null);
  const fullDefinitionText = useMemo(
    () => (definition?.text ? previewText(definition.text) : ''),
    [definition?.text],
  );
  const [visibleDefinitionText, setVisibleDefinitionText] = useState(fullDefinitionText);

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
      className="group relative flex h-[325px] w-[min(612px,calc(100vw_-_96px))] min-w-0 flex-none flex-col overflow-hidden rounded-[15px] border border-border bg-surface p-[50px] shadow-feature transition-shadow hover:shadow-card max-md:h-[280px] max-md:w-[88vw] max-md:p-8"
    >
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
            className="h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[18px] font-normal leading-[1.35] text-text-body max-md:text-[15px]"
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
    </Link>
  );
}

export function TermCardCarousel() {
  const [terms, setTerms] = useState<FeaturedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getFeaturedTerms();
        if (!cancelled) setTerms(data);
      } catch {
        if (!cancelled) setTerms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loopedTerms = useMemo(() => {
    if (terms.length < 2) return terms;
    return [...terms, ...terms];
  }, [terms]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || terms.length < 2) return;

    let frameId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        const firstTrackWidth = node.scrollWidth / 2;
        node.scrollLeft += elapsed * 0.06;

        if (node.scrollLeft >= firstTrackWidth) {
          node.scrollLeft -= firstTrackWidth;
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [terms]);

  if (loading) {
    return (
      <div className="overflow-hidden px-[48px] pb-6 pt-2 max-md:px-4">
        <div className="flex gap-[45px]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[325px] w-[min(612px,calc(100vw_-_96px))] flex-none animate-pulse rounded-[15px] border border-border/40 bg-surface/70 max-md:w-[88vw]"
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
      className="relative w-full overflow-hidden pt-2"
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
        className="overflow-x-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-[45px] px-[48px] max-md:gap-4 max-md:px-4">
          {loopedTerms.map((featuredTerm, index) => (
            <li
              key={`${featuredTerm.term.public_id}-${featuredTerm.featured_definition.public_id}-${index < terms.length ? 'orig' : 'clone'}`}
              className="flex-none"
            >
              <FeaturedTermCard featuredTerm={featuredTerm} clone={index >= terms.length} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
