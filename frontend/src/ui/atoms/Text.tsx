import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

type TextTone = 'body' | 'muted' | 'danger' | 'success';
type TextSize = 'body' | 'helper' | 'caption';

const toneClasses: Record<TextTone, string> = {
  body: 'text-text-body',
  muted: 'text-muted',
  danger: 'text-danger',
  success: 'text-success',
};

const sizeClasses: Record<TextSize, string> = {
  body: 'text-[var(--type-body-size)] leading-snug',
  helper: 'text-[var(--type-helper-size)] leading-snug',
  caption: 'text-[var(--type-caption-size)] leading-tight',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span';
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
