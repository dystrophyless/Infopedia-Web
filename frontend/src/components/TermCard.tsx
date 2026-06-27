import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { Term } from '../types';
import { DefinitionMetadata } from './DefinitionMetadata';

function previewText(text: string): string {
  return text.trim().replace(/\n{2,}/g, '\n');
}

export function TermCard({ term }: { term: Term }) {
  const def = term.definitions?.[0];

  return (
    <Link
      to={`/terms/${term.public_id}`}
      state={{ backTo: '/search', term }}
      className="group block rounded-[15px] border border-border bg-surface p-8 shadow-feature transition-shadow hover:shadow-card max-md:p-6 max-md:shadow-none max-md:hover:shadow-none"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[24px] font-medium leading-tight text-text max-md:text-[21px]">
            {term.name}
          </h3>
          {def && (
            <p className="mt-3 line-clamp-3 max-w-[760px] whitespace-pre-line text-[15px] leading-relaxed text-text-body">
              {previewText(def.text)}
            </p>
          )}
        </div>
        <span
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted transition-colors group-hover:border-accent/50 group-hover:text-accent"
          aria-hidden="true"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />
        </span>
      </div>
      <DefinitionMetadata definition={def} variant="compact" />
    </Link>
  );
}
