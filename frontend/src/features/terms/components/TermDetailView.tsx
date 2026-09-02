import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, ArrowRight02Icon, Bookmark02Icon,
  BookOpen02Icon, Flag02Icon, NotebookText, SearchList01Icon, UserCheck01Icon,
  UserMultiple03Icon,
} from '@hugeicons/core-free-icons';
import type { Definition, Term } from '../../../types';
import type { RelatedTerm } from '../../../api/terms';
import { useAuthStore } from '../../../stores/authStore';
import { FavoriteToggle } from '../../favorites/components';
import { useFavoritesStore } from '../../favorites/model';
import { buildDefinitionMetadataItems, getDefinitionIndex } from '../model';
import { MobilePinnedAppBar } from '../../../ui/patterns';
import { DesktopTermFavoriteButton } from './DesktopTermFavoriteButton';

export type TermDetailLoadState = 'idle' | 'loading' | 'error';

export interface TermDetailViewProps {
  term: Term | null;
  loadState?: TermDetailLoadState;
  backTo: string;
  bottomNavVisible?: boolean;
  relatedTerms?: RelatedTerm[];
  selectedDefinitionPublicId?: string;
  onDefinitionChange?: (definitionPublicId: string) => void;
}

function getSourceRows(definition: Definition | undefined, t: TFunction) {
  const sourceIcons = { book: BookOpen02Icon, topic: Bookmark02Icon, page: SearchList01Icon };
  return buildDefinitionMetadataItems(definition, t, {
    formatPage: (page) => t('search.pageChip', { page }),
  }).map((item) => ({ ...item, icon: sourceIcons[item.key] }));
}

export function TermDetailHeader({ backTo, term }: { backTo: string; term?: Term | null }) {
  const { t } = useTranslation();
  return (
    <>
      <MobilePinnedAppBar
        title={t('termDetail.title')}
        leading={<Link to={backTo} aria-label={t('termDetail.back')} className="inline-flex size-11 items-center justify-center text-[#252329]"><HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} /></Link>}
        trailing={term ? <FavoriteToggle termRef={term.public_id} termName={term.name} ensureStatus={false} appearance="mobile-header" /> : null}
      />
    </>
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
        <div key={stat.label} className="flex min-w-px flex-1 items-start justify-between overflow-hidden rounded-[8px] bg-[#ded2f1] px-4 py-2 text-[#865bcf]">
          <div className="shrink-0 whitespace-nowrap -mr-[3px]"><p className="text-[16px] font-medium leading-4">{stat.value}</p><p className="mt-1 text-[12px] leading-3 text-[#a585db]">{stat.label}</p></div>
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
  const book = rows.find((row) => row.key === 'book');
  const topic = rows.find((row) => row.key === 'topic');
  const page = rows.find((row) => row.key === 'page');
  return (
    <section className="mt-12">
      <h2 className="text-[20px] font-medium leading-5 text-action-selected">{t('termDetail.source')}</h2>
      <div className="mt-4 flex items-center gap-6 rounded-[8px] bg-surface px-6 py-4 text-text-body">
        <HugeiconsIcon icon={BookOpen02Icon} size={24} strokeWidth={1.7} className="shrink-0 text-action-selected" />
        <div className="min-w-0">
          {page && <p className="truncate text-[12px] font-medium leading-3 text-[#865bcf]">{page.value}</p>}
          {book && <p className="mt-1 truncate text-[16px] leading-4">{book.value}</p>}
          {topic && <p className="mt-2 truncate text-[12px] leading-3 text-[#b1acb9]">{topic.value}</p>}
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
        {relatedTerms.map((term) => <Link key={term.public_id} to={`/terms/${term.public_id}`} state={{ backTo }} data-term-related-chip className="flex h-[30px] shrink-0 items-center rounded-[8px] bg-surface px-4 text-[14px] leading-[14px] text-[#39363f]">{term.name}</Link>)}
      </div>
    </section>
  );
}

