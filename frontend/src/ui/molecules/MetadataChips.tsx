import { Chip } from '../atoms';
import { cn } from '../utils/cn';

export interface MetadataChipItem {
  id?: string;
  label?: string;
  value: string;
  tone?: 'neutral' | 'brand' | 'success' | 'danger';
}

export function MetadataChips({
  items,
  className,
}: {
  items: MetadataChipItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={cn('flex list-none flex-wrap gap-2 p-0', className)}>
      {items.map((item, index) => (
        <li key={item.id ?? `${item.label ?? 'value'}-${item.value}-${index}`}>
          <Chip tone={item.tone}>
            {item.label ? `${item.label}: ${item.value}` : item.value}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
