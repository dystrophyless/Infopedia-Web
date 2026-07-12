import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';

export interface TestEntryLinkProps {
  title: string;
  description: string;
  to: string;
  icon?: ReactNode;
  className?: string;
}

export function TestEntryLink({ title, description, to, icon, className = '' }: TestEntryLinkProps) {
  return (
    <Link
      to={to}
      className={`flex min-h-[70px] items-center gap-6 rounded-[16px] bg-[#fbfbfb] px-6 py-4 transition-opacity hover:opacity-90 ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium leading-[16px] text-[#6a37c3]">
          {title}
        </span>
        <span className="mt-2 block text-[14px] font-normal leading-[14px] text-[#524d5b]">
          {description}
        </span>
      </span>
      {icon ?? (
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          size={24}
          strokeWidth={1.8}
          className="shrink-0 text-[#6a37c3]"
          aria-hidden
        />
      )}
    </Link>
  );
}
