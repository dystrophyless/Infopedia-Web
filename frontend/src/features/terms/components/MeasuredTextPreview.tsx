import { useLayoutEffect, useRef, useState } from 'react';

export interface MeasuredTextPreviewProps { text: string; className?: string; fadeClassName?: string; maxHeight?: number; }

export function MeasuredTextPreview({ text, className = '', fadeClassName = 'from-white', maxHeight = 80 }: MeasuredTextPreviewProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const normalized = text.trim();
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      // Chromium reports a stable glyph surplus (about 3px) in scrollHeight
      // even when exactly five 16px lines are visible. Compare rounded line
      // counts instead of raw heights so that 83/16 resolves to five while
      // 99/16 correctly resolves to six.
      const lineHeight = Number.parseFloat(window.getComputedStyle(node).lineHeight) || 16;
      const visibleLines = Math.round(node.scrollHeight / lineHeight);
      const allowedLines = Math.round(maxHeight / lineHeight);
      setOverflowing(visibleLines > allowedLines);
    };
    measure();
    void document.fonts?.ready.then(measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [normalized, maxHeight]);
  return <div className="relative min-h-0 overflow-hidden"><p ref={ref} data-measured-text-preview data-measured-text-max-height={maxHeight} style={{ maxHeight }} className={`overflow-hidden whitespace-pre-line ${className}`}>{normalized}</p>{overflowing && <span aria-hidden="true" data-measured-text-fade className={`pointer-events-none absolute inset-x-0 bottom-0 h-[1.75em] bg-gradient-to-t ${fadeClassName} to-transparent`} />}</div>;
}
