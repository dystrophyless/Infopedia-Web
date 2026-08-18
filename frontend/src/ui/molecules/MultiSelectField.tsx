import { type ReactNode, useId } from 'react';
import { Chip, IconButton, Text } from '../atoms';
import { cn } from '../utils/cn';

export interface MultiSelectFieldItem {
  id: string;
  label: string;
}

export type MultiSelectFieldProps = {
  label: ReactNode;
  selectedItems: MultiSelectFieldItem[];
  placeholder: string;
  openLabel: string;
  onOpen: () => void;
  expanded?: boolean;
  disabled?: boolean;
  error?: ReactNode;
  helperText?: ReactNode;
  leading?: ReactNode;
  openIcon?: ReactNode;
  className?: string;
  controlClassName?: string;
  /** Enables per-item removal when paired with `getRemoveLabel`. */
  onRemove?: (itemId: string) => void;
  /** Accessible label for removal controls; used only when `onRemove` is provided. */
  getRemoveLabel?: (item: MultiSelectFieldItem) => string;
};

export function MultiSelectField({
  label,
  selectedItems,
  placeholder,
  openLabel,
  onOpen,
  expanded = false,
  disabled = false,
  error,
  helperText,
  leading,
  openIcon,
  onRemove,
  getRemoveLabel,
  className,
  controlClassName,
}: MultiSelectFieldProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const messageId = `${generatedId}-message`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Text id={labelId} as="span" size="helper" className="font-medium text-text-body">
        {label}
      </Text>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error || helperText ? messageId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex min-h-control-lg w-full items-center gap-2 rounded-control border border-border-interactive bg-surface px-3 py-2 text-left transition-[border-color,box-shadow] duration-fast ease-standard focus-within:border-action-selected focus-within:ring-2 focus-within:ring-focus/25',
          Boolean(error) && 'border-danger-accent focus-within:border-danger-accent',
          disabled && 'cursor-not-allowed opacity-60',
          controlClassName,
        )}
      >
          {leading && (
            <span aria-hidden="true" className="shrink-0 text-action-secondary">
              {leading}
            </span>
          )}
          {selectedItems.length > 0 ? (
            <ul className="flex min-w-0 flex-1 list-none flex-wrap gap-2 p-0">
              {selectedItems.map((item) => (
                <li key={item.id} className="min-w-0 max-w-full">
                  <Chip tone="brand" className="max-w-full gap-1 rounded-[var(--radius-pill)]">
                    <span className="min-w-0 truncate">{item.label}</span>
                    {onRemove && getRemoveLabel && (
                      <IconButton
                        aria-label={getRemoveLabel(item)}
                        size="sm"
                        variant="primary"
                        disabled={disabled}
                        className="-mr-2 size-7 rounded-full"
                        onClick={() => onRemove(item.id)}
                      >
                        <span aria-hidden="true">x</span>
                      </IconButton>
                    )}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <Text as="span" tone="muted" className="min-w-0 flex-1 truncate">
              {placeholder}
            </Text>
          )}
          <IconButton
            aria-label={openLabel}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            size="sm"
            disabled={disabled}
            onClick={onOpen}
            className="ml-auto"
          >
            {openIcon ?? <span aria-hidden="true">v</span>}
          </IconButton>
      </div>
      {error && (
        <Text id={messageId} role="alert" tone="danger" size="helper">
          {error}
        </Text>
      )}
      {!error && helperText && (
        <Text id={messageId} tone="muted" size="helper">
          {helperText}
        </Text>
      )}
    </div>
  );
}
