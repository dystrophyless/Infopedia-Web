import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, ArrowRight02Icon, Bookmark02Icon,
  BookOpen02Icon, MoreHorizontalIcon, SearchList01Icon, UserCheck01Icon,
  UserMultiple03Icon,
} from '@hugeicons/core-free-icons';
import type { Definition, Term } from '../../../types';
import { buildDefinitionMetadataItems, getDefinitionIndex } from '../model';
import { DefinitionMetadata } from './DefinitionMetadata';

export type RelatedTerm = Pick<Term, 'public_id' | 'name'>;
export type TermDetailLoadState = 'idle' | 'loading' | 'error';

export interface TermDetailViewProps {
  term: Term | null;
  loadState?: TermDetailLoadState;
  backTo: string;
  relatedTerms?: RelatedTerm[];
  selectedDefinitionPublicId?: string;
}

function getSourceRows(definition: Definition | undefined, t: TFunction) {
  const sourceIcons = { book: BookOpen02Icon, topic: Bookmark02Icon, page: SearchList01Icon };
  return buildDefinitionMetadataItems(definition, t, {
    formatPage: (page) => t('search.pageChip', { page }),
  }).map((item) => ({ ...item, icon: sourceIcons[item.key] }));
}

export function TermDetailHeader({ backTo }: { backTo: string }) {
  const { t } = useTranslation();
  return (
    <header className="mx-2 flex h-[72px] items-center justify-between md:hidden">
      <Link to={backTo} aria-label={t('termDetail.back')} className="flex items-center gap-4 text-[#252329]">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
        <span className="text-[16px] font-medium leading-4">{t('termDetail.title')}</span>
      </Link>
      <div className="flex items-center gap-4 text-[#252329]">
        <button type="button" aria-label={t('termDetail.saveAria')} className="flex size-6 items-center justify-center"><HugeiconsIcon icon={Bookmark02Icon} size={24} strokeWidth={1.6} /></button>
        <button type="button" aria-label={t('termDetail.moreAria')} className="flex size-6 items-center justify-center"><HugeiconsIcon icon={MoreHorizontalIcon} size={24} strokeWidth={1.7} /></button>
      </div>
    </header>
  );
}