function TermDetailTestCta({ bottomNavVisible }: { bottomNavVisible: boolean }) {
  const { t } = useTranslation();
  return (
    <button type="button" disabled aria-disabled="true" className={`max-md:fixed max-md:left-6 max-md:right-6 ${bottomNavVisible ? 'max-md:bottom-[128px]' : 'max-md:bottom-10'} max-md:z-30 flex min-h-[68px] items-center justify-between rounded-[8px] bg-[#6a37c3] px-6 py-4 text-left text-[#f6f5f7] md:hidden`}>
      <span className="min-w-0"><span className="block truncate text-[16px] font-medium leading-4">{t('termDetail.testCta')}</span><span className="mt-1 block truncate text-[12px] leading-3 text-[#c5b1e7]">{t('termDetail.testMeta')}</span></span>
      <HugeiconsIcon icon={ArrowRight02Icon} size={24} strokeWidth={1.8} className="shrink-0" />
    </button>
  );
}

function DesktopDefinitionCard({ term, definition, index, total, onPrevious, onNext }: { term: Term; definition: Definition; index: number; total: number; onPrevious: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  const rows = getSourceRows(definition, t);
  const book = rows.find((row) => row.key === 'book');
  const topic = rows.find((row) => row.key === 'topic');
  const page = rows.find((row) => row.key === 'page');
  const desktopBookMeta = definition.topic?.book
    ? t('termDetail.desktopBookMeta', { publisher: definition.topic.book.publisher, grade: definition.topic.book.grade })
    : book?.value;
  const desktopPageMeta = definition.page != null
    ? t('termDetail.desktopPageMeta', { page: definition.page })
    : page?.value;
  return (
    <section data-term-detail-definition-card className="flex min-h-[319px] flex-col justify-between rounded-[16px] bg-white p-6">
      <div className="flex flex-col gap-4">
        <div className="flex min-h-6 items-center justify-between gap-8">
          <h2 className="truncate text-[22px] font-medium leading-[22px] text-[#161519]">{term.name}</h2>
          <div data-term-detail-header-actions className="flex shrink-0 items-center gap-4 text-[#6e6779]">
            <span data-term-detail-flag className="flex size-10 items-center justify-center" aria-hidden="true"><HugeiconsIcon icon={Flag02Icon} size={24} strokeWidth={2} /></span>
            <DesktopTermFavoriteButton termRef={term.public_id} termName={term.name} />
          </div>
        </div>
        <p className="max-w-[514px] whitespace-pre-line text-[18px] leading-6 text-[#6e6779]">{definition.text}</p>
      </div>
      <div className="flex flex-col gap-6 border-t border-[#f6f5f7] pt-6">
        <div className="flex items-center justify-between gap-6">
          <div data-term-detail-source-row className="flex min-w-0 items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#f8f5fc] text-[#6a37c3]"><HugeiconsIcon icon={BookOpen02Icon} size={16} strokeWidth={1.5} /></span>
            <div className="min-w-0">
              {desktopBookMeta && <p className="truncate text-[16px] leading-4 text-[#161519]">{desktopBookMeta}</p>}
              <div className="mt-1 flex min-w-0 gap-1 text-[12px] leading-3">
                {desktopPageMeta && <p className="shrink-0 font-medium text-[#865bcf]">{desktopPageMeta}</p>}
                {desktopPageMeta && topic && <span className="text-[#8c8698]">•</span>}
                {topic && <p className="truncate text-[#8c8698]">{topic.value}</p>}
              </div>
            </div>
          </div>
          {total > 1 && <div data-term-detail-definition-nav className="flex shrink-0 items-center gap-4 text-[16px] leading-4 text-[#6e6779]">
            <button type="button" onClick={onPrevious} disabled={index === 0} aria-label={t('common.previous')} className="flex size-10 items-center justify-center rounded-[8px] bg-[#f6f5f7] disabled:text-[#b1acb9]"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.5} /></button>
            <span>{t('termDetail.counterOf', { current: index + 1, total })}</span>
            <button type="button" onClick={onNext} disabled={index === total - 1} aria-label={t('common.next')} className="flex size-10 items-center justify-center rounded-[8px] bg-[#39363f] text-white disabled:opacity-40"><HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.5} /></button>
          </div>}
        </div>
      </div>
    </section>
  );
}

