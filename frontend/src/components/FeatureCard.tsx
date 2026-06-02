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
    <article className="flex h-[216px] flex-col gap-[25px] overflow-hidden rounded-[15px] bg-surface px-[40px] py-[50px] shadow-feature transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0_#9683b7] group-focus-visible:-translate-y-2 group-focus-visible:shadow-[8px_8px_0_#9683b7] max-md:h-auto">
      <header className="flex items-center gap-4">
        <div className="flex size-[45px] shrink-0 items-center justify-center rounded-[10px] bg-bg text-accent transition-all duration-200 ease-out group-hover:scale-110 group-hover:bg-accent group-hover:text-surface group-focus-visible:scale-110 group-focus-visible:bg-accent group-focus-visible:text-surface">
          {icon}
        </div>
        <h3 className="min-w-0 flex-1 whitespace-normal text-[24px] font-medium leading-[1.15] text-accent transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 max-md:text-[20px]">
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
    <Link
      to={to}
      className="group block w-full max-w-[422px] rounded-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {content}
    </Link>
  );
}
