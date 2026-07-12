import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';
import { Text } from '../atoms';
import { cn } from '../utils/cn';

export type CheckboxOptionVariant = 'surface' | 'outlined' | 'plain';
export type CheckboxOptionInputPosition = 'start' | 'end';

export interface CheckboxOptionProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children' | 'className'
> {
  icon?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  indeterminate?: boolean;
  variant?: CheckboxOptionVariant;
  inputPosition?: CheckboxOptionInputPosition;
  className?: string;
  inputClassName?: string;
}

const variantClasses: Record<CheckboxOptionVariant, string> = {
  surface: 'bg-surface hover:bg-surface-muted/60 has-[:checked]:bg-surface-muted',
  outlined:
    'border border-border-interactive bg-surface hover:bg-surface-subtle has-[:checked]:border-action-selected has-[:checked]:bg-surface-muted',
  plain: 'bg-transparent hover:bg-surface-subtle has-[:checked]:bg-surface-muted',
};

export const CheckboxOption = forwardRef<HTMLInputElement, CheckboxOptionProps>(
  (
    {
      icon,
      children,
      description,
      trailing,
      indeterminate = false,
      variant = 'surface',
      inputPosition = 'start',
      className,
      inputClassName,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const generatedId = useId();
    const descriptionId = `${generatedId}-description`;
    const describedBy =
      [ariaDescribedBy, description ? descriptionId : undefined].filter(Boolean).join(' ') ||
      undefined;

    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <label
        className={cn(
          'flex min-h-control-lg w-full cursor-pointer items-center gap-4 rounded-control px-4 py-2 text-left outline-none transition-colors duration-fast ease-standard has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
          variantClasses[variant],
          className,
        )}
      >
        <input
          {...props}
          ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          type="checkbox"
          disabled={disabled}
          aria-describedby={describedBy}
          aria-checked={indeterminate ? 'mixed' : props.checked}
          className={cn(
            'size-5 shrink-0 accent-action-primary',
            inputPosition === 'end' && 'order-last',
            inputClassName,
          )}
        />
        {icon && (
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center text-action-secondary"
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <Text as="span" className="block" size="body">
            {children}
          </Text>
          {description && (
            <Text id={descriptionId} as="span" className="mt-0.5 block" tone="muted" size="helper">
              {description}
            </Text>
          )}
        </span>
        {trailing && <span className="shrink-0">{trailing}</span>}
      </label>
    );
  },
);

CheckboxOption.displayName = 'CheckboxOption';
