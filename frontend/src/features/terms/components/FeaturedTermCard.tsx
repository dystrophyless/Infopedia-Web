import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import type { FeaturedTerm } from '../../../types';
import {
  formatDefinitionSource,
  getDefinitionBookValue,
  normalizeDefinitionPreviewText,
} from '../model';
import { DefinitionMetadata } from './DefinitionMetadata';

export type FeaturedTermCardVariant = 'desktop' | 'mobile' | 'home' | 'guest' | 'guestDesktop';

export interface FeaturedTermCardProps {
  featuredTerm: FeaturedTerm;
  clone?: boolean;
  variant?: FeaturedTermCardVariant;
}

const ELLIPSIS = '...';
const MOBILE_CARD_TONES = [
  { cardClassName: 'bg-[#f4f0ff]', fadeClassName: 'from-[#f4f0ff]' },
  { cardClassName: 'bg-[#eef7ff]', fadeClassName: 'from-[#eef7ff]' },
  { cardClassName: 'bg-[#f0f8f3]', fadeClassName: 'from-[#f0f8f3]' },
  { cardClassName: 'bg-[#fff4ec]', fadeClassName: 'from-[#fff4ec]' },
] as const;

type FittedDefinitionText = { text: string; overflowing: boolean };

function getMobileCardToneClasses(key: string) {
  const codeSum = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return MOBILE_CARD_TONES[codeSum % MOBILE_CARD_TONES.length];
}

function oneLineTermName(name: string) {
  return name.length <= 20 ? name : `${name.slice(0, 20).trimEnd()}${ELLIPSIS}`;
}

function createDefinitionMeasureNode(node: HTMLElement) {
  const styles = window.getComputedStyle(node);
  const measureNode = document.createElement('p');
  Object.assign(measureNode.style, {
    position: 'fixed', left: '-9999px', top: '0', visibility: 'hidden', pointerEvents: 'none',
    width: `${node.clientWidth}px`, height: 'auto', minHeight: '0', maxHeight: 'none',
    overflow: 'visible', margin: '0', padding: '0', border: '0', boxSizing: 'border-box',
    whiteSpace: 'pre-line', fontFamily: styles.fontFamily, fontSize: styles.fontSize,
    fontStyle: styles.fontStyle, fontWeight: styles.fontWeight, fontVariant: styles.fontVariant,
    lineHeight: styles.lineHeight, letterSpacing: styles.letterSpacing,
    overflowWrap: styles.overflowWrap, wordBreak: styles.wordBreak,
  });
  document.body.append(measureNode);
  return measureNode;
}

function doesTextFit(node: HTMLElement, text: string, availableHeight: number) {
  node.textContent = text;
  return node.scrollHeight <= availableHeight + 1;
}

export function fitTextToAvailableSpace(node: HTMLElement, text: string): FittedDefinitionText {
  const normalizedText = text.trim();
  const availableHeight = node.parentElement?.clientHeight ?? node.clientHeight;
  if (!normalizedText || node.clientWidth <= 0 || availableHeight <= 0) {
    return { text: normalizedText, overflowing: false };
  }
  const measureNode = createDefinitionMeasureNode(node);
  try {
    if (doesTextFit(measureNode, normalizedText, availableHeight)) {
      return { text: normalizedText, overflowing: false };
    }
    const words = normalizedText.split(/\s+/);
    let low = 0;
    let high = words.length;
    let bestFitText = ELLIPSIS;
    while (low <= high) {
      const wordCount = Math.floor((low + high) / 2);
      const candidate = wordCount > 0 ? words.slice(0, wordCount).join(' ') + ELLIPSIS : ELLIPSIS;
      if (doesTextFit(measureNode, candidate, availableHeight)) {
        bestFitText = candidate;
        low = wordCount + 1;
      } else high = wordCount - 1;
    }
    return { text: bestFitText, overflowing: true };
  } finally {
    measureNode.remove();
  }
}

