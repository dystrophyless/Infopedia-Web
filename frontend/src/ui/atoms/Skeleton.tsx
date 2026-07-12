import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type SkeletonShape = 'text' | 'rect' | 'rounded' | 'circle';

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  shape?: SkeletonShape;
  animated?: boolean;
  label?: string;
}

const shapeClasses: Record<SkeletonShape, string> = {
  text: 'h-4 rounded-xs',
  rect: 'rounded-none',
  rounded: 'rounded-surface',
  circle: 'aspect-square rounded-full',
};

export function Skeleton({
  shape = 'rounded',
  animated = true,
  label,
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      {...props}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-live={label ? 'polite' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'bg-surface-muted',
        shapeClasses[shape],
        animated && 'animate-pulse motion-reduce:animate-none',
        className,
      )}
    >
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
