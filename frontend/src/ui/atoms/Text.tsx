import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type TextTone = 'body' | 'muted' | 'danger' | 'success' | 'inherit';
export type TextSize = 'body' | 'helper' | 'caption';

const toneClasses: Record<TextTone, string> = {
  body: 'text-text-body',
  muted: 'text-muted',
  danger: 'text-danger',
  success: 'text-success',
  inherit: 'text-inherit',
};

const sizeClasses: Record<TextSize, string> = {
  body: 'text-[var(--type-body-size)] leading-none',
  helper: 'text-[var(--type-helper-size)] leading-none',
  caption: 'text-[var(--type-caption-size)] leading-none',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd';
  tone?: TextTone;
  size?: TextSize;
  children: ReactNode;
}

export function Text({
  as: Tag = 'p',
  tone = 'body',
  size = 'body',
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Tag className={cn(toneClasses[tone], sizeClasses[size], className)} {...props}>
      {children}
    </Tag>
  );
}
