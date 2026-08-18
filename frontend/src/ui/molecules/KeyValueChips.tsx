import { type ReactNode } from 'react';
import { Text } from '../atoms';
import { cn } from '../utils/cn';

export type KeyValueChipTone = 'neutral' | 'brand' | 'success' | 'danger';

export interface KeyValueChipItem {
  id?: string;
  label: ReactNode;
  value: ReactNode;
  tone?: KeyValueChipTone;
}

export interface KeyValueChipsProps {
  items: KeyValueChipItem[];
  className?: string;
}

const toneClasses: Record<KeyValueChipTone, string> = {
  neutral: 'bg-surface text-text-body',
  brand: 'bg-surface-muted text-action-primary',
  success: 'bg-success-surface text-success',
  danger: 'bg-danger-surface text-danger',
};

export function KeyValueChips({ items, className }: KeyValueChipsProps) {
  if (items.length === 0) return null;

  return (
    <dl className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className={cn(
            'inline-flex min-h-8 min-w-0 max-w-full items-center gap-1 rounded-control px-3 py-1 text-helper',
            toneClasses[item.tone ?? 'neutral'],
          )}
        >
          <Text as="dt" tone="inherit" size="helper" className="shrink-0">
            {item.label}:
          </Text>
          <Text as="dd" tone="inherit" size="helper" className="min-w-0 truncate font-medium">
            {item.value}
          </Text>
        </div>
      ))}
    </dl>
  );
}
