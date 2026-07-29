import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';

export type SurfaceTone =
  | 'plain'
  | 'card'
  | 'canvas'
  | 'soft'
  | 'subtle'
  | 'inverse'
  | 'transparent';
export type SurfaceVariant = 'default' | 'mobile-flat';
export type SurfaceElement =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'nav'
  | 'main'
  | 'header'
  | 'footer';

const toneClasses: Record<SurfaceTone, string> = {
  plain: 'bg-surface',
  card: 'bg-surface',
  canvas: 'bg-canvas',
  soft: 'bg-bg',
  subtle: 'bg-surface-subtle',
  inverse: 'bg-surface-inverse text-inverse',
  transparent: 'bg-transparent',
};

const variantClasses: Record<SurfaceVariant, string> = {
  default: '',
  'mobile-flat': 'max-md:rounded-none',
};

type SurfaceOwnProps<E extends SurfaceElement> = {
  as?: E;
  tone?: SurfaceTone;
  variant?: SurfaceVariant;
  children: ReactNode;
};

export type SurfaceProps<E extends SurfaceElement = 'div'> = SurfaceOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof SurfaceOwnProps<E>>;

type SurfaceComponent = {
  <E extends SurfaceElement = 'div'>(
    props: SurfaceProps<E> & { ref?: ComponentPropsWithRef<E>['ref'] },
  ): ReactElement | null;
  displayName?: string;
};

function SurfaceRender<E extends SurfaceElement = 'div'>(
  { as, tone = 'plain', variant = 'default', className, children, ...props }: SurfaceProps<E>,
  ref: ComponentPropsWithRef<E>['ref'],
) {
  const Component = (as ?? 'div') as ElementType;

  return (
    <Component
      {...props}
      ref={ref}
      className={cn('rounded-surface', toneClasses[tone], variantClasses[variant], className)}
    >
      {children}
    </Component>
  );
}

export const Surface = forwardRef(SurfaceRender as never) as unknown as SurfaceComponent;
Surface.displayName = 'Surface';
