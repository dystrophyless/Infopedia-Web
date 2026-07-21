import { type ReactNode, useId } from 'react';
import { Surface, Text } from '../atoms';
import { cn } from '../utils/cn';

export type StatCardTone = 'neutral' | 'brand' | 'inverse' | 'success' | 'danger';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  tone?: StatCardTone;
  className?: string;
}

const toneClasses: Record<StatCardTone, string> = {
  neutral: 'border border-border-subtle bg-surface text-text-body',
  brand: 'bg-surface-muted text-action-primary',
  inverse: 'bg-surface-inverse text-inverse',
  success: 'bg-success-surface text-success',
  danger: 'bg-danger-surface text-danger',
};

export function StatCard({
  label,
  value,
  description,
  icon,
  badge,
  action,
  tone = 'neutral',
  className,
}: StatCardProps) {
  const labelId = useId();

  return (
    <Surface
      as="article"
      aria-labelledby={labelId}
      className={cn('flex min-w-0 flex-col gap-3 p-5', toneClasses[tone], className)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Text id={labelId} as="span" tone="inherit" size="helper" className="block">
            {label}
          </Text>
          <Text as="div" tone="inherit" className="mt-1 text-card-title font-medium leading-none">
            {value}
          </Text>
        </div>
        {icon && (
          <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
            {icon}
          </span>
        )}
      </div>
      {description && (
        <Text tone="inherit" size="helper">
          {description}
        </Text>
      )}
      {(badge || action) && (
        <div className="mt-auto flex items-center justify-between gap-3">
          <div>{badge}</div>
          <div>{action}</div>
        </div>
      )}
    </Surface>
  );
}
