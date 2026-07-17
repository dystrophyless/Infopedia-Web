import { type ReactNode, useId } from 'react';
import { Heading, Text, type HeadingLevel, type HeadingSize } from '../atoms';
import { cn } from '../utils/cn';

export type PageHeaderAlign = 'start' | 'center';

export interface PageHeaderProps {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  headingLevel?: HeadingLevel;
  titleSize?: HeadingSize;
  align?: PageHeaderAlign;
  className?: string;
}

export function PageHeader({
  title,
  titleId,
  description,
  descriptionClassName,
  eyebrow,
  eyebrowClassName,
  leading,
  trailing,
  actions,
  headingLevel = 1,
  titleSize = 'screen',
  align = 'start',
  className,
}: PageHeaderProps) {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? `${generatedId}-title`;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-start gap-3">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <Text
              as="div"
              tone="muted"
              size="helper"
              className={cn('mb-1 font-medium uppercase tracking-wide', eyebrowClassName)}
            >
              {eyebrow}
            </Text>
          )}
          <Heading id={resolvedTitleId} level={headingLevel} size={titleSize}>
            {title}
          </Heading>
          {description && (
            <Text className={cn('mt-2 max-w-[760px]', descriptionClassName)} tone="muted">
              {description}
            </Text>
          )}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
