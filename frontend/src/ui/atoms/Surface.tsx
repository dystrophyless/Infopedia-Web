import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

type SurfaceTone = 'plain' | 'card' | 'soft';

const toneClasses: Record<SurfaceTone, string> = {
  plain: 'bg-surface',
  card: 'bg-surface shadow-feature max-md:shadow-none',
  soft: 'bg-bg',
};

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  children: ReactNode;
}

export function Surface({ tone = 'plain', className, children, ...props }: SurfaceProps) {
  return (
    <div
      className={cn('rounded-[var(--radius-surface)]', toneClasses[tone], className)}
      {...props}
    >
      {children}
    </div>
  );
}
