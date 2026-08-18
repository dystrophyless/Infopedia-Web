import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Text } from '../atoms';
import { cn } from '../utils/cn';

export interface RadioOptionProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children' | 'className' | 'name' | 'value'
> {
  name: string;
  value: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  inputClassName?: string;
}

export const RadioOption = forwardRef<HTMLInputElement, RadioOptionProps>(
  ({ name, value, icon, children, className, inputClassName, disabled, ...props }, ref) => (
    <label
      className={cn(
        'flex min-h-[var(--control-height-lg)] w-full cursor-pointer items-center gap-4 rounded-[var(--radius-control)] bg-surface px-6 text-left outline-none transition-colors duration-fast ease-standard hover:bg-surface-muted/60 has-[:checked]:bg-surface-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        className,
      )}
    >
      <input
        {...props}
        ref={ref}
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        className={cn('size-4 shrink-0 accent-action-primary', inputClassName)}
      />
      {icon && (
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center text-action-secondary">
          {icon}
        </span>
      )}
      <Text as="span" className="min-w-0 flex-1" size="body">
        {children}
      </Text>
    </label>
  ),
);

RadioOption.displayName = 'RadioOption';
