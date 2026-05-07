import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Term } from '../types';

function preview(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export function TermCard({ term }: { term: Term }) {
  const { t } = useTranslation();
  const def = term.definitions?.[0];
  const topic = def?.topic;

  return (
    <Link
      to={`/terms/${term.id}`}
      className="block bg-surface border border-border rounded-[15px] p-8 shadow-feature hover:shadow-card transition-all hover:-translate-y-0.5"
    >
      <h3 className="font-medium text-[24px] text-text mb-3">{term.name}</h3>
      {def && ( 
        <p className="text-[15px] text-text-body mb-4 leading-relaxed">
          {preview(def.text)}
        </p>
      )}
      <div className="text-[13px] text-muted flex flex-wrap gap-x-4 gap-y-1">
        {topic?.book?.title && <span>{topic.book.title}</span>}
        {topic?.title && (
          <span>
            {t('search.topic')}: {topic.title}
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
