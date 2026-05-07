import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';

interface FeatureCardProps {
  icon: IconSvgElement;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="bg-surface rounded-[15px] shadow-feature px-[41px] py-[40px] flex flex-col gap-[30px] w-full max-w-[386px]">
      <header className="flex items-center gap-4">
        <HugeiconsIcon
          icon={icon}
          size={43}
          color="var(--color-accent)"
          strokeWidth={1.5}
        />
        <h3 className="font-medium text-[20px] text-text">{title}</h3>
      </header>
      <p className="text-[14px] text-muted whitespace-pre-line">{description}</p>
    </article>
  );
}
