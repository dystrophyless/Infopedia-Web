import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Button, Text } from '../atoms';
import { cn } from '../utils/cn';

export interface ActionRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
}

export function ActionRow({
  icon,
  title,
  description,
  trailing,
  className,
  type = 'button',
  ...props
}: ActionRowProps) {
  return (
    <Button
      type={type}
      variant="surface"
      fullWidth
      className={cn('min-h-[64px] justify-start gap-3 px-4 py-3 text-left', className)}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <Text as="span" className="block font-medium text-text" size="body">
          {title}
        </Text>
        {description && (
          <Text as="span" className="mt-0.5 block" tone="muted" size="helper">
            {description}
          </Text>
        )}
      </span>
      {trailing}
    </Button>
  );
}
