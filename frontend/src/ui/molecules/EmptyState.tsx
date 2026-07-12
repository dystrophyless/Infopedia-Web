import { type ReactNode, useId } from 'react';
import { Button, Heading, Text } from '../atoms';
import { cn } from '../utils/cn';

type EmptyStateBaseProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  className?: string;
};

type EmptyStateActionProps =
  | { action: ReactNode; actionLabel?: never; onAction?: never }
  | { action?: never; actionLabel: string; onAction: () => void }
  | { action?: never; actionLabel?: never; onAction?: never };

export type EmptyStateProps = EmptyStateBaseProps & EmptyStateActionProps;

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex flex-col items-center text-center', className)}
    >
      {icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-muted text-action-secondary">
          {icon}
        </div>
      )}
      <Heading id={titleId} level={2} size="card">
        {title}
      </Heading>
      {description && (
        <Text className="mt-2 max-w-[320px]" tone="muted" size="helper">
          {description}
        </Text>
      )}
      {action && <div className="mt-5">{action}</div>}
      {!action && actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </section>
  );
}
