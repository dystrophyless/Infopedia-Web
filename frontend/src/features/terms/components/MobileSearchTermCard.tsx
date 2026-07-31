import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Definition, Term } from '../../../types';
import { FavoriteToggle } from '../../favorites/components';
import { normalizeDefinitionPreviewText } from '../model';

function bookChip(definition: Definition | undefined, t: TFunction): string | null {
  const book = definition?.topic?.book;
  if (!book?.publisher) return null;
  if (!book.grade) return book.publisher;
  return t('metadata.bookWithGrade', { publisher: book.publisher, grade: book.grade });
}

export interface MobileSearchTermCardProps {
  term: Term;
  relatedTerms?: Pick<Term, 'public_id' | 'name'>[];
  backTo?: string;
}

export function MobileSearchTermCard({
  term,
  relatedTerms = [],
  backTo = '/search',
}: MobileSearchTermCardProps) {
  const { t } = useTranslation();
  const definition = term.definitions?.[0];
  const source = bookChip(definition, t);
  const page =
    definition?.page !== undefined && definition.page !== null
      ? t('search.pageChip', { page: definition.page })
      : null;
  const chips = [source, page].filter(Boolean);

  return (
    <article className="flex flex-col gap-8 rounded-[16px] bg-white px-6 py-8 text-[#161519]">
      <div className="flex flex-col gap-6 px-2">
        <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_24px] items-start gap-6">
          <h2 className="min-w-0 w-full max-w-[274px] text-[20px] font-medium leading-[20px] text-[#161519]">
            {term.name}
          </h2>
          <FavoriteToggle
            termRef={term.public_id}
            termName={term.name}
            ensureStatus={false}
            appearance="mobile-card"
            className="-right-[10px] -top-[10px]"
          />
        </div>

        {definition && (
          <div className="relative h-24 overflow-hidden">
            <p className="line-clamp-6 whitespace-pre-line text-[16px] leading-none text-[#8c8698]">
              {normalizeDefinitionPreviewText(definition.text)}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent" />
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex h-6 flex-wrap items-center gap-2 overflow-hidden">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex h-6 max-w-full items-center rounded-[8px] bg-[#eae9ec] px-3 text-[12px] leading-none text-[#b1acb9]"
              >
                <span className="truncate">{chip}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        to={`/terms/${term.public_id}`}
        state={{ backTo, term, relatedTerms }}
        className="flex h-10 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[16px] font-medium leading-none text-[#efeaf8] transition-opacity hover:opacity-90"
      >
        {t('search.detailsCta')}
      </Link>
    </article>
  );
}
