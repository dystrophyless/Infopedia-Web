import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedTerms } from '../api/terms';
import type { FeaturedTerm } from '../types';
import { DefinitionMetadata } from './DefinitionMetadata';

function oneLineTermName(name: string): string {
  if (name.length <= 20) return name;
  return name.slice(0, 20).trimEnd() + '...';
}

function previewText(text: string): string {
  return text.trim().replace(/\n{2,}/g, '\n');
}

function FeaturedTermCard({
  featuredTerm,
  clone = false,
}: {
  featuredTerm: FeaturedTerm;
  clone?: boolean;
}) {
  const { term, featured_definition: definition } = featuredTerm;

  return (
    <Link
      to={`/terms/${term.id}`}
      state={{ backTo: '/', term, selectedDefinitionId: definition.id }}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      className="flex h-[325px] w-[min(612px,calc(100vw_-_96px))] min-w-0 flex-none flex-col overflow-hidden rounded-[15px] border border-border bg-surface p-[50px] shadow-feature transition-shadow hover:shadow-card max-md:h-[280px] max-md:w-[88vw] max-md:p-8"
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <h3 className="min-w-0 truncate text-[36px] font-medium leading-[1.15] text-text max-md:text-[28px]">
          {oneLineTermName(term.name)}
        </h3>
        <p className="mt-6 min-w-0 line-clamp-3 whitespace-pre-line text-[22px] font-light leading-[1.2] text-text max-md:mt-6 max-md:text-[16px] max-md:leading-[1.2]">
          {definition?.text ? previewText(definition.text) : ''}
        </p>
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
              key={`${featuredTerm.term.id}-${featuredTerm.featured_definition.id}-${index < terms.length ? 'orig' : 'clone'}`}
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
