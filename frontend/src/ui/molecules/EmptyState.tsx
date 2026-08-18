import { type HTMLAttributes, type ReactNode, useId } from 'react';
import { Button, Heading, Text } from '../atoms';
import { cn } from '../utils/cn';

type EmptyStateVariant = 'default' | 'outcome';
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

export type EmptyStatePartProps = {
  icon?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  iconGlyph?: HTMLAttributes<HTMLSpanElement> & DataAttributes;
  title?: HTMLAttributes<HTMLHeadingElement> & DataAttributes;
  description?: HTMLAttributes<HTMLElement> & DataAttributes;
  action?: HTMLAttributes<HTMLDivElement> & DataAttributes;
};

type EmptyStateBaseProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & DataAttributes & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  variant?: EmptyStateVariant;
  partProps?: EmptyStatePartProps;
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
  variant = 'default',
  partProps,
  className,
  ...sectionProps
}: EmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null;
  const resolvedTitleId = partProps?.title?.id ?? titleId;
  const resolvedDescriptionId = partProps?.description?.id ?? descriptionId;
  const labelledBy = sectionProps['aria-labelledby'] ?? resolvedTitleId;
  const describedBy = sectionProps['aria-describedby'] ?? (hasDescription ? resolvedDescriptionId : undefined);
  const {
    className: iconClassName,
    ...iconProps
  } = partProps?.icon ?? {};
  const {
    className: iconGlyphClassName,
    ...iconGlyphProps
  } = partProps?.iconGlyph ?? {};
  const {
    className: titleClassName,
    ...titleProps
  } = partProps?.title ?? {};
  const {
    className: descriptionClassName,
    ...descriptionProps
  } = partProps?.description ?? {};
  const {
    className: actionClassName,
    ...actionProps
  } = partProps?.action ?? {};
  const outcome = variant === 'outcome';

  return (
    <section
      {...sectionProps}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn(
        'flex flex-col items-center text-center',
        outcome && 'w-full max-w-[382px]',
        className,
      )}
    >
      {icon && (
        <div
          {...iconProps}
          className={cn(
            'mb-4 flex size-16 items-center justify-center rounded-full bg-surface-muted text-action-secondary',
            iconClassName,
          )}
        >
          {outcome ? (
            <span
              {...iconGlyphProps}
              className={cn('flex size-8 items-center justify-center [&>svg]:size-full', iconGlyphClassName)}
            >
              {icon}
            </span>
          ) : icon}
        </div>
      )}
      <Heading
        {...titleProps}
        id={resolvedTitleId}
        level={2}
        size="card"
        className={cn(outcome && 'text-[20px] leading-[20px]', titleClassName)}
      >
        {title}
      </Heading>
      {hasDescription && (
        <Text
          {...descriptionProps}
          id={resolvedDescriptionId}
          className={cn(
            outcome ? 'mt-4 w-full max-w-[320px] text-[14px] leading-[14px]' : 'mt-2 max-w-[320px]',
            descriptionClassName,
          )}
          tone="muted"
          size="helper"
        >
          {description}
        </Text>
      )}
      {(action || actionLabel) && (
        <div
          {...actionProps}
          className={cn(outcome ? 'mt-6 w-full' : 'mt-5', actionClassName)}
        >
          {action ?? (
            <Button fullWidth={outcome} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
