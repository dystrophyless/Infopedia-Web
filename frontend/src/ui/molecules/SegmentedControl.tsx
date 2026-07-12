import { type ReactNode, useId, useState } from 'react';
import { cn } from '../utils/cn';

export type SegmentedControlOption<T extends string> = { value: T; label: ReactNode; disabled?: boolean };
export interface SegmentedControlProps<T extends string> {
  name: string;
  label: ReactNode;
  labelHidden?: boolean;
  options: readonly SegmentedControlOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({ name, label, labelHidden = false, options, value, defaultValue, onValueChange, disabled = false, className }: SegmentedControlProps<T>) {
  const generatedId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultValue);
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : uncontrolledValue;
  const select = (nextValue: T) => {
    if (!controlled) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };
  return (
    <fieldset className={cn('min-w-0 border-0 p-0', className)} disabled={disabled}>
      <legend className={labelHidden ? 'sr-only' : 'mb-2 text-[14px] font-medium text-text-body'}>{label}</legend>
      <div className="inline-flex max-w-full rounded-control bg-surface-muted p-1" aria-label={labelHidden ? String(label) : undefined}>
        {options.map((option) => {
          const id = `${generatedId}-${option.value}`;
          const optionDisabled = disabled || Boolean(option.disabled);
          return <label key={option.value} htmlFor={id} className="cursor-pointer rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-[14px] font-medium text-text-body transition-colors duration-fast ease-standard has-[:checked]:bg-surface has-[:checked]:text-action-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input id={id} type="radio" name={name} value={option.value} checked={selectedValue === option.value} disabled={optionDisabled} onChange={() => select(option.value)} className="sr-only" />
            {option.label}
          </label>;
        })}
      </div>
    </fieldset>
  );
}
