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
import { DefinitionMetadata } from '../components/DefinitionMetadata';

interface TermDetailState {
  backTo?: string;
  term?: Term;
  selectedDefinitionPublicId?: string;
}

export function TermDetail() {
  const { termRef } = useParams<{ termRef: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const state = (location.state as TermDetailState | null) ?? null;
  const term = state?.term ?? null;
  const definitions = term?.definitions ?? [];
  const selectedDefinitionPublicId = state?.selectedDefinitionPublicId;
  const [index, setIndex] = useState(() => {
    if (selectedDefinitionPublicId === undefined) {
      return 0;
    }

    const selectedIndex = definitions.findIndex(
      (definition) => definition.public_id === selectedDefinitionPublicId,
    );

    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  if (!term || term.public_id !== termRef) {
    return <Navigate to={isAuthenticated ? '/search' : '/'} replace />;
  }

  const total = definitions.length;
  const current = definitions[index];
  const backTo = state?.backTo ?? (isAuthenticated ? '/search' : '/');

  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-primary/70 hover:text-accent"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} />
        {t('termDetail.back')}
      </Link>

      {total === 0 && (
        <>
          <h1 className="mb-8 text-[44px] font-medium text-text max-md:text-[30px]">
            {term.name}
          </h1>
          <p className="py-8 text-center text-muted">
            {t('termDetail.noDefinitions')}
          </p>
        </>
      )}

      {current && (
        <article className="rounded-[15px] border border-border bg-surface p-8 shadow-feature max-md:p-6">
          <h1 className="mb-4 text-[30px] font-medium leading-tight text-text max-md:text-[24px]">
            {term.name}
          </h1>
          <p className="max-w-[760px] whitespace-pre-line text-[18px] leading-relaxed text-text-body max-md:text-[16px]">
            {current.text}
          </p>
          <DefinitionMetadata definition={current} variant="detail" showIcons />
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