function DesktopMasteryPanel() {
  const { t } = useTranslation();
  return (
    <section data-term-detail-mastery className="h-[120px] rounded-[16px] bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-[16px] font-medium leading-4 text-[#161519]">{t('termDetail.masteryTitle')}</h2><span className="text-[18px] font-medium leading-[18px] text-[#6a37c3]">87%</span></div>
      <div className="mt-4 h-2 overflow-hidden rounded-[8px] bg-[#eae9ec]"><div className="h-full w-[74.92%] rounded-[8px] bg-[#6a37c3]" /></div>
      <p data-term-detail-mastery-meta className="mt-4 text-[14px] leading-[14px] text-[#6e6779]">{t('termDetail.masteryMeta')}</p>
    </section>
  );
}

function DesktopTestCard() {
  const { t } = useTranslation();
  return (
    <section data-term-detail-test-card className="flex h-[187px] flex-col items-start justify-between rounded-[16px] bg-[#6a37c3] p-6 text-white">
      <div><h2 className="text-[20px] font-medium leading-5">{t('termDetail.testCta')}</h2><p className="mt-2 text-[16px] leading-4 text-[#c5b1e7]">{t('termDetail.testMeta')}</p></div>
      <Link to="/tests" className="flex h-8 items-center gap-2 rounded-[8px] bg-white px-6 text-[16px] font-medium leading-4 text-[#6a37c3]">{t('termDetail.startTest')}<HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} /></Link>
    </section>
  );
}

function DesktopRelatedPanel({ relatedTerms, backTo }: { relatedTerms: RelatedTerm[]; backTo: string }) {
  const { t } = useTranslation();
  if (relatedTerms.length === 0) return null;
  return (
    <section data-term-detail-related-panel className="rounded-[16px] bg-white p-6">
      <h2 className="text-[12px] font-medium leading-3 text-[#6e6779]">{t('termDetail.desktopRelatedTerms').toUpperCase()}</h2>
      <div className="mt-6 flex flex-col">
        {relatedTerms.map((item, itemIndex) => <div key={item.public_id}>{itemIndex > 0 && <div className="my-4 h-px bg-[#f6f5f7]" />}<Link to={`/terms/${item.public_id}`} state={{ backTo }} className="flex items-center justify-between gap-4"><span className="flex min-w-0 items-center gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#efeaf8] text-[#6a37c3]"><HugeiconsIcon icon={NotebookText} size={16} strokeWidth={1.5} /></span><span className="truncate text-[14px] font-medium leading-[14px] text-black">{item.name}</span></span><span data-term-detail-related-arrow className="flex size-[34px] shrink-0 items-center justify-center rounded-[8px] bg-white p-2"><HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} className="text-[#b1acb9]" /></span></Link></div>)}
      </div>
    </section>
  );
}