export function FeaturedTermCard({ featuredTerm, clone = false, variant = 'desktop' }: FeaturedTermCardProps) {
  const { t } = useTranslation();
  const { term, featured_definition: definition } = featuredTerm;
  const definitionPreviewRef = useRef<HTMLParagraphElement>(null);
  const fullDefinitionText = useMemo(() => normalizeDefinitionPreviewText(definition.text ?? ''), [definition.text]);
  const [visibleDefinition, setVisibleDefinition] = useState<FittedDefinitionText>({ text: fullDefinitionText, overflowing: false });
  const isMobileVariant = variant === 'mobile';
  const isHomeVariant = variant === 'home';
  const isGuestDesktopVariant = variant === 'guestDesktop';
  const isGuestLikeVariant = variant === 'guest' || isGuestDesktopVariant;
  const tone = getMobileCardToneClasses(term.public_id);
  const sourceLine = formatDefinitionSource(definition, t);
  const mobileBookValue = getDefinitionBookValue(definition, t);
  const mobileTopicValue = definition.topic?.name;

  useLayoutEffect(() => {
    const node = definitionPreviewRef.current;
    if (!node) return;
    let cancelled = false;
    const updateVisibleText = () => {
      if (!cancelled) setVisibleDefinition(fitTextToAvailableSpace(node, fullDefinitionText));
    };
    updateVisibleText();
    void document.fonts?.ready.then(updateVisibleText);
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateVisibleText);
      return () => { cancelled = true; window.removeEventListener('resize', updateVisibleText); };
    }
    const observer = new ResizeObserver(updateVisibleText);
    observer.observe(node.parentElement ?? node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [fullDefinitionText]);

  const definitionFadeClass = isGuestDesktopVariant ? 'from-surface-subtle' : variant === 'guest' ? 'from-white' : isMobileVariant ? tone.fadeClassName : 'from-surface';
  const definitionFade = visibleDefinition.overflowing ? (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[1.75em] bg-gradient-to-t ${definitionFadeClass} to-transparent`} />
  ) : null;

  const shellClass = isHomeVariant
    ? 'h-[134px] w-[204px] rounded-[8px] border border-[#e8e1ee] bg-surface p-4 shadow-none'
    : variant === 'guest'
      ? 'h-[168px] w-[216px] rounded-[16px] border-0 bg-white p-6 shadow-none'
      : isGuestDesktopVariant
        ? 'h-[220px] w-[320px] rounded-[20px] border-0 bg-surface-subtle p-8 shadow-none'
        : isMobileVariant
          ? `h-[238px] w-[76vw] rounded-[22px] border-0 bg-surface p-5 shadow-none ${tone.cardClassName}`
          : 'h-[325px] w-[min(612px,calc(100vw_-_96px))] rounded-[15px] border border-border bg-surface p-[50px] max-md:h-[280px] max-md:w-[88vw] max-md:p-8';

  const preview = (className: string) => (
    <p ref={definitionPreviewRef} className={className}>{visibleDefinition.text}</p>
  );

  const cardContent = (
    <>
      {isGuestLikeVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <h3 className={`min-w-0 truncate ${isGuestDesktopVariant ? 'text-[20px] leading-[20px]' : 'text-[15px] leading-[15px]'} font-medium text-action-selected`}>{oneLineTermName(term.name)}</h3>
          <div className={`${isGuestDesktopVariant ? 'mt-5' : 'mt-3'} relative min-h-0 min-w-0 flex-1`}>
            {preview(`h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line ${isGuestDesktopVariant ? 'text-[16px] leading-[16px]' : 'text-[12px] leading-[12px]'} text-text-body`)}
            {definitionFade}
          </div>
          {sourceLine && <p className={`mt-2 min-w-0 truncate ${isGuestDesktopVariant ? 'text-[13px] leading-[13px]' : 'text-[12px] leading-[12px]'} text-muted`}>{sourceLine}</p>}
        </div>
      ) : isHomeVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <h3 className="min-w-0 truncate text-[16px] font-medium leading-4 text-primary">{oneLineTermName(term.name)}</h3>
          <div className="relative mt-3 min-h-0 min-w-0 flex-1">{preview('h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[12px] leading-3 text-text-body')}{definitionFade}</div>
        </div>
      ) : isMobileVariant ? (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 truncate text-[23px] font-medium leading-[23px] text-text">{oneLineTermName(term.name)}</h3>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/72 text-primary" aria-hidden="true"><HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={1.8} /></span>
          </div>
          <div className="relative mt-4 h-[66px] min-w-0">{preview('h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[15px] font-normal leading-[15px] text-text-body')}{definitionFade}</div>
          <div className="mt-auto grid gap-1.5 text-[12px] leading-3 text-text-body">
            {mobileBookValue && <p className="min-w-0 truncate"><span className="text-muted">{t('metadata.book')}: </span><span className="font-medium">{mobileBookValue}</span></p>}
            {mobileTopicValue && <p className="min-w-0 truncate"><span className="text-muted">{t('metadata.topic')}: </span><span className="font-medium">{mobileTopicValue}</span></p>}
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-4"><h3 className="min-w-0 truncate text-[30px] font-medium leading-[30px] text-text max-md:text-[24px] max-md:leading-6">{oneLineTermName(term.name)}</h3><span className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors group-hover:text-accent" aria-hidden="true"><HugeiconsIcon icon={ArrowUpRight01Icon} size={19} strokeWidth={1.7} /></span></div>
          <div className="relative mt-4 min-h-0 min-w-0 flex-1">{preview('h-full min-h-0 min-w-0 overflow-hidden whitespace-pre-line text-[18px] font-normal leading-[18px] text-text-body max-md:text-[15px] max-md:leading-[15px]')}{definitionFade}</div>
          <DefinitionMetadata definition={definition} variant="compact" showPage={false} topicValueClassName="max-w-[180px] max-md:max-w-[130px]" className="min-w-0 max-w-full max-md:gap-1.5 [&_dd]:max-md:text-[12px] [&_dd]:max-md:leading-3 [&_dt]:max-md:text-[12px] [&_dt]:max-md:leading-3" />
        </div>
      )}
    </>
  );

  const cardClassName = `group relative flex min-w-0 flex-none flex-col overflow-hidden ${shellClass}`;

  if (clone) {
    return <div aria-hidden="true" className={cardClassName}>{cardContent}</div>;
  }

  return (
    <Link
      to={`/terms/${term.public_id}`}
      state={{ backTo: '/', term, selectedDefinitionPublicId: definition.public_id }}
      className={cardClassName}
    >
      {cardContent}
    </Link>
  );
}
