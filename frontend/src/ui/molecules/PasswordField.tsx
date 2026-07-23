import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { FormField } from './FormField';
import { IconButton, Input, type InputProps } from '../atoms';
import { cn } from '../utils/cn';

export interface PasswordFieldProps extends Omit<
  InputProps,
  'type' | 'value' | 'onChange' | 'className' | 'invalid'
> {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  toggleLabel: string;
  error?: string;
  invalid?: boolean;
  className?: string;
  messageClassName?: string;
  inputClassName?: string;
  leadingIconClassName?: string;
  toggleClassName?: string;
}

export function PasswordField({
  label,
  value,
  visible,
  onChange,
  onToggle,
  toggleLabel,
  error,
  invalid,
  className,
  messageClassName,
  inputClassName,
  leadingIconClassName,
  toggleClassName,
  id,
  disabled,
  required = true,
  placeholder,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  ...inputProps
}: PasswordFieldProps) {
  return (
    <FormField
      controlId={id}
      describedBy={describedBy}
      error={error}
      className={className}
      messageClassName={messageClassName}
    >
      {(controlProps) => (
        <span className="relative block">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-decorative-muted',
              leadingIconClassName,
            )}
          >
            <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={1.7} />
          </span>
          <Input
            {...inputProps}
            {...controlProps}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            required={required}
            placeholder={placeholder ?? label}
            aria-label={ariaLabel ?? label}
            invalid={Boolean(error || invalid)}
            className={inputClassName}
          />
          <IconButton
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={toggleLabel}
            className={cn('absolute right-3 top-1/2 -translate-y-1/2', toggleClassName)}
          >
            <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} size={18} strokeWidth={1.7} />
          </IconButton>
        </span>
      )}
    </FormField>
  );
}
