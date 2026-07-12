import { type ReactNode, useId } from 'react';
import { Heading, Surface, Text } from '../atoms';
import { cn } from '../utils/cn';

export type StatusPanelTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'danger'
  | 'low'
  | 'review'
  | 'good'
  | 'excellent';
export type StatusPanelAnnouncement = 'off' | 'polite' | 'assertive';

export interface StatusPanelProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: StatusPanelTone;
  announce?: StatusPanelAnnouncement;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

const toneClasses: Record<StatusPanelTone, string> = {
  neutral: 'border-border-subtle bg-surface-subtle text-text-body',
  brand: 'border-border-interactive bg-surface-muted text-action-primary',
  success: 'border-success-accent/30 bg-success-surface text-success',
  danger: 'border-danger-accent/30 bg-danger-surface text-danger',
  low: 'border-status-low-border bg-status-low-surface text-status-low-foreground',
  review: 'border-status-review-border bg-status-review-surface text-status-review-foreground',
  good: 'border-status-good-border bg-status-good-surface text-status-good-foreground',
  excellent:
    'border-status-excellent-border bg-status-excellent-surface text-status-excellent-foreground',
};

export function StatusPanel({
  title,
  description,
  icon,
  action,
  tone = 'neutral',
  announce = 'off',
  headingLevel = 2,
  className,
}: StatusPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const role = announce === 'assertive' ? 'alert' : announce === 'polite' ? 'status' : 'region';

  return (
    <Surface
      as="section"
      role={role}
      aria-live={announce === 'off' ? undefined : announce}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn('flex items-start gap-3 border p-4', toneClasses[tone], className)}
    >
      {icon && (
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Heading id={titleId} level={headingLevel} size="card" tone="inherit">
          {title}
        </Heading>
        {description && (
          <Text id={descriptionId} tone="inherit" size="helper" className="mt-1 opacity-85">
            {description}
          </Text>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </Surface>
  );
}
