import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { getTerm } from '../api/terms';
import { SkeletonCard } from '../components/SkeletonCard';
import type { Term } from '../types';

export function TermDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getTerm(id)
      .then((data) => {
        if (!cancelled) setTerm(data);
      })
      .catch(() => {
        if (!cancelled) setError('error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const definitions = term?.definitions ?? [];
  const total = definitions.length;
  const current = definitions[index];

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <Link
        to="/search"
        className="inline-flex items-center gap-2 text-muted hover:text-accent text-[14px] mb-6"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} />
        {t('termDetail.back')}
      </Link>

      {loading && <SkeletonCard />}

      {!loading && error && (
        <p className="text-danger text-center py-12">{t('common.error')}</p>
      )}

      {!loading && term && (
        <>
          <h1 className="font-medium text-[44px] text-text mb-8 max-md:text-[30px]">
            {term.name}
          </h1>

          {total === 0 && (
            <p className="text-muted text-center py-8">
              {t('termDetail.noDefinitions')}
            </p>
          )}

          {current && (
            <article className="bg-surface border border-border rounded-[15px] p-10 shadow-card max-md:p-6">
              <p className="text-[20px] text-text leading-relaxed mb-6 max-md:text-[16px]">
                {current.text}
              </p>
              <div className="text-[14px] text-muted flex flex-wrap gap-x-4 gap-y-1">
                {current.topic?.book?.title && (
                  <span>{current.topic.book.title}</span>
                )}
                {current.topic?.title && <span>{current.topic.title}</span>}
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
                className="flex items-center gap-2 px-5 py-3 rounded-[10px] border border-border text-text-body disabled:opacity-40 hover:bg-surface transition-colors"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.7} />
                {t('common.previous')}
              </button>
              <span className="text-muted text-[16px]">
                {t('termDetail.counter', { current: index + 1, total })}
              </span>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
                className="flex items-center gap-2 px-5 py-3 rounded-[10px] border border-border text-text-body disabled:opacity-40 hover:bg-surface transition-colors"
              >
                {t('common.next')}
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.7} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
