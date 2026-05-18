import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Term } from '../types';

function preview(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export function TermCard({ term }: { term: Term }) {
  const { t } = useTranslation();
  const def = term.definitions?.[0];
  const topic = def?.topic;

  return (
    <Link
      to={`/terms/${term.id}`}
      state={{ backTo: '/search', term }}
      className="block rounded-[15px] border border-border bg-surface p-8 shadow-feature transition-shadow hover:shadow-card"
    >
      <h3 className="mb-3 text-[24px] font-medium text-text">{term.name}</h3>
      {def && (
        <p className="mb-4 text-[15px] leading-relaxed text-text-body">
          {preview(def.text)}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        {topic?.book?.name && <span>{topic.book.name}</span>}
        {topic?.name && (
          <span>
            {t('search.topic')}: {topic.name}
          </span>
        )}
        {def?.page !== undefined && (
          <span>
            {t('search.page')} {def.page}
          </span>
        )}
      </div>
    </Link>
  );
}
