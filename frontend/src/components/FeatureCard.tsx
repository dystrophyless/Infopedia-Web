import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  to?: string;
}

export function FeatureCard({ icon, title, description, to }: FeatureCardProps) {
  const content = (
    <article className="flex h-[216px] flex-col gap-[25px] overflow-hidden rounded-[15px] bg-surface px-[40px] py-[50px] shadow-feature max-md:h-auto">
      <header className="flex items-center gap-4">
        <div className="flex size-[45px] shrink-0 items-center justify-center rounded-[10px] bg-bg text-accent">
          {icon}
        </div>
        <h3 className="min-w-0 flex-1 whitespace-normal text-[24px] font-medium leading-[1.15] text-accent max-md:text-[20px]">
          {title}
        </h3>
      </header>
      <p className="text-[16px] leading-[1] text-muted max-md:text-[14px]">
        {description}
      </p>
    </article>
  );

  if (!to) {
    return <div className="w-full max-w-[422px]">{content}</div>;
  }

  return (
    <Link to={to} className="block w-full max-w-[422px]">
      {content}
    </Link>
  );
}
