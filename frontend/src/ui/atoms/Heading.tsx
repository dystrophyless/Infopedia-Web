import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeadingSize = 'screen' | 'section' | 'card';
export type HeadingTone = 'default' | 'inherit';

const sizeClasses: Record<HeadingSize, string> = {
  screen: 'text-[var(--type-screen-title-size)] leading-tight',
  section: 'text-[var(--type-section-title-size)] leading-snug',
  card: 'text-[var(--type-card-title-size)] leading-snug',
};

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  size?: HeadingSize;
  tone?: HeadingTone;
  children: ReactNode;
}

export function Heading({
  level = 2,
  size = 'section',
  tone = 'default',
  className,
  children,
  ...props
}: HeadingProps) {
  const headingClassName = cn(
    'font-medium',
    tone === 'inherit' ? 'text-inherit' : 'text-text',
    sizeClasses[size],
    className,
  );

  if (level === 1) return <h1 className={headingClassName} {...props}>{children}</h1>;
  if (level === 3) return <h3 className={headingClassName} {...props}>{children}</h3>;
  if (level === 4) return <h4 className={headingClassName} {...props}>{children}</h4>;

  return <h2 className={headingClassName} {...props}>{children}</h2>;
}
