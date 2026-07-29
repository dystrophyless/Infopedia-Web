import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from 'react-router-dom';
import type { Term } from '../../../types';
import { FavoriteToggle } from '../../favorites/components';
import { normalizeDefinitionPreviewText } from '../model';
import { DefinitionMetadata } from './DefinitionMetadata';

export interface TermCardProps {
  term: Term;
  relatedTerms?: Pick<Term, 'public_id' | 'name'>[];
  backTo?: string;
}

export function TermCard({ term, relatedTerms = [], backTo = '/search' }: TermCardProps) {
  const definition = term.definitions?.[0];

  return (
    <article className="relative rounded-[15px] border border-border bg-surface transition-colors max-md:rounded-[16px] max-md:border-0 max-md:p-2">
      <Link
        to={`/terms/${term.public_id}`}
        state={{ backTo, term, relatedTerms }}
        className="group block rounded-[12px] p-8 max-md:rounded-[12px] max-md:bg-white max-md:p-4"
      >
        <div className="flex items-start gap-4 pr-14">
          <div className="min-w-0 flex-1">
            <h3 className="text-[24px] font-medium leading-6 text-text max-md:text-[20px] max-md:leading-5">{term.name}</h3>
            {definition && (
              <p className="mt-3 line-clamp-3 max-w-[760px] whitespace-pre-line text-[15px] leading-[15px] text-text-body max-md:text-[16px] max-md:leading-4">
                {normalizeDefinitionPreviewText(definition.text)}
              </p>
            )}
          </div>
          <span className="mt-1 mr-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 text-muted transition-colors group-hover:border-accent/50 group-hover:text-accent" aria-hidden="true">
            <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />
          </span>
        </div>
        <DefinitionMetadata definition={definition} variant="compact" />
      </Link>
      <FavoriteToggle
        termRef={term.public_id}
        termName={term.name}
        ensureStatus={false}
        className="absolute right-6 top-6 max-md:right-4 max-md:top-4"
      />
    </article>
  );
}
