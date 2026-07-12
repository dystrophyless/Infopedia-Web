import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Surface } from '../atoms';
import { cn } from '../utils/cn';

const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let scrollLockDepth = 0;
let overflowBeforeLock = '';

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true');
}

function lockBodyScroll() {
  if (scrollLockDepth === 0) {
    overflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockDepth += 1;
  return () => {
    scrollLockDepth = Math.max(0, scrollLockDepth - 1);
    if (scrollLockDepth === 0) document.body.style.overflow = overflowBeforeLock;
  };
}

type DialogAccessibleName = { titleId: string; 'aria-label'?: never } | { titleId?: never; 'aria-label': string };
type DialogBaseProps = {
  open: boolean;
  onDismiss: () => void;
  children: ReactNode;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  dismissOnOverlay?: boolean;
  className?: string;
  overlayClassName?: string;
};
export type DialogProps = DialogBaseProps & DialogAccessibleName;

export function Dialog({ open, onDismiss, children, titleId, descriptionId, initialFocusRef, dismissOnOverlay = true, className, overlayClassName, 'aria-label': ariaLabel }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockBodyScroll();
    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current;
      (target && dialog.contains(target) ? target : focusableElements(dialog)[0] ?? dialog).focus({ preventScroll: true });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); dismissRef.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = focusableElements(dialog);
      if (elements.length === 0) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      const [first] = elements;
      const last = elements[elements.length - 1];
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('keydown', onKeyDown); unlock(); if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus({ preventScroll: true }); restoreFocusRef.current = null; };
  }, [open, initialFocusRef]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4', overlayClassName)} onPointerDown={(event) => { if (dismissOnOverlay && event.target === event.currentTarget) dismissRef.current(); }}>
      <Surface ref={dialogRef} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className={cn('w-full outline-none', className)}>
        {children}
      </Surface>
    </div>, document.body,
  );
}
