import { type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { Text } from '../atoms';
import { cn } from '../utils/cn';

export interface ChoiceGroupProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'children'
> {
  label: ReactNode;
  labelHidden?: boolean;
  children: ReactNode;
}

export function ChoiceGroup({
  label,
  labelHidden = true,
  className,
  children,
  ...props
}: ChoiceGroupProps) {
  return (
    <fieldset className={cn('min-w-0 space-y-2 border-0 p-0', className)} {...props}>
      <legend className={labelHidden ? 'sr-only' : 'mb-2'}>
        <Text as="span" size="helper" className="font-medium">
          {label}
        </Text>
      </legend>
      {children}
    </fieldset>
  );
}
