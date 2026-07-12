import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Surface } from '../atoms';
import { cn } from '../utils/cn';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let bodyScrollLockDepth = 0;
let bodyOverflowBeforeLock = '';
const openDialogStack: HTMLElement[] = [];

function acquireBodyScrollLock() {
  if (bodyScrollLockDepth === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  bodyScrollLockDepth += 1;

  return () => {
    bodyScrollLockDepth = Math.max(0, bodyScrollLockDepth - 1);
    if (bodyScrollLockDepth === 0) {
      document.body.style.overflow = bodyOverflowBeforeLock;
    }
  };
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true',
  );
}

function isTopmostDialog(dialog: HTMLElement) {
  return openDialogStack.at(-1) === dialog;
}

type BottomSheetAccessibleName =
  | { titleId: string; 'aria-label'?: never }
  | { titleId?: never; 'aria-label': string };

type BottomSheetBaseProps = {
  open: boolean;
  onDismiss: () => void;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  dismissOnOverlay?: boolean;
  swipeToDismiss?: boolean;
  swipeThreshold?: number;
  topOffset?: number | string;
  stackLevel?: number;
};

export type BottomSheetProps = BottomSheetBaseProps & BottomSheetAccessibleName;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  eligible: boolean;
  dragging: boolean;
};

const idleDragState: DragState = {
  pointerId: -1,
  startX: 0,
  startY: 0,
  eligible: false,
  dragging: false,
};

export function BottomSheet({
  open,
  onDismiss,
  titleId,
  descriptionId,
  initialFocusRef,
  children,
  className,
  overlayClassName,
  dismissOnOverlay = true,
  swipeToDismiss = false,
  swipeThreshold = 96,
  topOffset = '10dvh',
  stackLevel = 0,
  'aria-label': ariaLabel,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  const initialFocusTargetRef = useRef(initialFocusRef);
  const dragStateRef = useRef<DragState>(idleDragState);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  onDismissRef.current = onDismiss;
  initialFocusTargetRef.current = initialFocusRef;

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogStack.push(dialog);
    const releaseBodyScrollLock = acquireBodyScrollLock();

    const focusFrame = window.requestAnimationFrame(() => {
      const requestedTarget = initialFocusTargetRef.current?.current;
      const firstFocusable = getFocusableElements(dialog)[0];
      const focusTarget =
        requestedTarget && dialog.contains(requestedTarget)
          ? requestedTarget
          : (firstFocusable ?? dialog);

      focusTarget.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog(dialog)) return;

      if (event.key === 'Escape' && !event.isComposing) {
        event.preventDefault();
        onDismissRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus({ preventScroll: true });
      } else if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      releaseBodyScrollLock();

      const dialogIndex = openDialogStack.lastIndexOf(dialog);
      if (dialogIndex >= 0) openDialogStack.splice(dialogIndex, 1);

      const restoreTarget = restoreFocusRef.current;
      if (restoreTarget?.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
      restoreFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    dragStateRef.current = idleDragState;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const resetDrag = () => {
    dragStateRef.current = idleDragState;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!dismissOnOverlay || event.target !== event.currentTarget) return;
    event.preventDefault();
    onDismissRef.current();
  };

  const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeToDismiss || event.button !== 0) return;

    const dialog = dialogRef.current;
    const target = event.target instanceof Element ? event.target : null;
    const startedOnHandle = Boolean(target?.closest('[data-bottom-sheet-handle]'));

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      eligible: startedOnHandle || (dialog?.scrollTop ?? 0) <= 0,
      dragging: false,
    };
  };

  const handleSheetPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.eligible || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const dialog = dialogRef.current;

    if (!drag.dragging) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      if (deltaY <= 0 || Math.abs(deltaX) >= Math.abs(deltaY) || (dialog?.scrollTop ?? 0) > 0) {
        drag.eligible = false;
        return;
      }

      drag.dragging = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events (including browser component tests) may not
        // register an active native pointer. Drag tracking still works without capture.
      }
      setIsDragging(true);
    }

    event.preventDefault();
    const nextOffset = Math.max(0, deltaY);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const handleSheetPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldDismiss = drag.dragging && dragOffsetRef.current >= Math.max(1, swipeThreshold);
    resetDrag();
    if (shouldDismiss) onDismissRef.current();
  };

  const resolvedTopOffset = typeof topOffset === 'number' ? `${Math.max(0, topOffset)}px` : topOffset;
  const overlayStyle: CSSProperties = {
    zIndex: `calc(var(--z-overlay) + ${Math.max(0, stackLevel)} * var(--z-overlay-step))`,
  };
  const dialogStyle: CSSProperties = {
    maxHeight: `calc(100dvh - ${resolvedTopOffset})`,
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
  };

  return createPortal(
    <div
      className={cn('fixed inset-0 bg-overlay', overlayClassName)}
      style={overlayStyle}
      onPointerDown={handleOverlayPointerDown}
    >
      <Surface
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain rounded-b-none rounded-t-[32px] bg-surface px-[var(--space-mobile-rail)] pb-[max(var(--space-8),env(safe-area-inset-bottom))] pt-3 shadow-overlay outline-none transition-transform duration-base ease-standard motion-reduce:transition-none max-md:shadow-none',
          isDragging && 'select-none duration-0',
          className,
        )}
        style={dialogStyle}
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerEnd}
        onPointerCancel={handleSheetPointerEnd}
      >
        <span
          aria-hidden="true"
          data-bottom-sheet-handle
          className="mx-auto mb-5 block h-1 w-8 touch-none rounded-control bg-surface-muted"
        />
        {children}
      </Surface>
    </div>,
    document.body,
  );
}
