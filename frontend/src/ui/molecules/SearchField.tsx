import { type KeyboardEvent, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { IconButton, Input, Spinner, type InputProps } from '../atoms';
import { cn } from '../utils/cn';

type SearchFieldBaseProps = Omit<InputProps, 'onChange' | 'onSubmit' | 'value' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  onSubmit?: () => void;
  clearOnEscape?: boolean;
};

type ClearableSearchFieldProps = {
  onClear: () => void;
  clearLabel: string;
};

type StaticSearchFieldProps = {
  onClear?: never;
  clearLabel?: never;
};

export type SearchFieldProps = SearchFieldBaseProps &
  (ClearableSearchFieldProps | StaticSearchFieldProps);

export function SearchField({
  value,
  onChange,
  onClear,
  clearLabel,
  className,
  containerClassName,
  leading,
  trailing,
  loading = false,
  loadingLabel,
  onSubmit,
  clearOnEscape = false,
  onKeyDown,
  disabled,
  ...props
}: SearchFieldProps) {
  const hasClearAction = Boolean(onClear && value.length > 0);
  const hasTrailingContent = hasClearAction || loading || Boolean(trailing);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;

    if (event.key === 'Enter') onSubmit?.();
    if (event.key === 'Escape' && clearOnEscape && value.length > 0) onClear?.();
  };

  return (
    <span className={cn('relative block', containerClassName)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-decorative-muted"
      >
        {leading ?? <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />}
      </span>
      <Input
        {...props}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-busy={loading || undefined}
        className={cn('pl-12', hasTrailingContent && 'pr-12', className)}
      />
      {hasTrailingContent && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading && <Spinner label={loadingLabel} className="text-action-secondary" />}
          {!loading && trailing}
          {!loading && onClear && value.length > 0 && (
            <IconButton
              aria-label={clearLabel}
              type="button"
              onClick={onClear}
              disabled={disabled}
              size="sm"
            >
              <span aria-hidden="true">x</span>
            </IconButton>
          )}
        </span>
      )}
    </span>
  );
}
