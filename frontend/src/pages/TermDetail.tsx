import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { Term } from '../types';

interface TermDetailState {
  backTo?: string;
  term?: Term;
  selectedDefinitionId?: number;
}

export function TermDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const state = (location.state as TermDetailState | null) ?? null;
  const term = state?.term ?? null;
  const definitions = term?.definitions ?? [];
  const selectedDefinitionId = state?.selectedDefinitionId;
  const [index, setIndex] = useState(() => {
    if (selectedDefinitionId === undefined) {
      return 0;
    }

    const selectedIndex = definitions.findIndex(
      (definition) => definition.id === selectedDefinitionId,
    );

    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  if (!term || String(term.id) !== id) {
    return <Navigate to={isAuthenticated ? '/search' : '/'} replace />;
  }

  const total = definitions.length;
  const current = definitions[index];
  const backTo = state?.backTo ?? (isAuthenticated ? '/search' : '/');

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-2 text-[14px] text-muted hover:text-accent"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} />
        {t('termDetail.back')}
      </Link>

      <h1 className="mb-8 text-[44px] font-medium text-text max-md:text-[30px]">
        {term.name}
      </h1>

      {total === 0 && (
        <p className="py-8 text-center text-muted">
          {t('termDetail.noDefinitions')}
        </p>
      )}

      {current && (
        <article className="rounded-[15px] border border-border bg-surface p-10 shadow-card max-md:p-6">
          <p className="mb-6 text-[20px] leading-relaxed text-text max-md:text-[16px]">
            {current.text}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
            {current.topic?.book?.name && (
              <span>{current.topic.book.name}</span>
            )}
            {current.topic?.name && <span>{current.topic.name}</span>}
            <span>
              {t('search.page')} {current.page}
            </span>
          </div>
        </article>
      )}

      {total > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-2 rounded-[10px] border border-border px-5 py-3 text-text-body transition-colors hover:bg-surface disabled:opacity-40"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.7} />
            {t('common.previous')}
          </button>
          <span className="text-[16px] text-muted">
            {t('termDetail.counter', { current: index + 1, total })}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            className="flex items-center gap-2 rounded-[10px] border border-border px-5 py-3 text-text-body transition-colors hover:bg-surface disabled:opacity-40"
          >
            {t('common.next')}
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.7} />
          </button>
        </div>
      )}
    </div>
  );
}