export function TermDetailView({ term, loadState = 'idle', backTo, bottomNavVisible = false, relatedTerms = [], selectedDefinitionPublicId, onDefinitionChange }: TermDetailViewProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const ensureStatuses = useFavoritesStore((state) => state.ensureStatuses);
  const definitions = term?.definitions ?? [];
  const [index, setIndex] = useState(() => getDefinitionIndex(definitions, selectedDefinitionPublicId));
  useEffect(() => { setIndex(getDefinitionIndex(term?.definitions ?? [], selectedDefinitionPublicId)); }, [term, selectedDefinitionPublicId]);
  const total = definitions.length;
  const current = definitions[index] ?? definitions[0];
  const isLoading = loadState === 'loading' && !term;
  const hasError = loadState === 'error' && !term;
  const selectDefinition = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(total - 1, nextIndex));
    if (boundedIndex === index) return;
    setIndex(boundedIndex);
    const nextDefinition = definitions[boundedIndex];
    if (nextDefinition?.public_id) onDefinitionChange?.(nextDefinition.public_id);
  };
  const goPrevious = () => selectDefinition(index - 1);
  const goNext = () => selectDefinition(index + 1);
  useEffect(() => {
    if (!isAuthenticated || !term) return;
    void ensureStatuses([term.public_id]).catch(() => undefined);
  }, [ensureStatuses, isAuthenticated, term]);

  return (
    <div className="min-h-full bg-canvas max-md:bg-canvas md:max-w-[1120px]">
      <div className="mx-auto max-w-[860px] bg-canvas px-6 pb-8 max-md:bg-canvas max-md:px-0 md:hidden">
        <TermDetailHeader backTo={backTo} term={term} />
        <div className="px-0 pb-[108px] pt-[42px] max-md:px-6 max-md:pb-[108px] max-md:pt-[42px]">
        {isLoading && <p className="py-20 text-center text-action-selected">{t('termDetail.loading')}</p>}
        {hasError && <p className="py-20 text-center text-action-selected">{t('termDetail.loadFailed')}</p>}
        {term && <>
          {total === 0 && <p className="py-12 text-center text-[16px] leading-4 text-[#524d5b]">{t('termDetail.noDefinitions')}</p>}
          {current && <>
            <section><h2 className="text-[20px] font-medium leading-5 text-action-selected">{t('termDetail.definition')}</h2><div className="mt-4 min-h-[124px] rounded-[8px] bg-surface p-6"><p className="text-[18px] font-medium leading-[18px] text-text-body">{term.name}</p><p className="mt-4 whitespace-pre-line text-[14px] leading-[14px] text-[#39363f]">{current.text}</p></div></section>
            <TermDetailStatPanel />
            {total > 1 && <div className="mt-4 flex items-center justify-between text-[14px] leading-[14px] text-[#524d5b]"><button type="button" onClick={goPrevious} disabled={index === 0} className="rounded-[8px] bg-surface-subtle px-3 py-2 disabled:opacity-40">{t('common.previous')}</button><span>{t('termDetail.counter', { current: index + 1, total })}</span><button type="button" onClick={goNext} disabled={index === total - 1} className="rounded-[8px] bg-surface-subtle px-3 py-2 disabled:opacity-40">{t('common.next')}</button></div>}
            <TermDetailSourcePanel definition={current} />
            <TermDetailRelatedPanel relatedTerms={relatedTerms} backTo={backTo} />
            <TermDetailTestCta bottomNavVisible={bottomNavVisible} />
          </>}
        </>}
      </div>
      </div>
      <div data-term-detail-desktop className="hidden min-h-screen px-[64px] py-8 md:ml-[2px] md:block">
        <header data-term-detail-desktop-header className="flex items-center justify-between">
          <h1 className="text-[24px] font-medium leading-6 text-[#161519]">{t('termDetail.title')}</h1>
          <Link to={backTo} className="flex h-12 items-center gap-2 rounded-[8px] bg-[#f6f5f7] px-8 text-[16px] font-medium leading-4 text-[#6e6779]"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.5} />{t('termDetail.back')}</Link>
        </header>
        <div data-term-detail-desktop-grid className="mt-8 grid grid-cols-[minmax(0,642px)_minmax(0,1fr)] items-start gap-4">
          <div className="flex flex-col gap-4">
            {isLoading && <p className="rounded-[16px] bg-white py-20 text-center text-action-selected">{t('termDetail.loading')}</p>}
            {hasError && <p className="rounded-[16px] bg-white py-20 text-center text-action-selected">{t('termDetail.loadFailed')}</p>}
            {term && total === 0 && <p className="rounded-[16px] bg-white py-12 text-center text-[16px] leading-4 text-[#524d5b]">{t('termDetail.noDefinitions')}</p>}
            {term && current && <><DesktopDefinitionCard term={term} definition={current} index={index} total={total} onPrevious={goPrevious} onNext={goNext} /><DesktopMasteryPanel /></>}
          </div>
          {term && current && <div className="flex flex-col gap-4"><DesktopTestCard /><DesktopRelatedPanel relatedTerms={relatedTerms} backTo={backTo} /></div>}
        </div>
      </div>
    </div>
  );
}
