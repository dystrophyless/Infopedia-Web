import { useTranslation } from 'react-i18next';
import type { Definition } from '../types';

export function SemanticResultCard({ definition }: { definition: Definition }) {
  const { t } = useTranslation();

  return (
    <article className="bg-surface border border-border rounded-[15px] p-10 shadow-card max-md:p-6">
      <p className="text-[20px] text-text leading-relaxed mb-6 max-md:text-[16px]">
        {definition.text}
      </p>
      <div className="text-[14px] text-muted flex flex-wrap gap-x-4 gap-y-1">
        {definition.topic?.book?.title && <span>{definition.topic.book.title}</span>}
        {definition.topic?.title && <span>{definition.topic.title}</span>}
        <span>
          {t('search.page')} {definition.page}
        </span>
      </div>
    </article>
  );
}