export function TermDetailStatPanel() {
  const { t } = useTranslation();
  const stats = [
    { value: t('termDetail.knownStatValue'), label: t('termDetail.knownStatLabel'), icon: UserCheck01Icon },
    { value: t('termDetail.testedStatValue'), label: t('termDetail.testedStatLabel'), icon: UserMultiple03Icon },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-h-12 items-start justify-between rounded-[8px] bg-action-selected px-4 py-2 text-text-inverse">
          <div className="min-w-0 pr-2"><p className="truncate text-[16px] font-medium leading-4">{stat.value}</p><p className="mt-1 truncate text-[12px] leading-3 text-text-inverse">{stat.label}</p></div>
          <HugeiconsIcon icon={stat.icon} size={16} strokeWidth={1.7} className="shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function TermDetailSourcePanel({ definition }: { definition: Definition }) {
  const { t } = useTranslation();
  const rows = getSourceRows(definition, t);
  if (rows.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-[20px] font-medium leading-5 text-action-selected">{t('termDetail.source')}</h2>
      <div className="mt-4 grid min-h-[90px] grid-cols-[117px_minmax(0,1fr)] overflow-hidden rounded-[16px] bg-surface-subtle text-text-body">
        <div className="flex flex-col justify-center gap-2 p-4 text-[14px] leading-[14px]">
          {rows.map((row) => <div key={row.key} className="flex min-w-0 items-center gap-2"><HugeiconsIcon icon={row.icon} size={14} strokeWidth={1.7} className="shrink-0" /><span className="truncate">{row.label}</span></div>)}
        </div>
        <div className="relative flex min-w-0 flex-col justify-center gap-2 py-4 pl-5 pr-4 text-[14px] leading-[14px]">
          <span className="absolute inset-y-0 left-0 w-1 bg-action-selected" aria-hidden="true" />
          {rows.map((row) => <p key={row.key} className="truncate">{row.value}</p>)}
        </div>
      </div>
    </section>
  );
}

export function TermDetailRelatedPanel({ relatedTerms, backTo }: { relatedTerms: RelatedTerm[]; backTo: string }) {
  const { t } = useTranslation();
  if (relatedTerms.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-[20px] font-medium leading-5 text-action-selected">{t('termDetail.relatedTerms')}</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {relatedTerms.map((term) => <Link key={term.public_id} to={`/terms/${term.public_id}`} state={{ backTo }} data-term-related-chip className="flex h-[30px] shrink-0 items-center rounded-[8px] bg-surface-subtle px-4 text-[14px] leading-[14px] text-text-body">{term.name}</Link>)}
      </div>
    </section>
  );
}

function TermDetailTestCta() {
  const { t } = useTranslation();
  return (
    <button type="button" aria-disabled="true" className="mt-[55px] flex min-h-[68px] w-full items-center justify-between rounded-[16px] bg-[#252329] px-6 py-4 text-left text-[#f6f5f7]">
      <span className="min-w-0"><span className="block truncate text-[16px] font-medium leading-4">{t('termDetail.testCta')}</span><span className="mt-1 block truncate text-[12px] leading-4 text-[#b1acb9]">{t('termDetail.testMeta')}</span></span>
      <HugeiconsIcon icon={ArrowRight02Icon} size={24} strokeWidth={1.8} className="shrink-0" />
    </button>
  );
}

export function TermDetailView({ term, loadState = 'idle', backTo, relatedTerms = [], selectedDefinitionPublicId }: TermDetailViewProps) {
  const { t } = useTranslation();
  const definitions = term?.definitions ?? [];
  const [index, setIndex] = useState(() => getDefinitionIndex(definitions, selectedDefinitionPublicId));
  useEffect(() => { setIndex(getDefinitionIndex(term?.definitions ?? [], selectedDefinitionPublicId)); }, [term, selectedDefinitionPublicId]);
  const total = definitions.length;
  const current = definitions[index] ?? definitions[0];
  const isLoading = loadState === 'loading' && !term;
  const hasError = loadState === 'error' && !term;
  const goPrevious = () => setIndex((value) => Math.max(0, value - 1));
  const goNext = () => setIndex((value) => Math.min(total - 1, value + 1));

  return (
    <div className="mx-auto max-w-[860px] px-6 py-14 max-md:max-w-none max-md:bg-canvas max-md:px-4 max-md:pb-8 max-md:pt-[calc(24px+env(safe-area-inset-top))]">
      <TermDetailHeader backTo={backTo} />
      <div className="hidden max-md:block max-md:px-2 max-md:pb-[calc(112px+env(safe-area-inset-bottom))]">
        {isLoading && <p className="py-20 text-center text-action-selected">{t('termDetail.loading')}</p>}
        {hasError && <p className="py-20 text-center text-action-selected">{t('termDetail.loadFailed')}</p>}
        {term && <>
          <h1 className="mt-4 text-[24px] font-medium leading-6 text-text-body">{term.name}</h1>
          {total === 0 && <p className="py-12 text-center text-[16px] leading-5 text-[#524d5b]">{t('termDetail.noDefinitions')}</p>}
          {current && <>
            <section className="mt-8"><h2 className="text-[20px] font-medium leading-5 text-action-selected">{t('termDetail.definition')}</h2><div className="mt-4 rounded-[8px] bg-surface-subtle p-4"><p className="whitespace-pre-line text-[16px] leading-4 text-text-body">{current.text}</p></div></section>
            <TermDetailStatPanel />
            {total > 1 && <div className="mt-4 flex items-center justify-between text-[14px] text-[#524d5b]"><button type="button" onClick={goPrevious} disabled={index === 0} className="rounded-[8px] bg-surface-subtle px-3 py-2 disabled:opacity-40">{t('common.previous')}</button><span>{t('termDetail.counter', { current: index + 1, total })}</span><button type="button" onClick={goNext} disabled={index === total - 1} className="rounded-[8px] bg-surface-subtle px-3 py-2 disabled:opacity-40">{t('common.next')}</button></div>}
            <TermDetailSourcePanel definition={current} />
            <TermDetailRelatedPanel relatedTerms={relatedTerms} backTo={backTo} />
            <TermDetailTestCta />
          </>}
        </>}
      </div>
      <div className="max-md:hidden">
        <Link to={backTo} className="mb-6 inline-flex items-center gap-2 text-[14px] font-medium text-primary/70 hover:text-accent"><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} />{t('termDetail.back')}</Link>
        {(isLoading || hasError) && <p className="py-12 text-center text-muted">{isLoading ? t('termDetail.loading') : t('termDetail.loadFailed')}</p>}
        {term && total === 0 && <><h1 className="mb-8 text-[44px] font-medium text-text">{term.name}</h1><p className="py-8 text-center text-muted">{t('termDetail.noDefinitions')}</p></>}
        {term && current && <article className="rounded-[15px] border border-border bg-surface p-8 shadow-feature"><h1 className="mb-4 text-[30px] font-medium leading-tight text-text">{term.name}</h1><p className="max-w-[760px] whitespace-pre-line text-[18px] leading-relaxed text-text-body">{current.text}</p><DefinitionMetadata definition={current} variant="detail" showIcons /></article>}
        {term && total > 1 && <div className="mt-8 flex items-center justify-between"><button type="button" onClick={goPrevious} disabled={index === 0} className="flex items-center gap-2 rounded-[10px] border border-border px-5 py-3 text-text-body transition-colors hover:bg-surface disabled:opacity-40"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.7} />{t('common.previous')}</button><span className="text-[16px] text-muted">{t('termDetail.counter', { current: index + 1, total })}</span><button type="button" onClick={goNext} disabled={index === total - 1} className="flex items-center gap-2 rounded-[10px] border border-border px-5 py-3 text-text-body transition-colors hover:bg-surface disabled:opacity-40">{t('common.next')}<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.7} /></button></div>}
      </div>
    </div>
  );
}
