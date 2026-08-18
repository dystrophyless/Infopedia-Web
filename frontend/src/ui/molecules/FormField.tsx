import { type ReactNode, useId } from 'react';
import { Text } from '../atoms';
import { cn } from '../utils/cn';

export interface FormFieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FormFieldProps {
  label?: ReactNode;
  controlId?: string;
  describedBy?: string;
  error?: ReactNode;
  helperText?: ReactNode;
  helperTone?: 'muted' | 'success';
  messageClassName?: string;
  className?: string;
  children: (controlProps: FormFieldControlProps) => ReactNode;
}

export function FormField({
  label,
  controlId,
  describedBy,
  error,
  helperText,
  helperTone = 'muted',
  messageClassName,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const resolvedControlId = controlId ?? `${generatedId}-control`;
  const messageId = `${generatedId}-message`;
  const hasMessage = Boolean(error || helperText);
  const descriptionIds =
    [describedBy, hasMessage ? messageId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={resolvedControlId}>
          <Text as="span" size="helper" className="font-medium text-text-body">
            {label}
          </Text>
        </label>
      )}
      {children({
        id: resolvedControlId,
        'aria-describedby': descriptionIds,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <Text
          id={messageId}
          tone="danger"
          size="helper"
          role="alert"
          className={cn('font-normal', messageClassName)}
        >
          {error}
        </Text>
      )}
      {!error && helperText && (
        <Text
          id={messageId}
          tone={helperTone === 'success' ? 'success' : 'muted'}
          size="helper"
          className={cn('font-normal', messageClassName)}
        >
          {helperText}
        </Text>
      )}
    </div>
  );
}
